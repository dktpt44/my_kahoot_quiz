import 'server-only'
import { randomBytes, randomInt, randomUUID } from 'node:crypto'
import { QUESTION_ANSWER_TIME, TIME_TIL_CHOICE_REVEAL } from '@/constants'
import type { Answer, GamePhase, HostGameView, Participant, PlayerGameView, QuizSet } from '@/types/game'

type Player = Participant & { token: string }
type GameAudience = 'host' | 'all'
type StoredGame = {
  id: string
  revision: number
  lastAccessedAt: number
  joinUrl: string | null
  hostToken: string
  quiz: QuizSet
  phase: GamePhase
  questionIndex: number
  questionStartedAt: number | null
  isAnswerRevealed: boolean
  players: Player[]
  answers: Answer[]
  answersByQuestion: Map<string, Map<string, Answer>>
  subscribers: Set<(audience: GameAudience) => void>
  revealTimer: ReturnType<typeof setTimeout> | null
}

const globalGames = globalThis as typeof globalThis & { quizGames?: Map<string, StoredGame> }
const games = globalGames.quizGames ??= new Map<string, StoredGame>()
const token = () => randomBytes(32).toString('hex')
const GAME_IDLE_TTL_MS = 6 * 60 * 60 * 1000

function ensureRealtimeState(game: StoredGame) {
  game.subscribers ??= new Set()
  game.revealTimer ??= null
}

export function createGame(quiz: QuizSet, origin: string | null) {
  const now = Date.now()
  for (const [id, game] of games) {
    ensureRealtimeState(game)
    if (game.subscribers.size === 0 && now - game.lastAccessedAt > GAME_IDLE_TTL_MS) {
      clearRevealTimer(game)
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
    id, revision: 1, lastAccessedAt: now, joinUrl: origin ? `${origin}/game/${id}` : null,
    hostToken: token(), quiz, phase: 'lobby',
    questionIndex: 0, questionStartedAt: null, isAnswerRevealed: false,
    players: [], answers: [], answersByQuestion: new Map(),
    subscribers: new Set(), revealTimer: null,
  }
  games.set(game.id, game)
  return { id: game.id, hostToken: game.hostToken }
}

export function getGame(id: string) {
  const game = games.get(id)
  if (!game) return undefined
  ensureRealtimeState(game)
  const now = Date.now()
  if (game.subscribers.size === 0 && now - game.lastAccessedAt > GAME_IDLE_TTL_MS) {
    clearRevealTimer(game)
    games.delete(id)
    return undefined
  }
  game.lastAccessedAt = now
  updateTimedState(game)
  if (game.phase === 'quiz' && !game.isAnswerRevealed && !game.revealTimer) scheduleReveal(game)
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
  const revealAt = (game.questionStartedAt ?? Date.now()) + TIME_TIL_CHOICE_REVEAL + QUESTION_ANSWER_TIME
  game.revealTimer = setTimeout(() => {
    game.revealTimer = null
    if (game.phase === 'quiz' && game.questionIndex === questionIndex) updateTimedState(game)
  }, Math.max(0, revealAt - Date.now()))
  game.revealTimer.unref()
}

function updateTimedState(game: StoredGame) {
  if (game.phase === 'quiz' && !game.isAnswerRevealed && game.questionStartedAt !== null &&
      Date.now() >= game.questionStartedAt + TIME_TIL_CHOICE_REVEAL + QUESTION_ANSWER_TIME) {
    game.isAnswerRevealed = true
    game.revision += 1
    clearRevealTimer(game)
    publishGame(game, 'all')
  }
}

export function isHost(game: StoredGame, hostToken: string | null) {
  return !!hostToken && hostToken === game.hostToken
}

export function joinGame(game: StoredGame, nickname: string) {
  if (game.phase !== 'lobby') throw new Error('This game has already started')
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

export function hostAction(game: StoredGame, action: string) {
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
  updateTimedState(game)
  if (game.phase !== 'quiz' || game.isAnswerRevealed || game.questionStartedAt === null) {
    throw new Error('This question is closed')
  }
  const elapsed = Date.now() - game.questionStartedAt - TIME_TIL_CHOICE_REVEAL
  if (elapsed < 0 || elapsed >= QUESTION_ANSWER_TIME) throw new Error('Choices are not open')
  const question = game.quiz.questions[game.questionIndex]
  const choice = question.choices.find((item) => item.id === choiceId)
  if (!choice) throw new Error('Invalid choice')
  let questionAnswers = game.answersByQuestion.get(question.id)
  if (questionAnswers?.has(player.id)) {
    throw new Error('You already answered this question')
  }
  const score = choice.is_correct ? Math.max(0, 1000 - Math.round(elapsed / QUESTION_ANSWER_TIME * 1000)) : 0
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
  return {
    revision: game.revision,
    serverNow: Date.now(),
    phase: game.phase, quizName: game.quiz.name, questionCount: game.quiz.questions.length,
    questionIndex: game.questionIndex, questionStartedAt: game.questionStartedAt,
    isAnswerRevealed: game.isAnswerRevealed,
    question: question ? {
      id: question.id, order: question.order, body: question.body,
      choices: question.choices.map((choice) => game.isAnswerRevealed
        ? choice : { id: choice.id, body: choice.body }),
    } : null,
    selectedChoiceId: player && question
      ? game.answersByQuestion.get(question.id)?.get(player.id)?.choiceId ?? null
      : null,
  }
}

export function hostView(game: StoredGame): HostGameView {
  const currentQuestion = game.quiz.questions[game.questionIndex]
  let results: HostGameView['results'] = []
  if (game.phase === 'result') {
    const scores = new Map(game.players.map((player) => [player.id, 0]))
    for (const answer of game.answers) {
      scores.set(answer.participantId, (scores.get(answer.participantId) ?? 0) + answer.score)
    }
    results = game.players.map(({ id, nickname }) => ({
      id, nickname, totalScore: scores.get(id) ?? 0,
    })).sort((a, b) => b.totalScore - a.totalScore)
  }
  return {
    revision: game.revision,
    serverNow: Date.now(),
    joinUrl: game.joinUrl,
    phase: game.phase, quizName: game.quiz.name, questionCount: game.quiz.questions.length,
    question: game.phase === 'quiz' ? currentQuestion : null,
    questionIndex: game.questionIndex,
    questionStartedAt: game.questionStartedAt, isAnswerRevealed: game.isAnswerRevealed,
    participants: game.players.map(({ id, nickname }) => ({ id, nickname })),
    answers: [...(game.answersByQuestion.get(currentQuestion.id)?.values() ?? [])],
    results,
  }
}
