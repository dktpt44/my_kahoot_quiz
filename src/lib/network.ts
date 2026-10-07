import 'server-only'
import { networkInterfaces } from 'node:os'

function lanAddress(): string | null {
  try {
    const candidates = Object.entries(networkInterfaces()).flatMap(([name, addresses]) =>
      (addresses ?? [])
        .filter((address) => address.family === 'IPv4' && !address.internal)
        .map((address) => ({ name, address: address.address }))
    )

    candidates.sort((a, b) => score(b.name, b.address) - score(a.name, a.address))
    return candidates[0]?.address ?? null
  } catch {
    return null
  }
}

function score(name: string, address: string): number {
  let result = 0
  if (/^(wl|en|eth)/i.test(name)) result += 10
  if (/^(docker|veth|br-|virbr|tun|tap|wg|tailscale)/i.test(name)) result -= 20
  if (/^192\.168\./.test(address)) result += 4
  if (/^10\./.test(address)) result += 3
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) result += 2
  return result
}

export function joinOrigin(request: Request): string | null {
  const publicOrigin = process.env.QUIZ_PUBLIC_ORIGIN?.trim()
  if (publicOrigin) {
    try {
      const parsed = new URL(publicOrigin)
      if (['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password &&
          parsed.pathname === '/' && !parsed.search && !parsed.hash) return parsed.origin
    } catch { /* Use the request or local network address below. */ }
  }

  const koyebDomain = process.env.KOYEB_PUBLIC_DOMAIN?.trim()
  if (koyebDomain && /^[a-z\d.-]+$/i.test(koyebDomain)) return `https://${koyebDomain}`

  const url = new URL(request.url)
  const configuredHost = process.env.QUIZ_JOIN_HOST?.trim()
  const localHost = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(url.hostname)

  if (!localHost && !configuredHost) return url.origin

  const host = configuredHost && /^[a-z\d.-]+$/i.test(configuredHost)
    ? configuredHost
    : lanAddress()

  return host ? `${url.protocol}//${host}${url.port ? `:${url.port}` : ''}` : null
}
