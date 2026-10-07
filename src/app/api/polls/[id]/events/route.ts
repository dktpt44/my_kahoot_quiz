import { NextRequest } from 'next/server'
import { getPoll, hostPollView, isPollHost, playerPollView, POLL_VISITOR_COOKIE, subscribePoll, visitorIdFromCookie } from '@/lib/poll-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  const poll = getPoll((await params).id)
  if (!poll) return Response.json({ error: 'Poll not found' }, { status: 404 })
  const hostToken = request.headers.get('x-host-token')
  const host = isPollHost(poll, hostToken)
  if (hostToken && !host) return Response.json({ error: 'Invalid host credentials' }, { status: 403 })
  const visitorId = host ? null : visitorIdFromCookie(request.cookies.get(POLL_VISITOR_COOKIE)?.value)
  if (!host && !visitorId) return Response.json({ error: 'Open the poll link again to join' }, { status: 403 })

  const encoder = new TextEncoder()
  let stop = () => {}
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      let heartbeat: ReturnType<typeof setInterval> | undefined
      let unsubscribe = () => {}
      const close = () => {
        if (closed) return
        closed = true
        clearInterval(heartbeat)
        unsubscribe()
        request.signal.removeEventListener('abort', close)
        try { controller.close() } catch { /* The browser already disconnected. */ }
      }
      stop = close
      const sendView = () => {
        if (closed) return
        try {
          const view = host ? hostPollView(poll) : playerPollView(poll, visitorId)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(view)}\n\n`))
          if (view.phase === 'ended') close()
        } catch { close() }
      }
      unsubscribe = subscribePoll(poll, (audience) => { if (host || audience === 'all') sendView() })
      request.signal.addEventListener('abort', close, { once: true })
      if (request.signal.aborted) { close(); return }
      heartbeat = setInterval(() => {
        if (closed) return
        try { controller.enqueue(encoder.encode(': ping\n\n')) } catch { close() }
      }, 30_000)
      heartbeat.unref()
      sendView()
    },
    cancel() { stop() },
  })
  return new Response(stream, { headers: {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  } })
}
