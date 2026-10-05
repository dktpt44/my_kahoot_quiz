'use client'

import { useEffect, useState } from 'react'
import { ArrowIcon, Delay, SparkIcon, StatPill } from '@/components/ui'
import type { QuizSummary } from '@/types/game'

function TopicArt({ topic }: { topic: string }) {
  return <div className={`topic-art topic-${topic}`} aria-hidden="true">
    <div className="topic-orbit topic-orbit-one" />
    <div className="topic-orbit topic-orbit-two" />
    <span className="topic-core">{topic.slice(0, 2).toUpperCase()}</span>
    <span className="topic-satellite topic-satellite-one" />
    <span className="topic-satellite topic-satellite-two" />
  </div>
}

export default function Dashboard() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/quizzes').then(async (response) => {
      if (!response.ok) throw new Error('Could not load quizzes')
      setQuizzes(await response.json())
    }).catch((cause) => setError(cause.message)).finally(() => setLoading(false))
  }, [])

  const startGame = async (quizId: string) => {
    setStarting(quizId)
    setError('')
    try {
      const response = await fetch('/api/games', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId }),
      })
      const game = await response.json()
      if (!response.ok) throw new Error(game.error)
      localStorage.setItem(`host:${game.id}`, game.hostToken)
      window.location.assign(`/host/game/${game.id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start game')
      setStarting(null)
    }
  }

  const questionCount = quizzes.reduce((total, quiz) => total + quiz.questionCount, 0)

  return <>
    <section className="glass relative overflow-hidden px-6 py-10 sm:px-12 sm:py-14 animate-in">
      <div className="hero-aura" aria-hidden="true" />
      <div className="relative z-10 max-w-2xl">
        <div className="eyebrow flex items-center gap-2"><SparkIcon className="h-4 w-4" /> Interactive assessment</div>
        <h1 className="mt-5 text-4xl leading-[1.08] font-extrabold tracking-[-.055em] sm:text-6xl">
          Live quizzes for <span className="gradient-text">active learning.</span>
        </h1>
        <p className="text-muted mt-5 max-w-xl text-base leading-relaxed sm:text-lg">
          Run focused, interactive assessments with clear questions, real-time participation, and immediate feedback.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <StatPill accent="violet"><span className="live-dot" /> Ready to host</StatPill>
          <StatPill accent="cyan">{quizzes.length} {quizzes.length === 1 ? 'quiz' : 'quizzes'} in your library</StatPill>
        </div>
      </div>
    </section>

    <section className="mt-12 sm:mt-16" aria-labelledby="library-title">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Select a quiz</p>
          <h2 id="library-title" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Quiz library</h2>
        </div>
        {!loading && <span className="text-muted text-sm">{questionCount} questions ready to play</span>}
      </div>
      {error && <p role="alert" className="notice mb-6">{error}</p>}
      {loading && <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="Loading quizzes">
        {[0, 1, 2].map((index) => <div key={index} className="glass h-80 animate-pulse" />)}
      </div>}
      {!loading && !error && quizzes.length === 0 && <div className="glass p-10 text-center text-muted">No quizzes are configured yet.</div>}
      {!loading && <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {quizzes.map((quiz, index) => {
          const topic = quiz.id.split('/')[0]
          return <Delay key={quiz.id} index={index}>
            <article className="glass glass-hover h-full overflow-hidden">
              <TopicArt topic={topic} />
              <div className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <StatPill accent="violet">{topic.toUpperCase()}</StatPill>
                  <span className="text-muted text-xs font-semibold">{quiz.questionCount} questions</span>
                </div>
                <h3 className="mt-5 text-xl font-bold tracking-tight">{quiz.name}</h3>
                <p className="text-muted mt-2 min-h-12 text-sm leading-relaxed">{quiz.description || 'A new challenge for your players.'}</p>
                <button className="btn-primary mt-6 w-full" disabled={starting !== null} onClick={() => startGame(quiz.id)}>
                  {starting === quiz.id ? 'Creating game...' : 'Host this quiz'} <ArrowIcon />
                </button>
              </div>
            </article>
          </Delay>
        })}
      </div>}
    </section>
  </>
}
