import { hasAdminSession } from '@/lib/admin-auth'
import { getQuizSettings, saveQuizSettings } from '@/lib/quiz-settings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  if (!await hasAdminSession()) return Response.json({ error: 'Admin sign in required' }, { status: 401 })
  try {
    return Response.json(await getQuizSettings(), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ error: 'Could not read quiz settings' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  if (!await hasAdminSession()) return Response.json({ error: 'Admin sign in required' }, { status: 401 })
  const body = await request.json().catch(() => null)
  try {
    return Response.json(await saveQuizSettings(body), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof Error && /^(Invalid quiz settings|Choice reveal delay|Answer time)/.test(error.message)) {
      return Response.json({ error: error.message }, { status: 400 })
    }
    return Response.json({ error: 'Could not save quiz settings' }, { status: 500 })
  }
}
