import { Delay, StatPill } from '@/components/ui'
import type { HostGameView } from '@/types/game'

export default function Results({ view, onReturnHome, closing }: { view: HostGameView; onReturnHome: () => void; closing: boolean }) {
  const winner = view.results[0]
  return <div className="container-game pb-20">
    <section className="glass relative overflow-hidden px-6 py-10 text-center sm:px-10 sm:py-14 animate-in">
      <div className="hero-aura" aria-hidden="true" />
      <div className="relative z-10">
        <StatPill accent="amber">✦ &nbsp; Game complete</StatPill>
        <h1 className="mt-5 text-4xl font-extrabold tracking-[-.055em] sm:text-6xl">Session <span className="gradient-text">complete.</span></h1>
        <p className="text-muted mt-4">{view.quizName} · {view.questionCount} questions played</p>
        {winner && <div className="winner-card glass-soft mx-auto mt-9 max-w-md px-6 py-7">
          <div className="winner-crown" aria-hidden="true">✦</div>
          <p className="eyebrow mt-3">Top scorer</p>
          <p className="mt-2 text-3xl font-extrabold">{winner.nickname}</p>
          <p className="mt-1 text-lg text-[#ffe0a6]">{winner.totalScore} points</p>
        </div>}
        <button className="btn-primary btn-success mt-8 min-w-48" type="button" onClick={onReturnHome} disabled={closing}>
          {closing ? 'Closing session...' : 'Return to home'}
        </button>
      </div>
    </section>
    <section className="mt-10" aria-labelledby="leaderboard-title">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow">The final standings</p><h2 id="leaderboard-title" className="mt-2 text-2xl font-bold">Leaderboard</h2></div>
        <StatPill accent="cyan">{view.results.length} participants</StatPill>
      </div>
      {view.results.length ? <ol className="space-y-3">
        {view.results.map((result, index) => <Delay key={result.id} index={index}>
          <li className={`glass-soft leaderboard-row flex items-center gap-4 p-4 sm:p-5 ${index === 0 ? 'leaderboard-first' : ''}`}>
            <span className="rank-badge">{String(index + 1).padStart(2, '0')}</span>
            <span className="min-w-0 flex-1 truncate text-base font-bold sm:text-lg">{result.nickname}</span>
            <span className="font-extrabold tabular-nums text-[#cbbdff]">{result.totalScore} <span className="text-muted text-xs font-medium">pts</span></span>
          </li>
        </Delay>)}
      </ol> : <div className="glass p-8 text-center text-muted">No participants joined this game.</div>}
    </section>
  </div>
}
