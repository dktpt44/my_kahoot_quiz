import 'server-only'
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import type { HostPollView, PlayerPollView, PollOption, PollPhase } from '@/types/poll'

type Audience = 'host' | 'all'
type StoredPoll = {
  id: string
  revision: number
  lastAccessedAt: number
  endedAt: number | null
  closedAt: number | null
  hostToken: string
  joinUrl: string | null
  question: string
  type: 'multiple_choice'
  options: PollOption[]
  phase: PollPhase
  votes: Map<string, string>
  subscribers: Set<(audience: Audience) => void>
}

const globalPolls = globalThis as typeof globalThis & {
  livePolls?: Map<string, StoredPoll>
  pollVisitorSecret?: Buffer
}
const polls = globalPolls.livePolls ??= new Map<string, StoredPoll>()
const visitorSecret = globalPolls.pollVisitorSecret ??= randomBytes(32)
const ACTIVE_IDLE_TTL_MS = 6 * 60 * 60 * 1000
const ENDED_TTL_MS = 60 * 60 * 1000
const CLOSED_TTL_MS = 10 * 60 * 1000
export const POLL_VISITOR_COOKIE = 'poll_visitor'

function expired(poll: StoredPoll, now: number) {
  if (poll.closedAt !== null) return now - poll.closedAt > CLOSED_TTL_MS
  if (poll.endedAt !== null) return now - poll.endedAt > ENDED_TTL_MS
  return poll.subscribers.size === 0 && now - poll.lastAccessedAt > ACTIVE_IDLE_TTL_MS
}

function signature(id: string) {
  return createHmac('sha256', visitorSecret).update(id).digest('hex').slice(0, 32)
}

export function createVisitorCookie() {
  const id = randomBytes(16).toString('hex')
  return `${id}.${signature(id)}`
}

export function visitorIdFromCookie(value: string | undefined): string | null {
  const match = /^([a-f0-9]{32})\.([a-f0-9]{32})$/.exec(value ?? '')
  if (!match) return null
  const expected = signature(match[1])
  return timingSafeEqual(Buffer.from(match[2]), Buffer.from(expected)) ? match[1] : null
}

export function createPoll(input: unknown, origin: string | null) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new Error('Poll details are required')
  const { question, type, options } = input as Record<string, unknown>
  if (typeof question !== 'string' || !question.trim() || question.trim().length > 500) {
    throw new Error('Poll question must be 1 to 500 characters')
  }
  if (type !== 'multiple_choice') throw new Error('Unsupported poll type')
  if (!Array.isArray(options) || options.length < 2 || options.length > 8 ||
      options.some((option) => typeof option !== 'string' || !option.trim() || option.trim().length > 200)) {
    throw new Error('Add 2 to 8 options, each 1 to 200 characters')
  }
  const now = Date.now()
  for (const [id, poll] of polls) if (expired(poll, now)) polls.delete(id)
  const firstCode = randomInt(1000, 10000)
  let id = ''
  for (let offset = 0; offset < 9000; offset += 1) {
    const code = String(1000 + ((firstCode - 1000 + offset) % 9000))
    if (!polls.has(code)) { id = code; break }
  }
  if (!id) throw new Error('No poll codes are available')
  const poll: StoredPoll = {
    id, revision: 1, lastAccessedAt: now, endedAt: null, closedAt: null,
    hostToken: randomBytes(32).toString('hex'),
    joinUrl: origin ? `${origin}/poll/${id}` : null,
    question: question.trim(), type: 'multiple_choice',
    options: options.map((option: string, index: number) => ({ id: String(index + 1), text: option.trim() })),
    phase: 'open', votes: new Map(), subscribers: new Set(),
  }
  polls.set(id, poll)
  return { id, hostToken: poll.hostToken }
}

export function getPoll(id: string) {
  const poll = polls.get(id)
  if (!poll) return undefined
  poll.subscribers ??= new Set()
  if (expired(poll, Date.now())) { polls.delete(id); return undefined }
  if (poll.phase === 'open') poll.lastAccessedAt = Date.now()
  return poll
}

export function isPollHost(poll: StoredPoll, token: string | null) {
  return !!token && token === poll.hostToken
}

function counts(poll: StoredPoll) {
  const result: Record<string, number> = Object.fromEntries(poll.options.map((option) => [option.id, 0]))
  for (const optionId of poll.votes.values()) result[optionId] += 1
  return result
}

export function hostPollView(poll: StoredPoll): HostPollView {
  return {
    id: poll.id, revision: poll.revision, phase: poll.phase,
    question: poll.question, type: poll.type, options: poll.options,
    joinUrl: poll.joinUrl, submissionCount: poll.votes.size, voteCounts: counts(poll),
  }
}

export function playerPollView(poll: StoredPoll, visitorId: string | null): PlayerPollView {
  return {
    id: poll.id, revision: poll.revision, phase: poll.phase,
    question: poll.question, type: poll.type, options: poll.options,
    selectedOptionId: visitorId ? poll.votes.get(visitorId) ?? null : null,
    submissionCount: poll.phase === 'ended' ? poll.votes.size : null,
    voteCounts: poll.phase === 'ended' ? counts(poll) : null,
  }
}

export function subscribePoll(poll: StoredPoll, listener: (audience: Audience) => void) {
  poll.subscribers.add(listener)
  return () => { poll.subscribers.delete(listener); poll.lastAccessedAt = Date.now() }
}

function publish(poll: StoredPoll, audience: Audience) {
  for (const subscriber of poll.subscribers) {
    try { subscriber(audience) } catch { poll.subscribers.delete(subscriber) }
  }
}

export function submitPollVote(poll: StoredPoll, visitorId: string, optionId: string) {
  if (poll.phase !== 'open') throw new Error('This poll has ended')
  if (poll.votes.has(visitorId)) throw new Error('You already submitted this poll')
  if (!poll.options.some((option) => option.id === optionId)) throw new Error('Choose a valid option')
  poll.votes.set(visitorId, optionId)
  poll.revision += 1
  publish(poll, 'host')
}

export function endPoll(poll: StoredPoll) {
  if (poll.phase !== 'open') throw new Error('This poll has already ended')
  poll.phase = 'ended'
  poll.endedAt = Date.now()
  poll.revision += 1
  publish(poll, 'all')
}

export function closePoll(poll: StoredPoll) {
  if (poll.phase !== 'ended') throw new Error('End the poll before closing it')
  poll.hostToken = ''
  poll.closedAt = Date.now()
}
