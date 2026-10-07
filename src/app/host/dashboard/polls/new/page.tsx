'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowIcon } from '@/components/ui'

type OptionInput = { key: number; text: string }
const DRAFT_KEY = 'poll:draft'

export default function NewPoll() {
  const nextKey = useRef(3)
  const questionInput = useRef<HTMLTextAreaElement>(null)
  const optionInputs = useRef(new Map<number, HTMLInputElement>())
  const focusOption = useRef<number | null>(null)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<OptionInput[]>([{ key: 1, text: '' }, { key: 2, text: '' }])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = sessionStorage.getItem(DRAFT_KEY)
    if (!saved) return
    sessionStorage.removeItem(DRAFT_KEY)
    try {
      const draft = JSON.parse(saved)
      if (typeof draft.question === 'string' && Array.isArray(draft.options) &&
          draft.options.length >= 2 && draft.options.length <= 8 && draft.options.every((text: unknown) => typeof text === 'string')) {
        setQuestion(draft.question)
        setOptions(draft.options.map((text: string, index: number) => ({ key: index + 1, text })))
        nextKey.current = draft.options.length + 1
      }
    } catch { /* Ignore an invalid old draft. */ }
  }, [])

  useEffect(() => { questionInput.current?.focus() }, [])

  useEffect(() => {
    if (focusOption.current === null) return
    optionInputs.current.get(focusOption.current)?.focus()
    focusOption.current = null
  }, [options])

  const addOption = () => {
    if (options.length >= 8) return
    const key = nextKey.current++
    focusOption.current = key
    setOptions((current) => [...current, { key, text: '' }])
  }

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (creating) return
    const trimmedQuestion = question.trim()
    const trimmedOptions = options.map((option) => option.text.trim())
    if (!trimmedQuestion || trimmedOptions.some((option) => !option)) {
      setError('Fill in the question and every option before creating the poll.')
      return
    }
    setCreating(true)
    setError('')
    try {
      const response = await fetch('/api/polls', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmedQuestion, type: 'multiple_choice', options: trimmedOptions }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not create poll')
      localStorage.setItem(`host:poll:${result.id}`, result.hostToken)
      window.location.assign(`/host/poll/${result.id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create poll')
      setCreating(false)
    }
  }

  return <div className="mx-auto max-w-3xl animate-in">
    <header className="mb-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Create a poll</h1>
        <Link href="/host/dashboard" className="btn-secondary library-back"><ArrowIcon /> Back to home</Link>
      </div>
      <p className="text-muted mt-3">Ask one question and collect live responses.</p>
    </header>
    <form className="glass p-6 sm:p-9" onSubmit={create}>
      <label className="block"><span className="label">Poll question</span><textarea ref={questionInput} className="field poll-question-field" rows={2} maxLength={500} required value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What should we discuss next?" aria-describedby="poll-question-count" /></label>
      <p id="poll-question-count" className="text-muted mt-1 text-right text-xs tabular-nums">{question.length}/500</p>
      <label className="mt-6 block"><span className="label">Poll type</span><select className="field" defaultValue="multiple_choice"><option value="multiple_choice">Multiple choice</option></select></label>
      <fieldset className="mt-7"><legend className="text-lg font-bold">Options</legend><p className="text-muted mt-1 text-sm">Participants choose one option.</p>
        <div className="mt-5 space-y-3">
          {options.map((option, index) => <div key={option.key}>
            <div className="flex items-end gap-3">
              <label className="min-w-0 flex-1"><span className="label">Option {index + 1}</span><input ref={(node) => { if (node) optionInputs.current.set(option.key, node); else optionInputs.current.delete(option.key) }} className="field" type="text" maxLength={200} required value={option.text} onChange={(event) => setOptions((current) => current.map((item) => item.key === option.key ? { ...item, text: event.target.value } : item))} placeholder={`Enter option ${index + 1}`} aria-describedby={`poll-option-count-${option.key}`} /></label>
              <button className="poll-remove-option" type="button" disabled={options.length <= 2} onClick={() => setOptions((current) => current.filter((item) => item.key !== option.key))} aria-label={`Remove option ${index + 1}`}>×</button>
            </div>
            <p id={`poll-option-count-${option.key}`} className="text-muted mt-1 text-right text-xs tabular-nums">{option.text.length}/200</p>
          </div>)}
        </div>
        <button className="btn-secondary mt-5" type="button" disabled={options.length >= 8} onClick={addOption}>+ Add option</button>
        <p className="text-muted mt-2 text-xs">2 to 8 options</p>
      </fieldset>
      {error && <p className="notice mt-6" role="alert">{error}</p>}
      <div className="rule my-7" />
      <div className="flex justify-end"><button className="btn-primary btn-success min-w-40" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create poll'} <ArrowIcon /></button></div>
    </form>
  </div>
}
