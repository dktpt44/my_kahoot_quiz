import { authenticatePlayer, getGame, hostView, isHost, playerView, subscribeGame } from '@/lib/game-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Context) {
  const game = getGame((await params).id)
  if (!game) return Response.json({ error: 'Game not found' }, { status: 404 })

  const hostToken = request.headers.get('x-host-token')
  const playerId = request.headers.get('x-player-id')
  const playerToken = request.headers.get('x-player-token')
  const host = isHost(game, hostToken)
  const player = authenticatePlayer(game, playerId, playerToken)
  if ((hostToken && !host) || ((playerId || playerToken) && !player)) {
    return Response.json({ error: 'Invalid credentials' }, { status: 403 })
  }

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
          const view = host ? hostView(game) : playerView(game, player)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(view)}\n\n`))
          if (view.phase === 'result') close()
        } catch { close() }
      }
      unsubscribe = subscribeGame(game, (audience) => {
        if (host || audience === 'all') sendView()
      })
      request.signal.addEventListener('abort', close, { once: true })
      if (request.signal.aborted) {
        close()
        return
      }
      heartbeat = setInterval(() => {
        if (closed) return
        try { controller.enqueue(encoder.encode(': ping\n\n')) } catch { close() }
      }, 30_000)
      heartbeat.unref()
      sendView()
    },
    cancel() { stop() },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
