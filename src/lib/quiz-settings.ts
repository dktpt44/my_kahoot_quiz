import 'server-only'
import { randomUUID } from 'node:crypto'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type QuizSettings = {
  choiceRevealSeconds: number
  answerTimeSeconds: number
}

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  choiceRevealSeconds: 5,
  answerTimeSeconds: 20,
}

const settingsPath = path.join(process.cwd(), '.quiz-settings.json')

export function parseQuizSettings(value: unknown): QuizSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid quiz settings')
  }
  const { choiceRevealSeconds, answerTimeSeconds } = value as Record<string, unknown>
  if (!Number.isInteger(choiceRevealSeconds) || (choiceRevealSeconds as number) < 0 || (choiceRevealSeconds as number) > 20) {
    throw new Error('Choice reveal delay must be a whole number from 0 to 20 seconds')
  }
  if (!Number.isInteger(answerTimeSeconds) || (answerTimeSeconds as number) < 10 || (answerTimeSeconds as number) > 100) {
    throw new Error('Answer time must be a whole number from 10 to 100 seconds')
  }
  return { choiceRevealSeconds: choiceRevealSeconds as number, answerTimeSeconds: answerTimeSeconds as number }
}

export async function getQuizSettings(): Promise<QuizSettings> {
  try {
    return parseQuizSettings(JSON.parse(await readFile(settingsPath, 'utf8')))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return DEFAULT_QUIZ_SETTINGS
    throw error
  }
}

export async function saveQuizSettings(value: unknown): Promise<QuizSettings> {
  const settings = parseQuizSettings(value)
  const temporaryPath = `${settingsPath}.${randomUUID()}.tmp`
  try {
    await writeFile(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 })
    await rename(temporaryPath, settingsPath)
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => {})
    throw error
  }
  return settings
}
