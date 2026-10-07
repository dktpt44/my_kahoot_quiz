'use client'

import { use, useState } from 'react'
import type { CSSProperties } from 'react'
import { Brand, StatPill } from '@/components/ui'
import CloseParticipantWindow from '@/components/close-participant-window'
import { pollColors } from '@/lib/poll-colors'
import { usePollView } from '@/lib/use-poll-view'
import type { PlayerPollView } from '@/types/poll'

export default function PlayerPoll({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [choice, setChoice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { view, applyView, error, setError } = usePollView<PlayerPollView>(id, 'player')

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!choice || submitting || view?.selectedOptionId || view?.phase !== 'open') return
    setSubmitting(true)
    try {
      const response = await fetch(`/api/polls/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', optionId: choice }),
      })
      const result = await response.json()
      if (!response.ok) {
        if (response.status === 400) {
          const current = await fetch(`/api/polls/${id}`, { cache: 'no-store' })
          if (current.ok) {
            const latest = await current.json() as PlayerPollView
            applyView(latest)
            if (latest.selectedOptionId || latest.phase === 'ended') { setError(''); return }
          }
        }
        throw new Error(result.error || 'Could not submit poll')
      }
      applyView(result)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit poll')
    } finally { setSubmitting(false) }
  }

  return <main className="app-shell"><div className="surface">
    <header className="container-game flex flex-wrap items-center justify-between gap-4 py-5 sm:py-7"><Brand /><StatPill accent="cyan">Quick poll <span className="live-dot" /></StatPill></header>
    {error && <div className="container-game"><p className="notice mb-5" role="alert">{error}</p></div>}
    {!view && !error && <div className="container-game glass mt-8 flex min-h-72 items-center justify-center"><p className="text-muted">Opening the poll…</p></div>}
    {view?.phase === 'open' && !view.selectedOptionId && <div className="container-game max-w-3xl pb-16 animate-in"><form className="glass p-6 sm:p-10" onSubmit={submit}>
      <p className="eyebrow">Choose one response</p><h1 className="mt-4 text-3xl font-extrabold leading-snug tracking-tight sm:text-4xl">{view.question}</h1>
      <fieldset className="mt-8 space-y-3"><legend className="sr-only">Poll options</legend>{view.options.map((option, index) => <label key={option.id} className={`poll-choice ${choice === option.id ? 'poll-choice-selected' : ''}`} style={{ '--poll-rgb': pollColors[index] } as CSSProperties}>
        <input className="sr-only" type="radio" name="poll-choice" value={option.id} checked={choice === option.id} onChange={() => setChoice(option.id)} required />
        <span className="poll-choice-marker" aria-hidden="true">{index + 1}</span><span className="text-lg font-semibold">{option.text}</span>
        {choice === option.id && <span className="poll-choice-check" aria-hidden="true">✓</span>}
      </label>)}</fieldset>
      <div className="mt-8 flex justify-center"><button className="btn-primary btn-success min-w-48" type="submit" disabled={!choice || submitting}>{submitting ? 'Submitting…' : 'Submit response'}</button></div>
    </form></div>}
    {view?.phase === 'open' && view.selectedOptionId && <div className="container-game flex min-h-[70vh] items-center justify-center pb-16"><section className="glass w-full max-w-xl px-7 py-12 text-center animate-in sm:px-12" role="status">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(101,231,165,.2)] text-3xl text-[#a8f6df]">✓</div>
      <p className="eyebrow">Response received</p><h1 className="mt-3 text-3xl font-extrabold">Poll submitted</h1><p className="text-muted mt-4">Your response is saved. Results will appear here when the host ends the poll.</p>
    </section></div>}
    {view?.phase === 'ended' && <div className="container-game max-w-3xl pb-16 animate-in"><section className="glass p-6 sm:p-9">
      <p className="eyebrow">Poll complete</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight">{view.question}</h1><p className="text-muted mt-3">{view.endedAutomatically && 'Closed automatically after one hour · '}{view.submissionCount} {view.submissionCount === 1 ? 'response' : 'responses'} submitted</p>
      <div className="mt-8 space-y-5" aria-label="Poll results">{view.options.map((option, index) => {
        const count = view.voteCounts?.[option.id] ?? 0
        const percent = view.submissionCount ? Math.round(count / view.submissionCount * 100) : 0
        return <div className="poll-result-row" key={option.id} style={{ '--poll-rgb': pollColors[index] } as CSSProperties}>
          <div className="mb-2 flex items-baseline justify-between gap-3"><span className="min-w-0 font-semibold">{option.text}{view.selectedOptionId === option.id && <span className="poll-your-vote">Your vote</span>}</span><strong className="shrink-0 tabular-nums">{count} <span className="text-muted text-xs font-medium">({percent}%)</span></strong></div>
          <div className="poll-bar-track"><span className="poll-bar-fill" style={{ width: `${percent}%` }} /></div>
        </div>
      })}</div>
      <p className="text-muted mt-8 text-sm">Thanks for taking part.</p>
      <CloseParticipantWindow />
    </section></div>}
  </div></main>
}
