import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
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

for (const stream of [child.stdout, child.stderr]) {
  readline.createInterface({ input: stream }).on('line', (line) => {
    const plain = line.replace(ansi, '').trim()
    if (errorLine.test(plain)) showingError = true
    if (showingError) process.stderr.write(`${line}\n`)
    if (showingError && !plain) showingError = false
  })
}

child.on('error', (error) => {
  process.stderr.write(`${error.message}\n`)
  process.exitCode = 1
})
child.on('exit', (code, signal) => {
  if (code && !showingError && !stopping) process.stderr.write(`Next.js exited with code ${code}.\n`)
  process.exitCode = stopping ? 0 : code ?? (signal ? 1 : 0)
})
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { stopping = true; child.kill(signal) })
}
