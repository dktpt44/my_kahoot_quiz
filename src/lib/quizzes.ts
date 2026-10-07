import 'server-only'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import type { QuizSet, QuizSummary } from '@/types/game'

const dataDirectory = path.join(process.cwd(), 'data')

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function listQuizCategories(): Promise<string[]> {
  const entries = await readdir(dataDirectory, { withFileTypes: true })
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
}

export async function loadQuizzes(): Promise<QuizSet[]> {
  const categories = await listQuizCategories()
  const files = (await Promise.all(categories.map(async (category) => {
    const entries = await readdir(path.join(dataDirectory, category), { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => ({ category, name: entry.name }))
  }))).flat().sort((a, b) => `${a.category}/${a.name}`.localeCompare(`${b.category}/${b.name}`))

  return Promise.all(files.map(async ({ category, name }) => {
    const file = `data/${category}/${name}`
    const raw: unknown = JSON.parse(await readFile(path.join(dataDirectory, category, name), 'utf8'))
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
      id: `${category}/${name.slice(0, -'.json'.length)}`,
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
