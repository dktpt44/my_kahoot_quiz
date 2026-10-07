'use client'

import Link from 'next/link'
import { use, useEffect, useState } from 'react'
import { Brand, StatPill } from '@/components/ui'
import { useGameView } from '@/lib/use-game-view'
import type { HostGameView } from '@/types/game'
import Lobby from './lobby'
import Quiz from './quiz'
import Results from './results'

export default function HostGame({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [hostToken, setHostToken] = useState('')
  const [closing, setClosing] = useState(false)
  const { view, applyView, error, setError, now } = useGameView<HostGameView>(id, 'host', hostToken)

  useEffect(() => {
    const savedToken = localStorage.getItem(`host:${id}`) ?? ''
    setHostToken(savedToken)
    if (!savedToken) {
      setError('Host access is only available in the browser that created this game.')
      return
    }
  }, [id, setError])

  const act = async (action: string) => {
    try {
      const response = await fetch(`/api/games/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-host-token': hostToken },
        body: JSON.stringify({ action }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      applyView(result)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update game')
    }
  }

  const returnHome = async () => {
    if (closing) return
    setClosing(true)
    try {
      const response = await fetch(`/api/games/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-host-token': hostToken },
        body: JSON.stringify({ action: 'close' }),
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Could not close the session')
      }
      localStorage.removeItem(`host:${id}`)
      window.location.assign('/host/dashboard')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not close the session')
      setClosing(false)
    }
  }

  return <main className="app-shell">
    <div className="surface">
      <header className="container-game flex flex-wrap items-center justify-between gap-4 py-5 sm:py-7">
        <Link href="/host/dashboard" aria-label="Back to quiz library"><Brand /></Link>
        <div className="flex items-center gap-3">
          <StatPill accent="mint"><span className="live-dot" /> Host room</StatPill>
          <span className="text-muted hidden text-xs font-semibold sm:inline">#{id.slice(0, 8).toUpperCase()}</span>
        </div>
      </header>
      {error && <div className="container-game"><p role="alert" className="notice mb-5">{error}</p></div>}
      {!view && !error && <div className="container-game glass mt-8 flex min-h-72 flex-col items-center justify-center gap-5 text-center animate-in">
        <div className="flex gap-2"><span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" /></div>
        <p className="text-muted">Preparing your room...</p>
      </div>}
      {view?.phase === 'lobby' && <Lobby participants={view.participants} gameId={id} quizName={view.quizName} defaultJoinUrl={view.joinUrl} onStart={() => act('start')} />}
      {view?.phase === 'quiz' && <Quiz view={{ ...view, serverNow: now }} onAction={act} />}
      {view?.phase === 'result' && <Results view={view} onReturnHome={returnHome} closing={closing} />}
    </div>
  </main>
}
