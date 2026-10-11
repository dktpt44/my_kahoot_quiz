import { Delay, StatPill } from '@/components/ui'
import type { HostGameView } from '@/types/game'

const plotHeight = 170

function CorrectAnswersHistogram({ distribution }: { distribution: number[] }) {
  const highestFrequency = distribution.reduce((highest, frequency) => Math.max(highest, frequency), 1)
  const tickStep = highestFrequency <= 5 ? 1 : Math.ceil(highestFrequency / 4)
  const axisMax = Math.ceil(highestFrequency / tickStep) * tickStep
  const ticks = Array.from({ length: axisMax / tickStep + 1 }, (_, index) => index * tickStep)
  const columns = `repeat(${distribution.length}, minmax(0, 1fr))`
  const chartDescription = distribution.map((frequency, correct) =>
    `${correct} correct: ${frequency} ${frequency === 1 ? 'person' : 'people'}`).join('; ')

  return <section className="glass mt-10 p-6 sm:p-8 animate-in" aria-labelledby="correct-distribution-title">
    <p className="eyebrow">Class results</p>
    <h2 id="correct-distribution-title" className="mt-2 text-2xl font-bold">Correct answers distribution</h2>
    <p className="text-muted mt-2 text-sm">How many people answered each number of questions correctly.</p>
    <p className="text-muted mt-7 text-xs font-semibold uppercase tracking-wider">Number of people</p>
    <div className="histogram-chart mt-3" role="group" aria-label={chartDescription}>
      <div className="histogram-y-axis" aria-hidden="true">
        {ticks.map((tick) => <span key={tick} style={{ bottom: `${tick / axisMax * plotHeight}px` }}>{tick}</span>)}
      </div>
      <div className="histogram-scroll">
        <div style={{ minWidth: `${Math.max(280, distribution.length * 50)}px` }}>
          <div className="histogram-plot">
            {ticks.map((tick) => <span key={tick} className="histogram-gridline" aria-hidden="true" style={{ bottom: `${tick / axisMax * plotHeight}px` }} />)}
            <div className="histogram-columns" style={{ gridTemplateColumns: columns }}>
              {distribution.map((frequency, correct) => {
                const height = frequency / axisMax * plotHeight
                const countInside = height >= 32
                return <div className="histogram-column" key={correct} tabIndex={0} role="img" aria-label={`${correct} correct: ${frequency} ${frequency === 1 ? 'person' : 'people'}`}>
                  {frequency > 0 && <span className="histogram-bar" aria-hidden="true" style={{ height: `${height}px` }} />}
                  <strong className={`histogram-frequency ${countInside ? 'is-inside' : ''}`} aria-hidden="true" style={{ bottom: `${countInside ? height - 27 : height + 7}px` }}>{frequency}</strong>
                  <span className="histogram-tooltip" aria-hidden="true" style={{ bottom: `${countInside ? height + 8 : height + 27}px` }}>{frequency} {frequency === 1 ? 'person' : 'people'}</span>
                </div>
              })}
            </div>
          </div>
          <div className="histogram-x-ticks" aria-hidden="true" style={{ gridTemplateColumns: columns }}>
            {distribution.map((_, correct) => <span key={correct}>{correct}</span>)}
          </div>
        </div>
      </div>
    </div>
    <p className="text-muted mt-3 text-center text-xs font-semibold uppercase tracking-wider">Questions answered correctly</p>
  </section>
}

export default function Results({ view, onReturnHome, closing }: { view: HostGameView; onReturnHome: () => void; closing: boolean }) {
  const hidden = view.leaderboardVisibility === 'hide'
  const winner = view.results[0]
  const showLeaderboard = !hidden && view.leaderboardVisibility !== 'top1'
  const leaderboardLabel = view.leaderboardVisibility === 'top3' ? 'Top 3'
    : view.leaderboardVisibility === 'top10' ? 'Top 10' : 'Leaderboard'

  return <div className="container-game pb-20">
    <section className="glass relative overflow-hidden px-6 py-10 text-center sm:px-10 sm:py-14 animate-in">
      <div className="hero-aura" aria-hidden="true" />
      <div className="relative z-10">
        {!hidden && <StatPill accent="amber">✦ &nbsp; Game complete</StatPill>}
        <h1 className="mt-5 text-4xl font-extrabold tracking-[-.055em] sm:text-6xl">
          {hidden ? <>Thank you for <span className="gradient-text">playing.</span></> : <>Session <span className="gradient-text">complete.</span></>}
        </h1>
        {!hidden && <>
          <p className="text-muted mt-4">{view.quizName} · {view.questionCount} questions played</p>
          {winner && <div className="winner-card glass-soft mx-auto mt-9 max-w-md px-6 py-7">
            <div className="winner-crown" aria-hidden="true">✦</div>
            <p className="eyebrow mt-3">Top scorer</p>
            <p className="mt-2 text-3xl font-extrabold">{winner.nickname}</p>
            <p className="mt-1 text-lg text-[#ffe0a6]">{winner.totalScore} points <span className="text-muted">· {winner.correctCount}/{view.questionCount} correct</span></p>
          </div>}
          {!winner && <p className="text-muted mt-8">No participants joined this game.</p>}
        </>}
        <button className="btn-primary btn-success mt-8 min-w-48" type="button" onClick={onReturnHome} disabled={closing}>
          {closing ? 'Closing session...' : 'Return to home'}
        </button>
      </div>
    </section>
    {showLeaderboard && <section className="mt-10" aria-labelledby="leaderboard-title">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow">The final standings</p><h2 id="leaderboard-title" className="mt-2 text-2xl font-bold">{leaderboardLabel}</h2></div>
        <StatPill accent="cyan">{view.leaderboardVisibility === 'all' ? `${view.participants.length} participants` : `Showing ${view.results.length} of ${view.participants.length}`}</StatPill>
      </div>
      {view.results.length ? <ol className="space-y-3">
        {view.results.map((result, index) => <Delay key={result.id} index={index}>
          <li className={`glass-soft leaderboard-row flex items-center gap-4 p-4 sm:p-5 ${index === 0 ? 'leaderboard-first' : ''}`}>
            <span className="rank-badge">{String(index + 1).padStart(2, '0')}</span>
            <span className="min-w-0 flex-1 truncate text-base font-bold sm:text-lg">{result.nickname}</span>
            <span className="flex shrink-0 flex-wrap items-baseline justify-end gap-x-4 gap-y-1 text-right">
              <span className="text-sm font-semibold text-[#a5ecf6]">{result.correctCount}/{view.questionCount} correct</span>
              <strong className="font-extrabold tabular-nums text-[#cbbdff]">{result.totalScore} <span className="text-muted text-xs font-medium">pts</span></strong>
            </span>
          </li>
        </Delay>)}
      </ol> : <div className="glass p-8 text-center text-muted">No participants joined this game.</div>}
    </section>}
    {view.showDistribution && view.correctDistribution.some((frequency) => frequency > 0) && <CorrectAnswersHistogram distribution={view.correctDistribution} />}
  </div>
}
