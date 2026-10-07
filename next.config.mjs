import { networkInterfaces } from 'node:os'

// The QR code uses a LAN address when the host opens the app on localhost.
// Next.js must allow that same address for dev assets and the HMR connection.
const lanHosts = (() => {
  try {
    return Object.values(networkInterfaces())
      .flatMap((addresses) => addresses ?? [])
      .filter((address) => address.family === 'IPv4' && !address.internal)
      .map((address) => address.address)
  } catch {
    return []
  }
})()
const configuredHost = process.env.QUIZ_JOIN_HOST?.trim()

/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  allowedDevOrigins: [...new Set([
    '127.0.0.1',
    ...lanHosts,
    ...(configuredHost && /^[a-z\d.-]+$/i.test(configuredHost) ? [configuredHost] : []),
  ])],
  logging: {
    incomingRequests: false,
    serverFunctions: false,
    browserToTerminal: 'error',
  },
  async redirects() {
    return [
      { source: '/host', destination: '/host/dashboard', permanent: true },
    ]
  },
}

export default nextConfig
