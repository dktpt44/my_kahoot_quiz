import type { CSSProperties, ReactNode } from 'react'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-lockup">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none" role="presentation">
          <path d="M16 3.5 28.5 16 16 28.5 3.5 16 16 3.5Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="m11 16 3.4 3.4L21 12.8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {!compact && <span className="brand-name">quiz<span>game</span></span>}
    </span>
  )
}

export function ArrowIcon({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4.5 12h14m-5.5-5.5L18.5 12 13 17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

export function SparkIcon({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2ZM19 17l.5 1.5L21 19l-1.5.5L19 21l-.5-1.5L17 19l1.5-.5L19 17Z" fill="currentColor" />
  </svg>
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const progress = Math.max(0, Math.min(100, value))
  return <div className={`progress-track ${className}`} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
    <span className="progress-fill" style={{ width: `${progress}%` }} />
  </div>
}

export function StatPill({ children, accent = 'violet' }: { children: ReactNode; accent?: 'violet' | 'cyan' | 'mint' | 'amber' }) {
  return <span className={`stat-pill stat-pill-${accent}`}>{children}</span>
}

export function Delay({ index, children, className = '' }: { index: number; children: ReactNode; className?: string }) {
  return <div className={`animate-in ${className}`} style={{ '--delay': `${Math.min(index, 8) * 80}ms` } as CSSProperties}>{children}</div>
}
