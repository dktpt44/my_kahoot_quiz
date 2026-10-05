import 'server-only'
import { randomBytes, randomInt, randomUUID } from 'node:crypto'
import { QUESTION_ANSWER_TIME, TIME_TIL_CHOICE_REVEAL } from '@/constants'
import type { Answer, GamePhase, HostGameView, Participant, PlayerGameView, QuizSet } from '@/types/game'

type Player = Participant & { token: string }
type StoredGame = {
  id: string
  joinUrl: string | null
  hostToken: string
  quiz: QuizSet
  phase: GamePhase
  questionIndex: number
  questionStartedAt: number | null
  isAnswerRevealed: boolean
  players: Player[]
  answers: Answer[]
}

const globalGames = globalThis as typeof globalThis & { quizGames?: Map<string, StoredGame> }
const games = globalGames.quizGames ??= new Map<string, StoredGame>()
const token = () => randomBytes(32).toString('hex')

export function createGame(quiz: QuizSet, origin: string | null) {
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
    id, joinUrl: origin ? `${origin}/game/${id}` : null,
    hostToken: token(), quiz, phase: 'lobby',
    questionIndex: 0, questionStartedAt: null, isAnswerRevealed: false,
    players: [], answers: [],
  }
  games.set(game.id, game)
  return { id: game.id, hostToken: game.hostToken }
}

export function getGame(id: string) {
  const game = games.get(id)
  if (game) updateTimedState(game)
  return game
}

function updateTimedState(game: StoredGame) {
  if (game.phase === 'quiz' && !game.isAnswerRevealed && game.questionStartedAt !== null &&
      Date.now() >= game.questionStartedAt + TIME_TIL_CHOICE_REVEAL + QUESTION_ANSWER_TIME) {
    game.isAnswerRevealed = true
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
    return
  }
  if (action === 'reveal' && game.phase === 'quiz') {
    game.isAnswerRevealed = true
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
  if (game.answers.some((answer) => answer.participantId === player.id && answer.questionId === question.id)) {
    throw new Error('You already answered this question')
  }
  const score = choice.is_correct ? Math.max(0, 1000 - Math.round(elapsed / QUESTION_ANSWER_TIME * 1000)) : 0
  game.answers.push({ participantId: player.id, questionId: question.id, choiceId, score })
  if (game.players.length > 0 && game.players.every((item) =>
    game.answers.some((answer) => answer.participantId === item.id && answer.questionId === question.id))) {
    game.isAnswerRevealed = true
  }
}

export function playerView(game: StoredGame, player?: Player): PlayerGameView {
  updateTimedState(game)
  const question = game.phase === 'quiz' ? game.quiz.questions[game.questionIndex] : null
  return {
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
      ? game.answers.find((answer) => answer.participantId === player.id && answer.questionId === question.id)?.choiceId ?? null
      : null,
  }
}

export function hostView(game: StoredGame): HostGameView {
  updateTimedState(game)
  return {
    serverNow: Date.now(),
    joinUrl: game.joinUrl,
    phase: game.phase, quiz: game.quiz, questionIndex: game.questionIndex,
    questionStartedAt: game.questionStartedAt, isAnswerRevealed: game.isAnswerRevealed,
    participants: game.players.map(({ id, nickname }) => ({ id, nickname })),
    answers: game.answers.filter((answer) => answer.questionId === game.quiz.questions[game.questionIndex].id),
    results: game.players.map(({ id, nickname }) => ({
      id, nickname,
      totalScore: game.answers.filter((answer) => answer.participantId === id)
        .reduce((sum, answer) => sum + answer.score, 0),
    })).sort((a, b) => b.totalScore - a.totalScore),
  }
}
