'use client'

import { use, useEffect, useState } from 'react'
import { Brand, StatPill } from '@/components/ui'
import CloseParticipantWindow from '@/components/close-participant-window'
import { useGameView } from '@/lib/use-game-view'
import type { PlayerGameView } from '@/types/game'
import Lobby from './lobby'
import Quiz from './quiz'

type PlayerCredential = { id: string; token: string; nickname: string }
type PendingChoice = { questionId: string; choiceId: string }

export default function PlayerGame({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [player, setPlayer] = useState<PlayerCredential | null>(null)
  const [pendingChoice, setPendingChoice] = useState<PendingChoice | null>(null)
  const { view, setView, error, setError, now } = useGameView<PlayerGameView>(id, 'player', player?.token, player?.id)

  useEffect(() => {
    const saved = localStorage.getItem(`player:${id}`)
    if (saved) {
      try { setPlayer(JSON.parse(saved)) } catch { localStorage.removeItem(`player:${id}`) }
    }
  }, [id])

  const register = (credential: PlayerCredential) => {
    localStorage.setItem(`player:${id}`, JSON.stringify(credential))
    setPlayer(credential)
  }

  const answer = async (choiceId: string) => {
    if (!player || !view?.question || pendingChoice?.questionId === view.question.id) return
    setPendingChoice({ questionId: view.question.id, choiceId })
    try {
      const response = await fetch(`/api/games/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-player-id': player.id, 'x-player-token': player.token },
        body: JSON.stringify({ action: 'answer', choiceId }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setView((current) => current ? { ...current, selectedChoiceId: choiceId } : current)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit answer')
      setPendingChoice(null)
    }
  }

  const selectedChoiceId = view?.selectedChoiceId ?? (pendingChoice && pendingChoice.questionId === view?.question?.id ? pendingChoice.choiceId : null)

  return <main className="app-shell">
    <div className="surface">
      <header className="container-game flex flex-wrap items-center justify-between gap-3 py-5 sm:py-7">
        <Brand />
        <StatPill accent="cyan">Player view <span className="live-dot" /></StatPill>
      </header>
      {error && <div className="container-game"><p role="alert" className="notice mb-5">{error}</p></div>}
      {!view && !error && <div className="container-game glass mt-8 flex min-h-72 flex-col items-center justify-center gap-5 text-center animate-in">
        <div className="flex gap-2"><span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" /></div>
        <p className="text-muted">Finding your room...</p>
      </div>}
      {!player && view?.phase === 'lobby' && <Lobby gameId={id} onRegistered={register} />}
      {view?.phase === 'cancelled' && <div className="container-game flex min-h-[72vh] items-center justify-center pb-16">
        <section className="glass w-full max-w-xl px-7 py-12 text-center animate-in sm:px-12" role="status">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(255,133,137,.2)] text-3xl text-[#ffb4b9]" aria-hidden="true">×</div>
          <p className="eyebrow">Room closed</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Quiz cancelled</h1>
          <p className="text-muted mt-4">Please scan the new QR code displayed by your host to join another quiz.</p>
        </section>
      </div>}
      {!player && view?.phase !== 'lobby' && view?.phase !== 'cancelled' && view && <div className="container-game glass mt-8 p-9 text-center animate-in"><h1 className="text-2xl font-bold">This game has already started.</h1><p className="text-muted mt-3">Ask the host to include you in the next one.</p></div>}
      {player && view?.phase === 'lobby' && <div className="container-game flex min-h-[72vh] items-center justify-center pb-16">
        <section className="glass w-full max-w-xl px-7 py-12 text-center animate-in sm:px-12">
          <div className="waiting-orbit mx-auto mb-8" aria-hidden="true"><span /></div>
          <p className="eyebrow">You’re in</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Welcome, <span className="gradient-text">{player.nickname}.</span></h1>
          <p className="text-muted mt-4">The host will start the quiz in a moment. Keep this screen open.</p>
          <div className="glass-soft mt-8 p-4 text-sm text-[#d6def5]">{view.quizName} <span className="text-muted mx-2">·</span> Waiting room</div>
        </section>
      </div>}
      {player && view?.phase === 'quiz' && view.question && <Quiz view={{ ...view, serverNow: now }} selectedChoiceId={selectedChoiceId} onAnswer={answer} />}
      {player && view?.phase === 'result' && <div className="container-game flex min-h-[72vh] items-center justify-center pb-16">
        <section className="glass w-full max-w-xl px-7 py-12 text-center animate-in sm:px-12">
          <div className="winner-crown mx-auto" aria-hidden="true">✦</div>
          <p className="eyebrow mt-7">Game complete</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Session complete, <span className="gradient-text">{player.nickname}.</span></h1>
          <p className="text-muted mt-4">Your answers are in. The final standings are on the host screen.</p>
          <div className="glass-soft mt-8 p-4 text-sm text-[#d6def5]">Thanks for playing {view.quizName}.</div>
          <CloseParticipantWindow />
        </section>
      </div>}
    </div>
  </main>
}
