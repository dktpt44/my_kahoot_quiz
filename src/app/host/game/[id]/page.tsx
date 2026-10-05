'use client'

import Link from 'next/link'
import { use, useEffect, useState } from 'react'
import { Brand, StatPill } from '@/components/ui'
import type { HostGameView } from '@/types/game'
import Lobby from './lobby'
import Quiz from './quiz'
import Results from './results'

export default function HostGame({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [view, setView] = useState<HostGameView | null>(null)
  const [hostToken, setHostToken] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const savedToken = localStorage.getItem(`host:${id}`) ?? ''
    setHostToken(savedToken)
    if (!savedToken) {
      setError('Host access is only available in the browser that created this game.')
      return
    }
    let active = true
    const refresh = async () => {
      try {
        const response = await fetch(`/api/games/${id}`, { headers: { 'x-host-token': savedToken }, cache: 'no-store' })
        if (!response.ok) throw new Error(response.status === 404 ? 'Game not found. The server may have restarted.' : 'Could not load game')
        if (active) { setView(await response.json()); setError('') }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load game')
      }
    }
    refresh()
    const interval = setInterval(refresh, 750)
    return () => { active = false; clearInterval(interval) }
  }, [id])

  const act = async (action: string) => {
    try {
      const response = await fetch(`/api/games/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-host-token': hostToken },
        body: JSON.stringify({ action }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setView(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update game')
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
      {view?.phase === 'lobby' && <Lobby participants={view.participants} gameId={id} quizName={view.quiz.name} defaultJoinUrl={view.joinUrl} onStart={() => act('start')} />}
      {view?.phase === 'quiz' && <Quiz view={view} onAction={act} />}
      {view?.phase === 'result' && <Results view={view} />}
    </div>
  </main>
}
