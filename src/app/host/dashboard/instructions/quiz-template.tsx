'use client'

import { useEffect, useRef, useState } from 'react'

const template = `{
  "name": "your_quiz_name",
  "description": "your_quiz_description",
  "questions": [
    {
      "body": "your_question_body_1",
      "choices": [
        { "body": "your_choice_one", "is_correct": true },
        { "body": "your_choice_two", "is_correct": false },
        { "body": "your_choice_three", "is_correct": false },
        { "body": "your_choice_four", "is_correct": false }
      ]
    },
    {
      "body": "your_question_body_2",
      "choices": [
        { "body": "your_choice_one", "is_correct": false },
        { "body": "your_choice_two", "is_correct": true },
        { "body": "your_choice_three", "is_correct": false },
        { "body": "your_choice_four", "is_correct": false }
      ]
    }
  ]
}`

export function QuizTemplate() {
  const [copied, setCopied] = useState(false)
  const [copyHint, setCopyHint] = useState('')
  const codeRef = useRef<HTMLElement>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current)
  }, [])

  const copy = async () => {
    if (resetTimer.current) clearTimeout(resetTimer.current)
    let successful = false

    if (window.isSecureContext && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(template)
        successful = true
      } catch { /* Try the browser's selection-based copy below. */ }
    }

    if (!successful) {
      const input = document.createElement('textarea')
      input.value = template
      input.readOnly = true
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.appendChild(input)
      input.focus()
      input.select()
      try { successful = document.execCommand('copy') } catch { /* Let the user copy the selected code. */ }
      input.remove()
    }

    setCopied(successful)
    if (successful) {
      setCopyHint('')
      resetTimer.current = setTimeout(() => setCopied(false), 1800)
    } else {
      if (codeRef.current) {
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(codeRef.current)
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
      setCopyHint('The JSON is selected. Press Ctrl+C or Cmd+C to copy it.')
    }
  }

  return <section className="glass overflow-hidden p-5 sm:p-7" aria-labelledby="quiz-template-title">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><p className="eyebrow">Copy and edit</p><h2 id="quiz-template-title" className="mt-2 text-xl font-bold">quiz1.json</h2></div>
      <button className="btn-secondary px-4 py-2 text-sm" type="button" onClick={copy} aria-live="polite">{copied ? 'Copied!' : 'Copy JSON'}</button>
    </div>
    {copyHint && <p className="text-muted mb-4 text-sm" role="status">{copyHint}</p>}
    <pre className="quiz-template-code"><code ref={codeRef}>{template}</code></pre>
  </section>
}
