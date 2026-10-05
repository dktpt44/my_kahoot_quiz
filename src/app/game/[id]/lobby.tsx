import { FormEvent, useState } from 'react'
import { ArrowIcon, SparkIcon } from '@/components/ui'

export default function Lobby({ gameId, onRegistered }: {
  gameId: string
  onRegistered: (player: { id: string; token: string; nickname: string }) => void
}) {
  const [nickname, setNickname] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSending(true)
    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', nickname }),
      })
      const player = await response.json()
      if (!response.ok) throw new Error(player.error)
      onRegistered(player)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not join game')
      setSending(false)
    }
  }

  return <div className="container-game flex min-h-[75vh] items-center justify-center pb-16">
    <div className="w-full max-w-md animate-in">
      <div className="mb-7 text-center">
        <p className="eyebrow flex items-center justify-center gap-2"><SparkIcon className="h-4 w-4" /> Your game is waiting</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-[-.055em] sm:text-5xl">Join the <span className="gradient-text">session.</span></h1>
        <p className="text-muted mt-3">Choose a name to enter the room.</p>
      </div>
      <form onSubmit={submit} className="glass p-7 sm:p-9">
        <div className="glass-soft mb-7 flex items-center justify-between px-4 py-3 text-sm"><span className="text-muted">Room code</span><span className="font-mono font-bold tracking-widest text-[#cbbdff]">{gameId.slice(0, 8).toUpperCase()}</span></div>
        <label htmlFor="nickname" className="label">Your nickname</label>
        <input id="nickname" className="field text-lg" type="text" value={nickname}
          onChange={(event) => setNickname(event.target.value)} placeholder="What should we call you?" maxLength={20} required autoComplete="nickname" />
        <p className="text-muted mt-2 text-xs">Up to 20 characters. Make it yours.</p>
        {error && <p role="alert" className="notice mt-5 text-sm">{error}</p>}
        <button disabled={sending} className="btn-primary mt-7 w-full py-4">{sending ? 'Joining room...' : 'Join the game'} <ArrowIcon /></button>
      </form>
      <p className="text-muted mt-5 text-center text-xs">The host will start once everyone is here.</p>
    </div>
  </div>
}
