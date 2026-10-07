import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, checkAdminPassword, createAdminSession, isAdminConfigured } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: 'Set QUIZ_ADMIN_PASSWORD in .env.local before signing in.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
  const body = await request.json().catch(() => null)
  if (!checkAdminPassword(body?.password)) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  response.cookies.set(ADMIN_COOKIE, createAdminSession(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: ADMIN_SESSION_SECONDS,
  })
  return response
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  response.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: 0,
  })
  return response
}
