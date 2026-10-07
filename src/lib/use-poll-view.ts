'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PollPhase } from '@/types/poll'

type LivePollView = { phase: PollPhase }

export function usePollView<T extends LivePollView>(id: string, role: 'host' | 'player', hostToken = '') {
  const [view, setView] = useState<T | null>(null)
  const [error, setError] = useState('')
  const viewRef = useRef<T | null>(null)

  const applyView = useCallback((next: T) => {
    viewRef.current = next
    setView(next)
  }, [])

  useEffect(() => {
    viewRef.current = null
    setView(null)
    if (role === 'host' && !hostToken) return

    let active = true
    let connecting = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | null = null
    let retryDelay = 1000
    const isEnded = () => viewRef.current?.phase === 'ended'

    const connect = async () => {
      if (!active || document.hidden || connecting || isEnded()) return
      connecting = true
      controller = new AbortController()
      const requestController = controller
      const headers: Record<string, string> = role === 'host' ? { 'x-host-token': hostToken } : {}
      try {
        const initial = await fetch(`/api/polls/${id}`, { headers, cache: 'no-store', signal: requestController.signal })
        if (!initial.ok) {
          const result = await initial.json().catch(() => ({}))
          throw new Error(result.error || 'Could not find this poll')
        }
        const firstView = await initial.json() as T
        if (!active) return
        applyView(firstView)
        setError('')
        retryDelay = 1000
        if (firstView.phase === 'ended') return

        const response = await fetch(`/api/polls/${id}/events`, {
          headers, cache: 'no-store', signal: requestController.signal,
        })
        if (!response.ok || !response.body) throw new Error('Could not connect to live poll updates')
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (active && !document.hidden) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          if (buffer.length > 1_000_000) throw new Error('Live update was too large')
          let end = buffer.indexOf('\n\n')
          while (end !== -1) {
            const frame = buffer.slice(0, end)
            buffer = buffer.slice(end + 2)
            const data = frame.split('\n').find((line) => line.startsWith('data: '))
            if (data) {
              const next = JSON.parse(data.slice(6)) as T
              if (active) { applyView(next); setError('') }
              if (next.phase === 'ended') return
            }
            end = buffer.indexOf('\n\n')
          }
        }
        if (active && !document.hidden && !isEnded()) throw new Error('Live connection closed')
      } catch (cause) {
        if (active && !document.hidden && !isEnded() &&
            !(cause instanceof Error && cause.name === 'AbortError')) {
          setError(cause instanceof Error ? cause.message : 'Could not connect to poll')
        }
      } finally {
        requestController.abort()
        controller = null
        connecting = false
        if (active && !document.hidden && !isEnded()) {
          retryTimer = setTimeout(connect, retryDelay)
          retryDelay = Math.min(8000, retryDelay * 2)
        }
      }
    }

    const onVisibilityChange = () => {
      clearTimeout(retryTimer)
      if (document.hidden) controller?.abort()
      else if (!connecting) void connect()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    void connect()
    return () => {
      active = false
      clearTimeout(retryTimer)
      controller?.abort()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [id, role, hostToken, applyView])

  return { view, applyView, error, setError }
}
