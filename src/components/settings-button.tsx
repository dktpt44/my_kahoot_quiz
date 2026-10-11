'use client'

import { useEffect, useRef, useState } from 'react'
import type { LeaderboardVisibility } from '@/types/game'

type Settings = { choiceRevealSeconds: string; answerTimeSeconds: string; leaderboardVisibility: LeaderboardVisibility; showDistribution: boolean; saveSession: boolean }

const leaderboardOptions: { value: LeaderboardVisibility; label: string }[] = [
  { value: 'hide', label: 'Hide' },
  { value: 'top1', label: 'First place only' },
  { value: 'top3', label: 'Show top three' },
  { value: 'top10', label: 'Show top 10' },
  { value: 'all', label: 'Show all' },
]

export default function SettingsButton() {
  const dialog = useRef<HTMLDialogElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [closing, setClosing] = useState(false)
  const [settings, setSettings] = useState<Settings>({ choiceRevealSeconds: '5', answerTimeSeconds: '20', leaderboardVisibility: 'all', showDistribution: true, saveSession: false })
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

  const highlightDialog = () => {
    dialog.current?.animate([
      { borderColor: 'rgba(237,222,255,.37)', boxShadow: '0 30px 85px rgba(8,3,26,.55)' },
      { borderColor: 'rgba(198,167,255,.9)', boxShadow: '0 0 0 5px rgba(198,167,255,.22), 0 30px 85px rgba(8,3,26,.55)' },
      { borderColor: 'rgba(237,222,255,.37)', boxShadow: '0 30px 85px rgba(8,3,26,.55)' },
    ], { duration: 420, easing: 'ease-out' })
  }

  const open = async () => {
    dialog.current?.showModal()
    body.current?.scrollTo(0, 0)
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/admin/settings', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not load settings')
      setSettings({ choiceRevealSeconds: String(result.choiceRevealSeconds), answerTimeSeconds: String(result.answerTimeSeconds), leaderboardVisibility: result.leaderboardVisibility, showDistribution: result.showDistribution ?? true, saveSession: result.saveSession ?? false })
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
          leaderboardVisibility: settings.leaderboardVisibility,
          showDistribution: settings.showDistribution,
          saveSession: settings.saveSession,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save settings')
      setSettings({ choiceRevealSeconds: String(result.choiceRevealSeconds), answerTimeSeconds: String(result.answerTimeSeconds), leaderboardVisibility: result.leaderboardVisibility, showDistribution: result.showDistribution ?? true, saveSession: result.saveSession ?? false })
      close()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save settings')
      body.current?.scrollTo(0, 0)
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
      onClick={(event) => { if (event.target === dialog.current) highlightDialog() }}
      onCancel={(event) => { event.preventDefault(); close() }}
      onClose={() => setClosing(false)}>
      <form onSubmit={save} className="settings-panel">
        <div className="settings-panel-header">
          <h2 id="settings-title" className="text-2xl font-bold">Quiz settings</h2>
          <button className="settings-close" type="button" onClick={close} aria-label="Close settings">×</button>
        </div>
        <div ref={body} className="settings-panel-body">
          <p className="text-muted text-sm leading-relaxed">Changes apply to new rooms. Rooms already open keep their original settings.</p>
          {error && <p className="notice mt-5" role="alert">{error}</p>}
          <div className="mt-7 space-y-5">
            <label className="block"><span className="label">Show choices after</span><span className="settings-input-wrap"><input className="field" type="number" min="0" max="20" step="1" required disabled={loading || saving} value={settings.choiceRevealSeconds} onChange={(event) => setSettings({ ...settings, choiceRevealSeconds: event.target.value })} /><span>seconds</span></span><span className="text-muted mt-2 block text-xs">0–20 seconds; default 5.</span></label>
            <label className="block"><span className="label">Time to answer</span><span className="settings-input-wrap"><input className="field" type="number" min="10" max="100" step="1" required disabled={loading || saving} value={settings.answerTimeSeconds} onChange={(event) => setSettings({ ...settings, answerTimeSeconds: event.target.value })} /><span>seconds</span></span><span className="text-muted mt-2 block text-xs">10–100 seconds; default 20.</span></label>
            <fieldset>
              <legend className="label">Final leaderboard</legend>
              <p className="text-muted mt-1 text-xs">Hide removes names and standings. The distribution switch controls the class chart separately. Every player still sees their own result.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {leaderboardOptions.map((option) => <label key={option.value} className={`settings-choice ${settings.leaderboardVisibility === option.value ? 'is-selected' : ''}`}>
                  <input type="radio" name="leaderboardVisibility" value={option.value} checked={settings.leaderboardVisibility === option.value} disabled={loading || saving} onChange={() => setSettings({ ...settings, leaderboardVisibility: option.value })} />
                  <span>{option.label}</span>
                </label>)}
              </div>
            </fieldset>
            <label className="settings-switch-row">
              <span><strong className="block text-sm">Show correct-answer distribution</strong><span className="text-muted mt-1 block text-xs">Display the class chart on the final host screen, even when the leaderboard is hidden.</span></span>
              <input className="settings-switch-input" type="checkbox" role="switch" checked={settings.showDistribution} disabled={loading || saving} onChange={(event) => setSettings({ ...settings, showDistribution: event.target.checked })} />
            </label>
            <label className="settings-switch-row">
              <span><strong className="block text-sm">Save session</strong><span className="text-muted mt-1 block text-xs">Save the completed quiz leaderboard in data/sessions. Off by default.</span></span>
              <input className="settings-switch-input" type="checkbox" role="switch" checked={settings.saveSession} disabled={loading || saving} onChange={(event) => setSettings({ ...settings, saveSession: event.target.checked })} />
            </label>
          </div>
        </div>
        <div className="settings-panel-footer"><button className="btn-ghost" type="button" onClick={close}>Close</button><button className="btn-primary btn-success" type="submit" disabled={loading || saving || closing}>{saving ? 'Saving…' : 'Save settings'}</button></div>
      </form>
    </dialog>
  </>
}
