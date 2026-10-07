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

function validOrigin(value: string | undefined): string | null {
  if (!value?.trim()) return null
  try {
    const parsed = new URL(value.trim())
    if (['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password &&
        parsed.pathname === '/' && !parsed.search && !parsed.hash) return parsed.origin
  } catch { /* Ignore invalid deployment configuration. */ }
  return null
}

function isLoopback(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(hostname)
}

function isPrivateAddress(hostname: string): boolean {
  return /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\.|^169\.254\./.test(hostname) ||
    /^\[(fc|fd|fe80)/i.test(hostname)
}

function publicRequestOrigin(value: string | null): string | null {
  const origin = validOrigin(value ?? undefined)
  if (!origin) return null
  const hostname = new URL(origin).hostname
  return isLoopback(hostname) || isPrivateAddress(hostname) ? null : origin
}

export function joinOrigin(request: Request): string | null {
  const publicOrigin = validOrigin(process.env.QUIZ_PUBLIC_ORIGIN)
  if (publicOrigin) return publicOrigin

  const url = new URL(request.url)
  const configuredHost = process.env.QUIZ_JOIN_HOST?.trim()
  if (configuredHost && /^[a-z\d.-]+$/i.test(configuredHost)) {
    return `${url.protocol}//${configuredHost}${url.port ? `:${url.port}` : ''}`
  }

  // A browser POST carries the actual address used by the host, including custom domains.
  const browserOrigin = validOrigin(request.headers.get('origin') ?? undefined)
  if (browserOrigin && !isLoopback(new URL(browserOrigin).hostname)) return browserOrigin

  // Reverse proxies can expose an internal request URL while forwarding the public host.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  if (forwardedHost && (forwardedProto === 'https' || forwardedProto === 'http')) {
    const forwardedOrigin = publicRequestOrigin(`${forwardedProto}://${forwardedHost}`)
    if (forwardedOrigin) return forwardedOrigin
  }

  const renderOrigin = validOrigin(process.env.RENDER_EXTERNAL_URL)
  if (renderOrigin) return renderOrigin

  const renderHostname = process.env.RENDER_EXTERNAL_HOSTNAME?.trim()
  if (renderHostname && /^[a-z\d.-]+$/i.test(renderHostname)) return `https://${renderHostname}`

  const koyebDomain = process.env.KOYEB_PUBLIC_DOMAIN?.trim()
  if (koyebDomain && /^[a-z\d.-]+$/i.test(koyebDomain)) return `https://${koyebDomain}`

  const localHost = isLoopback(url.hostname)

  const requestHost = request.headers.get('host')
  if (requestHost) {
    const hostOrigin = publicRequestOrigin(`${url.protocol}//${requestHost}`)
    if (hostOrigin) return hostOrigin
  }

  if (!localHost) return isPrivateAddress(url.hostname) ? null : url.origin

  const host = lanAddress()
  return host ? `${url.protocol}//${host}${url.port ? `:${url.port}` : ''}` : null
}
