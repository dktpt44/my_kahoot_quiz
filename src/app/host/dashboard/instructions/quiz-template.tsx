'use client'

import { useState } from 'react'

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

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(template)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return <section className="glass overflow-hidden p-5 sm:p-7" aria-labelledby="quiz-template-title">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><p className="eyebrow">Copy and edit</p><h2 id="quiz-template-title" className="mt-2 text-xl font-bold">quiz1.json</h2></div>
      <button className="btn-secondary px-4 py-2 text-sm" type="button" onClick={copy} aria-live="polite">{copied ? 'Copied!' : 'Copy JSON'}</button>
    </div>
    <pre className="quiz-template-code"><code>{template}</code></pre>
  </section>
}
