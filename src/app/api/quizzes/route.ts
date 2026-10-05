import { listQuizzes } from '@/lib/quizzes'

export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json(await listQuizzes(), { headers: { 'Cache-Control': 'no-store' } })
}
