export type PollOption = { id: string; text: string }
export type PollPhase = 'open' | 'ended'

export type PlayerPollView = {
  id: string
  revision: number
  phase: PollPhase
  question: string
  type: 'multiple_choice'
  options: PollOption[]
  selectedOptionId: string | null
  submissionCount: number | null
  voteCounts: Record<string, number> | null
}

export type HostPollView = Omit<PlayerPollView, 'selectedOptionId' | 'submissionCount' | 'voteCounts'> & {
  joinUrl: string | null
  submissionCount: number
  voteCounts: Record<string, number>
}
