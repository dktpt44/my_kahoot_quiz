import 'server-only'
import { randomBytes, randomInt, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { QuizSettings } from '@/lib/quiz-settings'
import type { Answer, GamePhase, GameResult, HostGameView, Participant, PlayerGameView, QuizSet } from '@/types/game'

type Player = Participant & { token: string }
type GameAudience = 'host' | 'all'
type StoredGame = {
  id: string
  revision: number
  lastAccessedAt: number
  closedAt: number | null
  expiresAt: number
  joinUrl: string | null
  hostToken: string
  quiz: QuizSet
  choiceRevealMs: number
  answerTimeMs: number
  leaderboardVisibility: QuizSettings['leaderboardVisibility']
  showDistribution: boolean
  saveSession: boolean
  finalResults: GameResult[] | null
  completionPromise: Promise<void> | null
  phase: GamePhase
  questionIndex: number
  questionStartedAt: number | null
  isAnswerRevealed: boolean
  players: Player[]
  answers: Answer[]
  answersByQuestion: Map<string, Map<string, Answer>>
  subscribers: Set<(audience: GameAudience) => void>
  revealTimer: ReturnType<typeof setTimeout> | null
  expiryTimer: ReturnType<typeof setTimeout> | null
}

const globalGames = globalThis as typeof globalThis & { quizGames?: Map<string, StoredGame> }
const games = globalGames.quizGames ??= new Map<string, StoredGame>()
const token = () => randomBytes(32).toString('hex')
const GAME_MAX_AGE_MS = 60 * 60 * 1000
const CLOSED_TTL_MS = 10 * 60 * 1000

function isExpired(game: StoredGame, now: number) {
  return game.closedAt != null && now - game.closedAt > CLOSED_TTL_MS
}

function ensureRealtimeState(game: StoredGame) {
  game.subscribers ??= new Set()
  game.revealTimer ??= null
  game.expiryTimer ??= null
  game.closedAt ??= null
  game.expiresAt ??= game.lastAccessedAt + GAME_MAX_AGE_MS
  game.leaderboardVisibility ??= 'all'
  game.showDistribution ??= true
  // Rooms created before this setting was added always archived results.
  game.saveSession ??= true
  game.finalResults ??= null
  game.completionPromise ??= null
}

function clearExpiryTimer(game: StoredGame) {
  if (game.expiryTimer) clearTimeout(game.expiryTimer)
  game.expiryTimer = null
}

function expireGameIfDue(game: StoredGame, now = Date.now()) {
  if (game.closedAt !== null || now < game.expiresAt) return
  clearRevealTimer(game)
  clearExpiryTimer(game)
  game.phase = 'expired'
  game.closedAt = now
  game.revision += 1
  publishGame(game, 'all')
}

function scheduleExpiry(game: StoredGame) {
  if (game.expiryTimer || game.closedAt !== null) return
  game.expiryTimer = setTimeout(() => {
    game.expiryTimer = null
    expireGameIfDue(game)
  }, Math.max(0, game.expiresAt - Date.now()))
  game.expiryTimer.unref()
}

function shuffledQuiz(quiz: QuizSet): QuizSet {
  return {
    ...quiz,
    questions: quiz.questions.map((question) => {
      const choices = [...question.choices]
      for (let index = choices.length - 1; index > 0; index -= 1) {
        const randomIndex = randomInt(index + 1)
        const selected = choices[index]
        choices[index] = choices[randomIndex]
        choices[randomIndex] = selected
      }
      return { ...question, choices }
    }),
  }
}

export function createGame(quiz: QuizSet, origin: string | null, settings: QuizSettings) {
  const now = Date.now()
  for (const [id, game] of games) {
    ensureRealtimeState(game)
    expireGameIfDue(game, now)
    if (isExpired(game, now)) {
      clearRevealTimer(game)
      clearExpiryTimer(game)
      games.delete(id)
    }
  }
  const firstCode = randomInt(1000, 10000)
  let id = ''
  for (let offset = 0; offset < 9000; offset += 1) {
    const code = String(1000 + ((firstCode - 1000 + offset) % 9000))
    if (!games.has(code)) {
      id = code
      break
    }
  }
  if (!id) throw new Error('No game codes are available')

  const game: StoredGame = {
    id, revision: 1, lastAccessedAt: now, closedAt: null, expiresAt: now + GAME_MAX_AGE_MS,
    joinUrl: origin ? `${origin}/game/${id}` : null,
    hostToken: token(), quiz: shuffledQuiz(quiz), choiceRevealMs: settings.choiceRevealSeconds * 1000,
    answerTimeMs: settings.answerTimeSeconds * 1000, leaderboardVisibility: settings.leaderboardVisibility,
    showDistribution: settings.showDistribution, saveSession: settings.saveSession,
    finalResults: null, completionPromise: null, phase: 'lobby',
    questionIndex: 0, questionStartedAt: null, isAnswerRevealed: false,
    players: [], answers: [], answersByQuestion: new Map(),
    subscribers: new Set(), revealTimer: null, expiryTimer: null,
  }
  games.set(game.id, game)
  scheduleExpiry(game)
  return { id: game.id, hostToken: game.hostToken }
}

export function getGame(id: string) {
  const game = games.get(id)
  if (!game) return undefined
  ensureRealtimeState(game)
  const now = Date.now()
  expireGameIfDue(game, now)
  if (isExpired(game, now)) {
    clearRevealTimer(game)
    clearExpiryTimer(game)
    games.delete(id)
    return undefined
  }
  if (game.closedAt == null) game.lastAccessedAt = now
  updateTimedState(game)
  if (game.phase === 'quiz' && !game.isAnswerRevealed && !game.revealTimer) scheduleReveal(game)
  scheduleExpiry(game)
  return game
}

export function gameRevision(game: StoredGame) {
  return game.revision
}

export function subscribeGame(game: StoredGame, listener: (audience: GameAudience) => void) {
  ensureRealtimeState(game)
  game.subscribers.add(listener)
  return () => {
    game.subscribers.delete(listener)
    game.lastAccessedAt = Date.now()
  }
}

function publishGame(game: StoredGame, audience: GameAudience) {
  for (const subscriber of game.subscribers) {
    try { subscriber(audience) } catch { game.subscribers.delete(subscriber) }
  }
}

function clearRevealTimer(game: StoredGame) {
  if (game.revealTimer) clearTimeout(game.revealTimer)
  game.revealTimer = null
}

function scheduleReveal(game: StoredGame) {
  clearRevealTimer(game)
  const questionIndex = game.questionIndex
  const revealAt = (game.questionStartedAt ?? Date.now()) + game.choiceRevealMs + game.answerTimeMs
  game.revealTimer = setTimeout(() => {
    game.revealTimer = null
    if (game.phase === 'quiz' && game.questionIndex === questionIndex) updateTimedState(game)
  }, Math.max(0, revealAt - Date.now()))
  game.revealTimer.unref()
}

function updateTimedState(game: StoredGame) {
  if (game.phase === 'quiz' && !game.isAnswerRevealed && game.questionStartedAt !== null &&
      Date.now() >= game.questionStartedAt + game.choiceRevealMs + game.answerTimeMs) {
    game.isAnswerRevealed = true
    game.revision += 1
    clearRevealTimer(game)
    publishGame(game, 'all')
  }
}

export function isHost(game: StoredGame, hostToken: string | null) {
  return !!hostToken && hostToken === game.hostToken
}

export function closeGame(game: StoredGame) {
  expireGameIfDue(game)
  if (game.phase !== 'result') throw new Error('This session has not finished yet')
  clearRevealTimer(game)
  clearExpiryTimer(game)
  game.subscribers.clear()
  games.delete(game.id)
}

export function cancelGame(game: StoredGame) {
  expireGameIfDue(game)
  if (game.phase !== 'lobby') throw new Error('Only a waiting room can be cancelled')
  clearRevealTimer(game)
  clearExpiryTimer(game)
  game.phase = 'cancelled'
  game.closedAt = Date.now()
  game.revision += 1
  publishGame(game, 'all')
}

export function joinGame(game: StoredGame, nickname: string) {
  expireGameIfDue(game)
  if (game.phase !== 'lobby') throw new Error(game.phase === 'cancelled' ? 'This quiz was cancelled' : game.phase === 'expired' ? 'This quiz closed after one hour' : 'This game has already started')
  const name = nickname.trim()
  if (!name || name.length > 20) throw new Error('Nickname must be 1 to 20 characters')
  if (game.players.some((player) => player.nickname.toLowerCase() === name.toLowerCase())) {
    throw new Error('That nickname is already taken')
  }
  const player: Player = { id: randomUUID(), token: token(), nickname: name }
  game.players.push(player)
  game.revision += 1
  publishGame(game, 'host')
  return { id: player.id, token: player.token, nickname: player.nickname }
}

export function authenticatePlayer(game: StoredGame, id: string | null, playerToken: string | null) {
  return game.players.find((player) => player.id === id && player.token === playerToken)
}

function gameResults(game: StoredGame): GameResult[] {
  if (game.finalResults) return game.finalResults
  const totals = new Map(game.players.map((player) => [player.id, { points: 0, correct: 0 }]))
  const questions = new Map(game.quiz.questions.map((question) => [question.id, question]))
  for (const answer of game.answers) {
    const total = totals.get(answer.participantId)
    if (!total) continue
    total.points += answer.score
    const choice = questions.get(answer.questionId)?.choices.find((item) => item.id === answer.choiceId)
    if (choice?.is_correct) total.correct += 1
  }
  game.finalResults = game.players.map(({ id, nickname }) => ({
    id, nickname, totalScore: totals.get(id)?.points ?? 0, correctCount: totals.get(id)?.correct ?? 0,
  })).sort((a, b) => b.totalScore - a.totalScore || b.correctCount - a.correctCount || a.nickname.localeCompare(b.nickname))
  return game.finalResults
}

function safePathSegment(value: string): string {
  const segment = value.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '')
  return segment && segment !== '..' ? segment : 'Untitled'
}

function singleLine(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').trim()
}

async function archiveResults(game: StoredGame): Promise<void> {
  const category = safePathSegment(game.quiz.id.split('/')[0] || 'Uncategorized')
  const directory = path.join(process.cwd(), 'data', 'sessions', category, safePathSegment(game.quiz.name))
  const completedAt = new Date()
  const timestamp = completedAt.toISOString().replace(/:/g, '-')
  const questionCount = game.quiz.questions.length
  const rows = gameResults(game).map((result, index) =>
    `${index + 1}. ${singleLine(result.nickname)} | ${result.totalScore} points | ${result.correctCount}/${questionCount} correct`)
  const contents = [
    `Quiz: ${singleLine(game.quiz.name)}`,
    `Category: ${singleLine(category)}`,
    `Completed: ${completedAt.toISOString()}`,
    `Questions: ${questionCount}`,
    '',
    'Leaderboard (highest points first)',
    ...rows,
    ...(rows.length ? [] : ['No participants joined.']),
    '',
  ].join('\n')
  await mkdir(directory, { recursive: true })
  try {
    await writeFile(path.join(directory, `${timestamp}.txt`), contents, { flag: 'wx', mode: 0o600 })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    await writeFile(path.join(directory, `${timestamp}-${game.id}-${randomUUID().slice(0, 8)}.txt`), contents, { flag: 'wx', mode: 0o600 })
  }
}

export class SessionArchiveError extends Error {}

function currentGamePhase(game: StoredGame): GamePhase {
  return game.phase
}

export async function hostAction(game: StoredGame, action: string) {
  expireGameIfDue(game)
  updateTimedState(game)
  if (action === 'start' && game.phase === 'lobby') {
    game.phase = 'quiz'
    game.questionStartedAt = Date.now()
    game.revision += 1
    scheduleReveal(game)
    publishGame(game, 'all')
    return
  }
  if (action === 'reveal' && game.phase === 'quiz') {
    game.isAnswerRevealed = true
    game.revision += 1
    clearRevealTimer(game)
    publishGame(game, 'all')
    return
  }
  if (action === 'next' && game.phase === 'quiz' && game.isAnswerRevealed) {
    if (game.questionIndex + 1 === game.quiz.questions.length) {
      if (game.saveSession) {
        if (!game.completionPromise) {
          game.completionPromise = archiveResults(game).catch(() => {
            game.completionPromise = null
            throw new SessionArchiveError('Could not save the leaderboard. Check server storage and try again.')
          })
        }
        await game.completionPromise
      }
      const currentPhase = currentGamePhase(game)
      if (currentPhase === 'result') return
      if (currentPhase !== 'quiz') throw new Error('This room has closed')
      game.phase = 'result'
    } else {
      game.questionIndex += 1
      game.questionStartedAt = Date.now()
      game.isAnswerRevealed = false
    }
    game.revision += 1
    if (game.phase === 'quiz') scheduleReveal(game)
    else clearRevealTimer(game)
    publishGame(game, 'all')
    return
  }
  throw new Error('Action is unavailable in the current game phase')
}

export function submitAnswer(game: StoredGame, player: Player, choiceId: string) {
  expireGameIfDue(game)
  updateTimedState(game)
  if (game.phase !== 'quiz' || game.isAnswerRevealed || game.questionStartedAt === null) {
    throw new Error('This question is closed')
  }
  const elapsed = Date.now() - game.questionStartedAt - game.choiceRevealMs
  if (elapsed < 0 || elapsed >= game.answerTimeMs) throw new Error('Choices are not open')
  const question = game.quiz.questions[game.questionIndex]
  const choice = question.choices.find((item) => item.id === choiceId)
  if (!choice) throw new Error('Invalid choice')
  let questionAnswers = game.answersByQuestion.get(question.id)
  if (questionAnswers?.has(player.id)) {
    throw new Error('You already answered this question')
  }
  const score = choice.is_correct ? Math.max(0, 1000 - Math.round(elapsed / game.answerTimeMs * 1000)) : 0
  const answer = { participantId: player.id, questionId: question.id, choiceId, score }
  game.answers.push(answer)
  if (!questionAnswers) {
    questionAnswers = new Map()
    game.answersByQuestion.set(question.id, questionAnswers)
  }
  questionAnswers.set(player.id, answer)
  game.revision += 1
  if (questionAnswers.size === game.players.length) {
    game.isAnswerRevealed = true
    clearRevealTimer(game)
    publishGame(game, 'all')
  } else {
    publishGame(game, 'host')
  }
}

export function playerView(game: StoredGame, player?: Player): PlayerGameView {
  const question = game.phase === 'quiz' ? game.quiz.questions[game.questionIndex] : null
  const results = game.phase === 'result' && player ? gameResults(game) : null
  const playerResult = results?.find((result) => result.id === player?.id) ?? null
  return {
    revision: game.revision,
    serverNow: Date.now(),
    phase: game.phase, quizName: game.quiz.name, questionCount: game.quiz.questions.length,
    questionIndex: game.questionIndex, questionStartedAt: game.questionStartedAt,
    choiceRevealMs: game.choiceRevealMs, answerTimeMs: game.answerTimeMs,
    isAnswerRevealed: game.isAnswerRevealed,
    question: question ? {
      id: question.id, order: question.order, body: question.body,
      choices: question.choices.map((choice) => game.isAnswerRevealed
        ? choice : { id: choice.id, body: choice.body }),
    } : null,
    selectedChoiceId: player && question
      ? game.answersByQuestion.get(question.id)?.get(player.id)?.choiceId ?? null
      : null,
    result: playerResult ? {
      totalScore: playerResult.totalScore,
      correctCount: playerResult.correctCount,
    } : null,
  }
}

export function hostView(game: StoredGame): HostGameView {
  const currentQuestion = game.quiz.questions[game.questionIndex]
  let results: HostGameView['results'] = []
  let correctDistribution: number[] = []
  if (game.phase === 'result') {
    const allResults = gameResults(game)
    const limit = game.leaderboardVisibility === 'hide' ? 0
      : game.leaderboardVisibility === 'top1' ? 1
        : game.leaderboardVisibility === 'top3' ? 3
          : game.leaderboardVisibility === 'top10' ? 10 : allResults.length
    results = allResults.slice(0, limit)
    if (game.showDistribution) {
      correctDistribution = Array(game.quiz.questions.length + 1).fill(0) as number[]
      for (const result of allResults) correctDistribution[result.correctCount] += 1
    }
  }
  return {
    revision: game.revision,
    serverNow: Date.now(),
    joinUrl: game.joinUrl,
    phase: game.phase, quizName: game.quiz.name, questionCount: game.quiz.questions.length,
    question: game.phase === 'quiz' ? currentQuestion : null,
    questionIndex: game.questionIndex,
    questionStartedAt: game.questionStartedAt, isAnswerRevealed: game.isAnswerRevealed,
    choiceRevealMs: game.choiceRevealMs, answerTimeMs: game.answerTimeMs,
    participants: game.phase === 'result' && game.leaderboardVisibility === 'hide'
      ? [] : game.players.map(({ id, nickname }) => ({ id, nickname })),
    answers: game.phase === 'result' ? [] : [...(game.answersByQuestion.get(currentQuestion.id)?.values() ?? [])],
    results,
    leaderboardVisibility: game.leaderboardVisibility,
    showDistribution: game.showDistribution,
    correctDistribution,
  }
}
