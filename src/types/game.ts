export type Choice = { id: string; body: string; is_correct: boolean }
export type Question = { id: string; order: number; body: string; choices: Choice[] }
export type QuizSet = { id: string; name: string; description: string; questions: Question[] }
export type QuizSummary = Pick<QuizSet, 'id' | 'name' | 'description'> & { questionCount: number }
export type Participant = { id: string; nickname: string }
export type Answer = { participantId: string; questionId: string; choiceId: string; score: number }
export type GameResult = Participant & { totalScore: number }
export type GamePhase = 'lobby' | 'quiz' | 'result'
export type PlayerQuestion = Omit<Question, 'choices'> & { choices: Omit<Choice, 'is_correct'>[] | Choice[] }
export type PlayerGameView = {
  serverNow: number
  phase: GamePhase
  quizName: string
  questionCount: number
  questionIndex: number
  questionStartedAt: number | null
  isAnswerRevealed: boolean
  question: PlayerQuestion | null
  selectedChoiceId: string | null
}
export type HostGameView = {
  serverNow: number
  joinUrl: string | null
  phase: GamePhase
  quiz: QuizSet
  questionIndex: number
  questionStartedAt: number | null
  isAnswerRevealed: boolean
  participants: Participant[]
  answers: Answer[]
  results: GameResult[]
}
