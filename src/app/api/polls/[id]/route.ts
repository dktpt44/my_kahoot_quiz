import { NextRequest, NextResponse } from 'next/server'
import { closePoll, createVisitorCookie, endPoll, getPoll, hostPollView, isPollHost, playerPollView, POLL_VISITOR_COOKIE, submitPollVote, visitorIdFromCookie } from '@/lib/poll-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  const poll = getPoll((await params).id)
  if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  const hostToken = request.headers.get('x-host-token')
  if (hostToken) {
    if (!isPollHost(poll, hostToken)) return NextResponse.json({ error: 'Invalid host credentials' }, { status: 403 })
    return NextResponse.json(hostPollView(poll), { headers: { 'Cache-Control': 'no-store' } })
  }
  const visitorId = visitorIdFromCookie(request.cookies.get(POLL_VISITOR_COOKIE)?.value)
  const response = NextResponse.json(playerPollView(poll, visitorId), { headers: { 'Cache-Control': 'no-store' } })
  if (!visitorId) {
    const cookie = createVisitorCookie()
    response.cookies.set(POLL_VISITOR_COOKIE, cookie, {
      httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:',
      path: '/', maxAge: 30 * 24 * 60 * 60,
    })
  }
  return response
}

export async function POST(request: NextRequest, { params }: Context) {
  const poll = getPoll((await params).id)
  if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  const body = await request.json().catch(() => null)
  try {
    if (body?.action === 'vote') {
      const visitorId = visitorIdFromCookie(request.cookies.get(POLL_VISITOR_COOKIE)?.value)
      if (!visitorId) return NextResponse.json({ error: 'Open the poll link again to join' }, { status: 403 })
      if (typeof body.optionId !== 'string') throw new Error('Choose an option')
      submitPollVote(poll, visitorId, body.optionId)
      return NextResponse.json(playerPollView(poll, visitorId), { headers: { 'Cache-Control': 'no-store' } })
    }
    if (body?.action === 'end' || body?.action === 'close') {
      if (!isPollHost(poll, request.headers.get('x-host-token'))) {
        return NextResponse.json({ error: 'Invalid host credentials' }, { status: 403 })
      }
      if (body.action === 'end') {
        endPoll(poll)
        return NextResponse.json(hostPollView(poll))
      }
      closePoll(poll)
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update poll' }, { status: 400 })
  }
}
