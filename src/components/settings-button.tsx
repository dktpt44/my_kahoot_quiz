'use client'

import { useEffect, useRef, useState } from 'react'

type Settings = { choiceRevealSeconds: string; answerTimeSeconds: string }

export default function SettingsButton() {
  const dialog = useRef<HTMLDialogElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [closing, setClosing] = useState(false)
  const [settings, setSettings] = useState<Settings>({ choiceRevealSeconds: '5', answerTimeSeconds: '20' })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  const close = () => {
    if (!dialog.current?.open || closeTimer.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      dialog.current.close()
      return
    }
    setClosing(true)
    closeTimer.current = setTimeout(() => {
      dialog.current?.close()
      closeTimer.current = null
    }, 220)
  }

  const open = async () => {
    dialog.current?.showModal()
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/admin/settings', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not load settings')
      setSettings({ choiceRevealSeconds: String(result.choiceRevealSeconds), answerTimeSeconds: String(result.answerTimeSeconds) })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load settings')
    } finally {
      setLoading(false)
    }
  }

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving || loading) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          choiceRevealSeconds: Number(settings.choiceRevealSeconds),
          answerTimeSeconds: Number(settings.answerTimeSeconds),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save settings')
      setSettings({ choiceRevealSeconds: String(result.choiceRevealSeconds), answerTimeSeconds: String(result.answerTimeSeconds) })
      close()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  return <>
    <button className="btn-settings px-4 py-2.5 text-sm" type="button" onClick={open}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 2l-1.8 1.8a1.8 1.8 0 0 0-2-.36l-.66.28a1.8 1.8 0 0 0-1.1 1.66V21h-2.5v-.62a1.8 1.8 0 0 0-1.1-1.66l-.66-.28a1.8 1.8 0 0 0-2 .36l-1.8-1.8a1.8 1.8 0 0 0 .36-2l-.28-.66A1.8 1.8 0 0 0 4.56 13H4v-2h.56a1.8 1.8 0 0 0 1.66-1.1l.28-.66a1.8 1.8 0 0 0-.36-2l1.8-1.8a1.8 1.8 0 0 0 2 .36l.66-.28a1.8 1.8 0 0 0 1.1-1.66V3h2.5v.86a1.8 1.8 0 0 0 1.1 1.66l.66.28a1.8 1.8 0 0 0 2-.36l1.8 1.8a1.8 1.8 0 0 0-.36 2l.28.66A1.8 1.8 0 0 0 21.44 11H22v2h-.56a1.8 1.8 0 0 0-1.66 1.1z"/></svg>
      Settings
    </button>
    <dialog ref={dialog} className={`settings-dialog ${closing ? 'is-closing' : ''}`} aria-labelledby="settings-title"
      onClick={(event) => { if (event.target === dialog.current) close() }}
      onCancel={(event) => { event.preventDefault(); close() }}
      onClose={() => setClosing(false)}>
      <form onSubmit={save} className="settings-panel">
        <div className="flex items-start justify-between gap-4">
          <div><p className="eyebrow">Host controls</p><h2 id="settings-title" className="mt-2 text-2xl font-bold">Quiz settings</h2></div>
          <button className="settings-close" type="button" onClick={close} aria-label="Close settings">×</button>
        </div>
        <p className="text-muted mt-3 text-sm leading-relaxed">Timing changes apply to new rooms. Rooms already open keep their original timing.</p>
        {error && <p className="notice mt-5" role="alert">{error}</p>}
        <div className="mt-7 space-y-5">
          <label className="block"><span className="label">Show choices after</span><span className="settings-input-wrap"><input className="field" type="number" min="0" max="20" step="1" required disabled={loading || saving} value={settings.choiceRevealSeconds} onChange={(event) => setSettings({ ...settings, choiceRevealSeconds: event.target.value })} /><span>seconds</span></span><span className="text-muted mt-2 block text-xs">0–20 seconds; default 5.</span></label>
          <label className="block"><span className="label">Time to answer</span><span className="settings-input-wrap"><input className="field" type="number" min="10" max="100" step="1" required disabled={loading || saving} value={settings.answerTimeSeconds} onChange={(event) => setSettings({ ...settings, answerTimeSeconds: event.target.value })} /><span>seconds</span></span><span className="text-muted mt-2 block text-xs">10–100 seconds; default 20.</span></label>
        </div>
        <div className="mt-8 flex justify-end gap-3"><button className="btn-ghost" type="button" onClick={close}>Close</button><button className="btn-primary btn-success" type="submit" disabled={loading || saving || closing}>{saving ? 'Saving…' : 'Save settings'}</button></div>
      </form>
    </dialog>
  </>
}
