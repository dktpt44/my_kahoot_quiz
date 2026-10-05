import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { quizPaths } from '../../config'
import type { QuizSet, QuizSummary } from '@/types/game'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

let cachedQuizzes: Promise<QuizSet[]> | null = null

export function loadQuizzes(): Promise<QuizSet[]> {
  return cachedQuizzes ??= Promise.all(quizPaths.map(async (file) => {
    if (!/^data\/(networks|os|aml|cvpr)\/[a-zA-Z0-9_-]+\.json$/.test(file)) {
      throw new Error(`Invalid quiz path in config.js: ${file}`)
    }
    const raw: unknown = JSON.parse(await readFile(path.join(process.cwd(), 'data', file.slice('data/'.length)), 'utf8'))
    if (!isRecord(raw) || typeof raw.name !== 'string' || !Array.isArray(raw.questions) || !raw.questions.length) {
      throw new Error(`Invalid quiz in ${file}: expected name and nonempty questions`)
    }
    const questions = raw.questions.map((question: unknown, order: number) => {
      if (!isRecord(question) || typeof question.body !== 'string' || !Array.isArray(question.choices) || question.choices.length < 2 || question.choices.length > 4) {
        throw new Error(`Invalid question ${order + 1} in ${file}`)
      }
      const choices = question.choices.map((choice: unknown, index: number) => {
        if (!isRecord(choice) || typeof choice.body !== 'string' || typeof choice.is_correct !== 'boolean') {
          throw new Error(`Invalid choice ${index + 1} of question ${order + 1} in ${file}`)
        }
        return { id: `${order}-${index}`, body: choice.body, is_correct: choice.is_correct }
      })
      if (choices.filter((choice) => choice.is_correct).length !== 1) {
        throw new Error(`Question ${order + 1} in ${file} must have exactly one correct choice`)
      }
      return { id: `${order}`, order, body: question.body, choices }
    })
    return {
      id: file.slice('data/'.length, -'.json'.length),
      name: raw.name,
      description: typeof raw.description === 'string' ? raw.description : '',
      questions,
    }
  }))
}

export async function listQuizzes(): Promise<QuizSummary[]> {
  return (await loadQuizzes()).map(({ id, name, description, questions }) => ({
    id, name, description, questionCount: questions.length,
  }))
}
