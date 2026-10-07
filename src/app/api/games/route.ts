import { createGame } from '@/lib/game-store'
import { loadQuizzes } from '@/lib/quizzes'
import { joinOrigin } from '@/lib/network'
import { hasAdminSession } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!await hasAdminSession()) return Response.json({ error: 'Admin sign in required' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (typeof body?.quizId !== 'string') return Response.json({ error: 'Quiz ID is required' }, { status: 400 })
  const quiz = (await loadQuizzes()).find((item) => item.id === body.quizId)
  if (!quiz) return Response.json({ error: 'Quiz not found' }, { status: 404 })
  return Response.json(createGame(quiz, joinOrigin(request)), { status: 201 })
}
