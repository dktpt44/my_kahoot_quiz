import { listQuizzes } from '@/lib/quizzes'
import { hasAdminSession } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!await hasAdminSession()) return Response.json({ error: 'Admin sign in required' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  return Response.json(await listQuizzes(), { headers: { 'Cache-Control': 'no-store' } })
}
