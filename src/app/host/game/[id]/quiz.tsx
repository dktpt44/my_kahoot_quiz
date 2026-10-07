import { CountdownRing } from '@/components/countdown'
import { ArrowIcon, Delay, ProgressBar, StatPill } from '@/components/ui'
import type { HostGameView } from '@/types/game'

const symbols = ['◆', '●', '▲', '■']

export default function Quiz({ view, onAction }: { view: HostGameView; onAction: (action: string) => void }) {
  const question = view.question!
  const elapsed = view.serverNow - (view.questionStartedAt ?? view.serverNow)
  const choicesVisible = elapsed >= view.choiceRevealMs || view.isAnswerRevealed
  const secondsLeft = Math.max(0, Math.ceil((view.choiceRevealMs + view.answerTimeMs - elapsed) / 1000))
  const answerPercent = view.participants.length ? view.answers.length / view.participants.length * 100 : 0
  const questionPercent = (view.questionIndex + 1) / view.questionCount * 100
  const choiceCounts = new Map<string, number>()
  for (const answer of view.answers) choiceCounts.set(answer.choiceId, (choiceCounts.get(answer.choiceId) ?? 0) + 1)
  const highestCount = Math.max(1, ...choiceCounts.values())

  return <div className="container-game pb-16">
    <div className="mb-7 animate-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="eyebrow">Live question</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{view.quizName}</h1></div>
        <StatPill accent={view.isAnswerRevealed ? 'mint' : 'violet'}>{view.isAnswerRevealed ? 'Answer revealed' : `Question ${view.questionIndex + 1} of ${view.questionCount}`}</StatPill>
      </div>
      <ProgressBar className="mt-5" value={questionPercent} />
    </div>

    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-5">
        <Delay index={1}>
          <section className="glass p-6 sm:p-9" aria-labelledby="question-title">
            <span className="eyebrow">Question {String(view.questionIndex + 1).padStart(2, '0')}</span>
            <h2 id="question-title" className="mt-4 text-3xl font-bold leading-snug tracking-tight sm:text-[2.5rem]">{question.body}</h2>
          </section>
        </Delay>
        <div className="grid gap-3 sm:grid-cols-2" key={question.id}>
          {choicesVisible ? question.choices.map((choice, index) => {
            const count = choiceCounts.get(choice.id) ?? 0
            return <Delay key={choice.id} index={index + 2}>
              <div className={`choice-card choice-${index} ${view.isAnswerRevealed && choice.is_correct ? 'choice-correct' : ''} ${view.isAnswerRevealed && !choice.is_correct ? 'choice-dim' : ''}`}>
                <span className="choice-symbol" aria-hidden="true">{symbols[index]}</span>
                <span className="min-w-0 flex-1 text-lg font-semibold sm:text-xl">{choice.body}</span>
                {view.isAnswerRevealed && <span className="ml-auto text-sm font-bold">{choice.is_correct ? '✓' : ''} {count}</span>}
              </div>
            </Delay>
          }) : <div className="glass-soft col-span-full flex min-h-48 flex-col items-center justify-center text-center animate-in">
            <div className="flex gap-2 mb-5"><span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" /></div>
            <p className="font-semibold">Choices are on their way</p>
            <p className="text-muted mt-1 text-sm">Give everyone a moment to read the question.</p>
          </div>}
        </div>
        {view.isAnswerRevealed && <section className="glass-soft distribution-card p-6 animate-in sm:p-8" aria-labelledby="distribution-title">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
            <div><p className="eyebrow">How everyone answered</p><h3 id="distribution-title" className="mt-2 text-xl font-bold">Answer distribution</h3></div>
            <span className="text-muted text-sm">{view.answers.length} {view.answers.length === 1 ? 'response' : 'responses'}</span>
          </div>
          <div className="distribution-chart" style={{ gridTemplateColumns: `repeat(${question.choices.length}, minmax(0, 1fr))` }}>
            {question.choices.map((choice, index) => {
              const count = choiceCounts.get(choice.id) ?? 0
              return <div key={choice.id} className={`distribution-column choice-${index} ${choice.is_correct ? 'distribution-column-correct' : ''}`}>
                <span className="sr-only">{choice.body}: {count} {count === 1 ? 'vote' : 'votes'}{choice.is_correct ? ', correct answer' : ''}</span>
                <div className="distribution-plot" aria-hidden="true">
                  <div className="distribution-bar-group" style={{ height: `${count / highestCount * 126}px` }}>
                    <strong className="distribution-value">{count}{choice.is_correct && <span className="distribution-check">✓</span>}</strong>
                    <span className="distribution-bar" />
                  </div>
                </div>
                <span className="distribution-symbol" aria-hidden="true">{symbols[index]}</span>
              </div>
            })}
          </div>
        </section>}
      </div>

      <Delay index={2}>
        <aside className="glass p-6 sm:p-7" aria-label="Question status">
          <p className="eyebrow">Round pulse</p>
          <div className="mt-7 flex justify-center">
            <CountdownRing key={question.id} elapsedMs={elapsed} durationMs={view.choiceRevealMs + view.answerTimeMs} paused={view.isAnswerRevealed}>
              <div className="text-center"><div className="text-4xl font-extrabold tabular-nums">{view.isAnswerRevealed ? '✓' : secondsLeft}</div><div className="text-muted text-xs font-bold uppercase tracking-widest">{view.isAnswerRevealed ? 'done' : 'seconds'}</div></div>
            </CountdownRing>
          </div>
          <div className="rule my-7" />
          <div className="flex items-end justify-between"><span className="text-muted text-sm">Answers in</span><strong className="text-2xl tabular-nums">{view.answers.length}<span className="text-muted text-base">/{view.participants.length}</span></strong></div>
          <ProgressBar className="mt-3" value={answerPercent} />
          <p className="text-muted mt-3 text-xs">{view.isAnswerRevealed ? 'Ready for the next question.' : 'Updates live as players respond.'}</p>
          <div className="rule my-7" />
          {view.isAnswerRevealed ? <button className="btn-primary btn-success w-full" onClick={() => onAction('next')}>{view.questionIndex + 1 === view.questionCount ? 'See results' : 'Next question'} <ArrowIcon /></button>
            : <button className="btn-secondary w-full" onClick={() => onAction('reveal')}>Reveal answer now</button>}
        </aside>
      </Delay>
    </div>
  </div>
}
