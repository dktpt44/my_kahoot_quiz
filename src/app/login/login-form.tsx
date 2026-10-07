'use client'

import { useState } from 'react'
import { ArrowIcon } from '@/components/ui'

export default function LoginForm() {
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Could not sign in')
      }
      window.location.replace('/host/dashboard')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in')
      setPassword('')
      setPending(false)
    }
  }

  return <form onSubmit={submit} className="mt-8">
    <label htmlFor="admin-password" className="label">Password</label>
    <input id="admin-password" className="field w-full py-4" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" autoFocus required />
    {error && <p className="notice mt-4" role="alert">{error}</p>}
    <button className="btn-primary btn-success mt-6 w-full py-4" type="submit" disabled={pending}>{pending ? 'Signing in...' : 'Sign in'} <ArrowIcon /></button>
  </form>
}
