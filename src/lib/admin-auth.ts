import 'server-only'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const ADMIN_COOKIE = 'quiz_admin_session'
export const ADMIN_SESSION_SECONDS = 7 * 24 * 60 * 60

function adminPassword() {
  return process.env.QUIZ_ADMIN_PASSWORD || null
}

export function isAdminConfigured() {
  return adminPassword() !== null
}

export function checkAdminPassword(candidate: unknown) {
  const password = adminPassword()
  if (!password || typeof candidate !== 'string' || !candidate || candidate.length > 1024) return false
  const supplied = createHash('sha256').update(candidate).digest()
  const expected = createHash('sha256').update(password).digest()
  return timingSafeEqual(supplied, expected)
}

function signature(payload: string, password: string) {
  return createHmac('sha256', password).update(`quiz-admin-session-v1:${payload}`).digest('base64url')
}

export function createAdminSession() {
  const password = adminPassword()
  if (!password) throw new Error('Admin password is not configured')
  const payload = `${Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS}.${randomBytes(16).toString('base64url')}`
  return `${payload}.${signature(payload, password)}`
}

export function isValidAdminSession(value: string | undefined) {
  const password = adminPassword()
  if (!password || !value) return false
  const match = /^(\d{10})\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/.exec(value)
  if (!match || Number(match[1]) <= Math.floor(Date.now() / 1000)) return false
  const payload = `${match[1]}.${match[2]}`
  const actual = Buffer.from(match[3], 'base64url')
  const expected = Buffer.from(signature(payload, password), 'base64url')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function hasAdminSession() {
  return isValidAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)
}
