import { authenticatePlayer, cancelGame, closeGame, gameRevision, getGame, hostAction, hostView, isHost, joinGame, playerView, submitAnswer } from '@/lib/game-store'

export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Context) {
  const game = getGame((await params).id)
  if (!game) return Response.json({ error: 'Game not found' }, { status: 404 })
  const host = isHost(game, request.headers.get('x-host-token'))
  const player = authenticatePlayer(game, request.headers.get('x-player-id'), request.headers.get('x-player-token'))
  const etag = `"${game.id}-${host ? 'host' : player?.id ?? 'guest'}-${gameRevision(game)}"`
  const headers = { 'Cache-Control': 'private, no-store', ETag: etag }
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers })
  if (host) return Response.json(hostView(game), { headers })
  return Response.json(playerView(game, player), { headers })
}

export async function POST(request: Request, { params }: Context) {
  const game = getGame((await params).id)
  if (!game) return Response.json({ error: 'Game not found' }, { status: 404 })
  const body = await request.json().catch(() => null)
  try {
    if (body?.action === 'join' && typeof body.nickname === 'string') {
      return Response.json(joinGame(game, body.nickname), { status: 201 })
    }
    if (body?.action === 'answer' && typeof body.choiceId === 'string') {
      const player = authenticatePlayer(game, request.headers.get('x-player-id'), request.headers.get('x-player-token'))
      if (!player) return Response.json({ error: 'Invalid player credentials' }, { status: 403 })
      submitAnswer(game, player, body.choiceId)
      return Response.json({ ok: true })
    }
    if (body?.action === 'close') {
      if (!isHost(game, request.headers.get('x-host-token'))) {
        return Response.json({ error: 'Invalid host credentials' }, { status: 403 })
      }
      closeGame(game)
      return Response.json({ ok: true })
    }
    if (body?.action === 'cancel') {
      if (!isHost(game, request.headers.get('x-host-token'))) {
        return Response.json({ error: 'Invalid host credentials' }, { status: 403 })
      }
      cancelGame(game)
      return Response.json({ ok: true })
    }
    if (typeof body?.action === 'string' && ['start', 'reveal', 'next'].includes(body.action)) {
      if (!isHost(game, request.headers.get('x-host-token'))) {
        return Response.json({ error: 'Invalid host credentials' }, { status: 403 })
      }
      hostAction(game, body.action)
      return Response.json(hostView(game))
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Invalid request' }, { status: 400 })
  }
}
