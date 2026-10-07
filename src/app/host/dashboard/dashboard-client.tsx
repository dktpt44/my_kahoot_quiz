'use client'

import { useState } from 'react'
import { ArrowIcon, Delay, StatPill } from '@/components/ui'
import type { QuizSummary } from '@/types/game'

function TopicArt({ topic }: { topic: string }) {
  return <div className={`topic-art topic-${topic}`} aria-hidden="true">
    <div className="topic-orbit topic-orbit-one" />
    <div className="topic-orbit topic-orbit-two" />
    <span className="topic-core">
      {topic === 'networks' ? <svg viewBox="0 0 64 64" fill="none"><path d="M32 14v15M18 46l14-17 14 17"/><circle cx="32" cy="12" r="7"/><circle cx="16" cy="49" r="7"/><circle cx="48" cy="49" r="7"/></svg>
        : topic === 'os' ? <svg viewBox="0 0 64 64" fill="none"><rect x="9" y="12" width="46" height="40" rx="6"/><path d="M9 22h46M24 22v30"/><circle cx="16" cy="17" r="1" fill="currentColor" stroke="none"/></svg>
          : topic === 'aml' ? <svg viewBox="0 0 64 64" fill="none"><path d="M13 48V34h9v14M28 48V25h9v23M43 48V16h9v32M10 51h45M15 22l13-8 10 5 11-9"/></svg>
            : topic === 'cvpr' ? <svg viewBox="0 0 64 64" fill="none"><path d="M13 23V13h10M41 13h10v10M51 41v10H41M23 51H13V41"/><circle cx="32" cy="32" r="10"/><circle cx="32" cy="32" r="3" fill="currentColor" stroke="none"/></svg>
              : <span>{topic.slice(0, 2).toUpperCase()}</span>}
    </span>
    <span className="topic-satellite topic-satellite-one" />
    <span className="topic-satellite topic-satellite-two" />
  </div>
}

export default function DashboardClient({ quizzes, categoryCount }: { quizzes: QuizSummary[]; categoryCount: number }) {
  const [starting, setStarting] = useState<string | null>(null)
  const [error, setError] = useState('')

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
    <section className="dashboard-overview animate-in" aria-label="Dashboard overview">
      <div className="dashboard-greeting">
        <p className="eyebrow">Admin dashboard</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-[-.05em] sm:text-5xl">Welcome, <span className="gradient-text">admin.</span></h1>
        <p className="text-muted mt-4 max-w-lg leading-relaxed">Choose a quiz below to open a room and invite your players.</p>
      </div>
      <div className="dashboard-stats">
        <div className="dashboard-stat dashboard-stat-categories">
          <span className="dashboard-stat-label">Categories</span>
          <strong className="dashboard-stat-number">{categoryCount}</strong>
          <span className="text-muted text-sm">Folders in data</span>
        </div>
        <div className="dashboard-stat dashboard-stat-quizzes">
          <span className="dashboard-stat-label">Quizzes</span>
          <strong className="dashboard-stat-number">{quizzes.length}</strong>
          <span className="text-muted text-sm">Ready to host</span>
        </div>
      </div>
    </section>

    <section className="mt-10 sm:mt-12" aria-labelledby="library-title">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Select a quiz</p>
          <h2 id="library-title" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Quiz library</h2>
        </div>
        <span className="text-muted text-sm">{questionCount} questions ready to play</span>
      </div>
      {error && <p role="alert" className="notice mb-6">{error}</p>}
      {quizzes.length === 0 && <div className="glass p-10 text-center text-muted">No quizzes are configured yet.</div>}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {quizzes.map((quiz, index) => {
          const topic = quiz.id.split('/')[0]
          return <Delay key={quiz.id} index={index}>
            <article className={`glass glass-hover topic-card topic-card-${topic} h-full overflow-hidden`}>
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
      </div>
    </section>
  </>
}
