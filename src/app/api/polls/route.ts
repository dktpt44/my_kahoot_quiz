import { hasAdminSession } from '@/lib/admin-auth'
import { joinOrigin } from '@/lib/network'
import { createPoll } from '@/lib/poll-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!await hasAdminSession()) return Response.json({ error: 'Admin sign in required' }, { status: 401 })
  const input = await request.json().catch(() => null)
  try {
    return Response.json(createPoll(input, joinOrigin(request)), { status: 201 })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Could not create poll' }, { status: 400 })
  }
}
