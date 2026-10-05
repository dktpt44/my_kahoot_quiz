'use client'

import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

const ringCircumference = 364.4

function useCountdownStyle(elapsedMs: number, durationMs: number, paused: boolean) {
  // Keep the animation's starting point fixed while the numeric clock updates.
  const [initialElapsed] = useState(() => Math.max(0, Math.min(durationMs, elapsedMs)))
  const remaining = Math.max(0, Math.min(1, 1 - elapsedMs / durationMs))
  return {
    '--timer-duration': `${durationMs}ms`,
    '--timer-delay': `-${initialElapsed}ms`,
    '--timer-scale': remaining,
    '--timer-ring-offset': ringCircumference * (1 - remaining),
    animationPlayState: paused ? 'paused' : 'running',
  } as CSSProperties
}

export function CountdownBar({ elapsedMs, durationMs, paused }: {
  elapsedMs: number
  durationMs: number
  paused: boolean
}) {
  const style = useCountdownStyle(elapsedMs, durationMs, paused)
  const remaining = Math.max(0, Math.min(100, (1 - elapsedMs / durationMs) * 100))
  return <div className="progress-track countdown-track" role="progressbar" aria-valuenow={Math.round(remaining)} aria-valuemin={0} aria-valuemax={100} aria-label="Time remaining">
    <span className="progress-fill countdown-fill" style={style} />
  </div>
}

export function CountdownRing({ elapsedMs, durationMs, paused, children }: {
  elapsedMs: number
  durationMs: number
  paused: boolean
  children: ReactNode
}) {
  const style = useCountdownStyle(elapsedMs, durationMs, paused)
  return <div className="timer-ring">
    <svg viewBox="0 0 136 136" aria-hidden="true">
      <circle className="timer-ring-track" cx="68" cy="68" r="58" />
      <circle className="timer-ring-fill" cx="68" cy="68" r="58" style={style} />
    </svg>
    <div className="timer-ring-inner">{children}</div>
  </div>
}
