import { createGame } from '@/lib/game-store'
import { loadQuizzes } from '@/lib/quizzes'
import { joinOrigin } from '@/lib/network'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (typeof body?.quizId !== 'string') return Response.json({ error: 'Quiz ID is required' }, { status: 400 })
  const quiz = (await loadQuizzes()).find((item) => item.id === body.quizId)
  if (!quiz) return Response.json({ error: 'Quiz not found' }, { status: 404 })
  return Response.json(createGame(quiz, joinOrigin(request)), { status: 201 })
}
