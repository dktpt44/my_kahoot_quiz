import { CountdownBar } from '@/components/countdown'
import { Delay, ProgressBar, StatPill } from '@/components/ui'
import type { PlayerGameView } from '@/types/game'

const symbols = ['◆', '●', '▲', '■']

export default function Quiz({ view, selectedChoiceId, onAnswer }: {
  view: PlayerGameView
  selectedChoiceId: string | null
  onAnswer: (choiceId: string) => void
}) {
  const question = view.question!
  const elapsed = view.serverNow - (view.questionStartedAt ?? view.serverNow)
  const choicesVisible = elapsed >= view.choiceRevealMs || view.isAnswerRevealed
  const secondsLeft = Math.max(0, Math.ceil((view.choiceRevealMs + view.answerTimeMs - elapsed) / 1000))
  const selected = question.choices.find((choice) => choice.id === selectedChoiceId)
  const selectedIsCorrect = Boolean(selected && 'is_correct' in selected && selected.is_correct)
  const questionPercent = (view.questionIndex + 1) / view.questionCount * 100

  return <div className="container-game max-w-3xl pb-16" key={question.id}>
    <div className="mb-6 animate-in">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><p className="eyebrow">{view.quizName}</p><h1 className="mt-2 text-xl font-bold">Question {view.questionIndex + 1} <span className="text-muted font-medium">/ {view.questionCount}</span></h1></div>
        <StatPill accent={view.isAnswerRevealed ? 'mint' : secondsLeft <= 5 ? 'amber' : 'cyan'}>{view.isAnswerRevealed ? 'Answer revealed' : `${secondsLeft}s remaining`}</StatPill>
      </div>
      <ProgressBar value={questionPercent} />
    </div>

    <section className="glass px-6 py-8 animate-in sm:px-9 sm:py-10" aria-labelledby="question-title">
      <span className="eyebrow">{view.isAnswerRevealed ? 'Review the answer' : 'Select one answer'}</span>
      <h2 id="question-title" className="mt-4 text-3xl font-bold leading-snug tracking-tight sm:text-[2.5rem]">{question.body}</h2>
      <div className="mt-7 flex items-center gap-3"><span className="text-muted whitespace-nowrap text-xs font-semibold">{view.isAnswerRevealed ? 'Answer revealed' : 'Time left'}</span><CountdownBar key={question.id} elapsedMs={elapsed} durationMs={view.choiceRevealMs + view.answerTimeMs} paused={view.isAnswerRevealed} /></div>
    </section>

    {!choicesVisible && !view.isAnswerRevealed && <div className="glass-soft mt-5 flex min-h-44 flex-col items-center justify-center text-center animate-in">
      <div className="flex gap-2 mb-4"><span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" /></div>
      <p className="font-semibold">Read the question</p><p className="text-muted mt-1 text-sm">Choices appear in a moment.</p>
    </div>}

    {choicesVisible && !view.isAnswerRevealed && !selectedChoiceId && <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {question.choices.map((choice, index) => <Delay key={choice.id} index={index}>
        <button className={`choice-card choice-${index}`} onClick={() => onAnswer(choice.id)}>
          <span className="choice-symbol" aria-hidden="true">{symbols[index]}</span>
          <span className="text-lg font-semibold sm:text-xl">{choice.body}</span>
        </button>
      </Delay>)}
    </div>}

    {!view.isAnswerRevealed && selectedChoiceId && <div className="glass mt-5 p-6 text-center animate-in sm:p-8">
      <div className="mx-auto mb-4 flex h-13 w-13 items-center justify-center rounded-2xl bg-[rgba(165,139,255,.18)] text-2xl text-[#cbbdff]">✓</div>
      <h3 className="text-xl font-bold">Answer locked in</h3>
      <p className="text-muted mt-2">You chose <strong className="text-white">{selected?.body}</strong>. Waiting for the reveal...</p>
    </div>}

    {view.isAnswerRevealed && <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2" role="group" aria-label="Revealed answer choices">
        {question.choices.map((choice, index) => {
          const isCorrect = 'is_correct' in choice && choice.is_correct
          const isSelectedWrong = choice.id === selectedChoiceId && !isCorrect
          return <Delay key={choice.id} index={index}>
            <div className={`choice-card choice-${index} ${isCorrect ? 'choice-correct' : isSelectedWrong ? 'choice-incorrect' : 'choice-dim'}`}>
              <span className="choice-symbol" aria-hidden="true">{symbols[index]}</span>
              <span className="min-w-0 flex-1 text-lg font-semibold sm:text-xl">{choice.body}</span>
              {(isCorrect || isSelectedWrong) && <span className="ml-auto text-xl font-extrabold" role="img" aria-label={isCorrect ? 'Correct answer' : 'Your incorrect answer'}>{isCorrect ? '✓' : '×'}</span>}
            </div>
          </Delay>
        })}
      </div>
      <div className={`answer-feedback mt-5 animate-in ${selectedIsCorrect ? 'answer-feedback-correct' : selectedChoiceId ? 'answer-feedback-incorrect' : 'answer-feedback-timeout'}`} role="status">
        <span className="answer-feedback-icon" aria-hidden="true">{selectedIsCorrect ? '✓' : selectedChoiceId ? '×' : '–'}</span>
        <div><strong className="block text-lg">{selectedIsCorrect ? 'Correct' : selectedChoiceId ? 'Incorrect' : 'Time is up'}</strong><p className="mt-1 text-sm font-medium opacity-80">The host will move to the next question shortly.</p></div>
      </div>
    </>}
  </div>
}
