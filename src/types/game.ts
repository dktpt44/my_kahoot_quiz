export type Choice = { id: string; body: string; is_correct: boolean }
export type Question = { id: string; order: number; body: string; choices: Choice[] }
export type QuizSet = { id: string; name: string; description: string; questions: Question[] }
export type QuizSummary = Pick<QuizSet, 'id' | 'name' | 'description'> & { questionCount: number }
export type Participant = { id: string; nickname: string }
export type Answer = { participantId: string; questionId: string; choiceId: string; score: number }
export type GameResult = Participant & { totalScore: number }
export type GamePhase = 'lobby' | 'quiz' | 'result' | 'cancelled' | 'expired'
export type PlayerQuestion = Omit<Question, 'choices'> & { choices: Omit<Choice, 'is_correct'>[] | Choice[] }
export type PlayerGameView = {
  revision: number
  serverNow: number
  phase: GamePhase
  quizName: string
  questionCount: number
  questionIndex: number
  questionStartedAt: number | null
  choiceRevealMs: number
  answerTimeMs: number
  isAnswerRevealed: boolean
  question: PlayerQuestion | null
  selectedChoiceId: string | null
}
export type HostGameView = {
  revision: number
  serverNow: number
  joinUrl: string | null
  phase: GamePhase
  quizName: string
  questionCount: number
  question: Question | null
  questionIndex: number
  questionStartedAt: number | null
  choiceRevealMs: number
  answerTimeMs: number
  isAnswerRevealed: boolean
  participants: Participant[]
  answers: Answer[]
  results: GameResult[]
}
