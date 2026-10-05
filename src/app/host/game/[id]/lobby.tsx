import type { Participant } from '@/types/game'
import { ArrowIcon, Delay, StatPill } from '@/components/ui'
import { useQRCode } from 'next-qrcode'
import { useRef, useState } from 'react'

function canScan(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol) &&
      !['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(parsed.hostname)
  } catch {
    return false
  }
}

export default function Lobby({ participants, gameId, quizName, defaultJoinUrl, onStart }: {
  participants: Participant[]; gameId: string; quizName: string; defaultJoinUrl: string | null; onStart: () => void
}) {
  const { Canvas } = useQRCode()
  const [joinUrl, setJoinUrl] = useState(defaultJoinUrl ?? '')
  const [copied, setCopied] = useState(false)
  const [copyHint, setCopyHint] = useState('')
  const linkInput = useRef<HTMLInputElement>(null)
  const qrUrl = canScan(joinUrl) ? joinUrl : ''

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setCopyHint('')
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
      linkInput.current?.focus()
      linkInput.current?.select()
      setCopyHint('Select the link and copy it manually.')
    }
  }

  return <div className="container-game pb-16">
    <div className="mb-8 animate-in">
      <p className="eyebrow">Ready when you are</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-[-.05em] sm:text-5xl">Your room is <span className="gradient-text">open.</span></h1>
      <p className="text-muted mt-3 max-w-xl leading-relaxed">Invite everyone to <strong className="text-white">{quizName}</strong>, then start when the room feels ready.</p>
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <Delay index={1}>
        <section className="glass h-full p-6 sm:p-8" aria-labelledby="players-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">The room</p>
              <h2 id="players-title" className="mt-2 text-2xl font-bold">Players joining</h2>
            </div>
            <StatPill accent="cyan">{participants.length} {participants.length === 1 ? 'player' : 'players'}</StatPill>
          </div>
          <div className="rule my-6" />
          <div className="glass-soft mb-6 flex items-center justify-between gap-4 px-5 py-4">
            <div><p className="eyebrow">Room code</p><p className="text-muted mt-1 text-sm">The final four digits of the join link.</p></div>
            <strong className="font-mono text-4xl font-extrabold tracking-[.08em] text-white sm:text-5xl">{gameId}</strong>
          </div>
          {participants.length === 0 ? <div className="glass-soft flex min-h-52 flex-col items-center justify-center px-4 text-center">
            <span className="waiting-orbit mb-5" aria-hidden="true"><span /></span>
            <p className="font-semibold">Waiting for the first player</p>
            <p className="text-muted mt-1 text-sm">Share the link or let them scan the code.</p>
          </div> : <div className="flex min-h-52 content-start flex-wrap gap-3" aria-live="polite">
            {participants.map((participant, index) => <span key={participant.id} className="player-chip animate-in" style={{ animationDelay: `${index * 65}ms` }}>
              <span className="player-avatar">{participant.nickname.slice(0, 1).toUpperCase()}</span>
              {participant.nickname}
            </span>)}
          </div>}
          <div className="rule my-6" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-muted text-sm">You can start with any number of players.</p>
            <button className="btn-primary min-w-44" onClick={onStart}>Start the game <ArrowIcon /></button>
          </div>
        </section>
      </Delay>

      <Delay index={2}>
        <section className="glass h-full p-6 sm:p-7" aria-labelledby="share-title">
          <p className="eyebrow">Invite your players</p>
          <h2 id="share-title" className="mt-2 text-2xl font-bold">Scan to join</h2>
          <div className="qr-frame mx-auto mt-6 flex aspect-square w-full max-w-[360px] items-center justify-center p-4">
            {qrUrl ? <Canvas text={qrUrl} options={{ errorCorrectionLevel: 'M', margin: 2, width: 320 }} />
              : <p className="max-w-56 text-center text-sm font-semibold text-slate-700">Enter a network address below to generate the QR code.</p>}
          </div>
          <label className="mt-6 block">
            <span className="label">Player link</span>
            <input ref={linkInput} className="field text-sm" value={joinUrl} onChange={(event) => setJoinUrl(event.target.value)} aria-label="Player join URL" />
          </label>
          <p className="text-muted mt-2 text-xs">This uses your computer’s network address. Phones must be on the same network.</p>
          <button className="btn-secondary mt-4 w-full" onClick={copyLink} disabled={!qrUrl}>{copied ? 'Copied!' : 'Copy join link'}</button>
          {copyHint && <p role="status" className="text-muted mt-2 text-xs">{copyHint}</p>}
        </section>
      </Delay>
    </div>
  </div>
}
