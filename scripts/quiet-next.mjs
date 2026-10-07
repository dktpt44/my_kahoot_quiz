import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { connect } from 'node:net'
import { networkInterfaces } from 'node:os'
import readline from 'node:readline'

const mode = process.argv[2]
if (mode !== 'dev' && mode !== 'start') {
  process.stderr.write('Expected "dev" or "start".\n')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), mode, ...process.argv.slice(3)], {
  cwd: process.cwd(),
  env: process.env,
  stdio: ['inherit', 'pipe', 'pipe'],
})

// Next.js prints normal startup and request messages to the same terminal as errors.
// Keep error blocks visible without flooding the terminal during a live quiz.
const errorLine = /\b(?:error|exception|failed|fatal|panic)\b|[⨯✖]|^\[browser\]/i
const ansi = /\u001b\[[0-9;]*m/g
let showingError = false
let stopping = false
let localUrl = ''
let networkUrl = ''
let announced = false
let exited = false
let readyTimer

function preferredLanAddress() {
  try {
    const candidates = Object.entries(networkInterfaces()).flatMap(([name, addresses]) =>
      (addresses ?? [])
        .filter((address) => address.family === 'IPv4' && !address.internal)
        .map((address) => ({ name, address: address.address }))
    )
    const score = ({ name, address }) =>
      (/^(wl|en|eth)/i.test(name) ? 10 : 0) -
      (/^(docker|veth|br-|virbr|tun|tap|wg|tailscale)/i.test(name) ? 20 : 0) +
      (/^192\.168\./.test(address) ? 4 : /^10\./.test(address) ? 3 : /^172\.(1[6-9]|2\d|3[01])\./.test(address) ? 2 : 0)
    candidates.sort((a, b) => score(b) - score(a))
    return candidates[0]?.address ?? null
  } catch {
    return null
  }
}

function portIsOpen(host, port) {
  return new Promise((resolve) => {
    const socket = connect({ host, port })
    let settled = false
    const finish = (open) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(open)
    }
    socket.once('connect', () => finish(true))
    socket.once('error', () => finish(false))
    socket.setTimeout(400, () => finish(false))
  })
}

async function announceVisitUrl() {
  if (announced || exited || stopping) return
  const nextUrl = localUrl || networkUrl
  if (!nextUrl) return
  const parsed = new URL(nextUrl)
  const probeHost = ['localhost', '0.0.0.0', '[::]'].includes(parsed.hostname) ? '127.0.0.1' : parsed.hostname
  const probePort = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80))
  for (let attempt = 0; attempt < 40 && !exited && !stopping; attempt += 1) {
    if (await portIsOpen(probeHost, probePort)) break
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  if (exited || stopping || !await portIsOpen(probeHost, probePort)) return
  const configuredHost = process.env.QUIZ_JOIN_HOST?.trim()
  const host = configuredHost && /^[a-z\d.-]+$/i.test(configuredHost)
    ? configuredHost
    : preferredLanAddress() || (networkUrl ? new URL(networkUrl).hostname : parsed.hostname)
  process.stdout.write(`Visit: ${parsed.protocol}//${host}${parsed.port ? `:${parsed.port}` : ''}\n`)
  announced = true
}

for (const stream of [child.stdout, child.stderr]) {
  readline.createInterface({ input: stream }).on('line', (line) => {
    const plain = line.replace(ansi, '').trim()
    localUrl ||= plain.match(/\bLocal:\s*(https?:\/\/\S+)/i)?.[1] ?? ''
    networkUrl ||= plain.match(/\bNetwork:\s*(https?:\/\/\S+)/i)?.[1] ?? ''
    // Next may print "Ready" just before reporting a competing dev server lock.
    if (/\bReady in\b/i.test(plain) && !readyTimer) readyTimer = setTimeout(() => { void announceVisitUrl() }, 1800)
    if (errorLine.test(plain)) showingError = true
    if (showingError) process.stderr.write(`${line}\n`)
    if (showingError && !plain) showingError = false
  })
}

child.on('error', (error) => {
  exited = true
  clearTimeout(readyTimer)
  process.stderr.write(`${error.message}\n`)
  process.exitCode = 1
})
child.on('exit', (code, signal) => {
  exited = true
  clearTimeout(readyTimer)
  if (code && !showingError && !stopping) process.stderr.write(`Next.js exited with code ${code}.\n`)
  process.exitCode = stopping ? 0 : code ?? (signal ? 1 : 0)
})
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { stopping = true; child.kill(signal) })
}
