import crypto from 'node:crypto'
import express from 'express'
import { config } from './config.js'
import { dumpBoardHtml } from './scrape.js'
import { runSync } from './sync.js'

const app = express()
app.use(express.json())

// Basic backoff so a leaked/guessed SYNC_API_KEY (or a retry-loop bug on the
// caller's side) can't hammer this endpoint — and, transitively, Kanboard's
// login — indefinitely.
const MAX_CONSECUTIVE_AUTH_FAILURES = 5
const BACKOFF_MS = 5 * 60 * 1000
let consecutiveAuthFailures = 0
let backoffUntil = 0

function constantTimeEquals(a, b) {
  const bufA = crypto.createHash('sha256').update(a).digest()
  const bufB = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(bufA, bufB)
}

function checkAuth(req, res) {
  if (Date.now() < backoffUntil) {
    res.status(429).json({ error_code: 'internal' })
    return false
  }

  const header = req.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const ok = token.length > 0 && constantTimeEquals(token, config.syncApiKey)

  if (!ok) {
    consecutiveAuthFailures += 1
    if (consecutiveAuthFailures >= MAX_CONSECUTIVE_AUTH_FAILURES) {
      backoffUntil = Date.now() + BACKOFF_MS
    }
    res.status(401).json({ error_code: 'internal' })
    return false
  }

  consecutiveAuthFailures = 0
  return true
}

app.get('/health', (_req, res) => res.json({ ok: true }))

app.post('/sync', async (req, res) => {
  if (!checkAuth(req, res)) return

  try {
    // runSync() single-flights via the DB lock (qplaze_sync_lock) — that's
    // the actual cross-request/cross-process guarantee. A second request
    // arriving while one is in progress gets `error_code: 'lock_busy'` back
    // from runSync() itself, not rejected here.
    const result = await runSync()
    res.status(200).json(result)
  } catch {
    // runSync() is designed to never throw (it catches internally and
    // returns an error_code) — this is a last-resort guard only.
    console.error('qplaze-sync-worker: unexpected /sync failure')
    res.status(500).json({ error_code: 'internal' })
  }
})

// TEMPORARY debug route — remove once scrape.js's SELECTORS are confirmed
// working against the real Kanboard instance. Returns raw page HTML, so
// it's bearer-protected same as /sync, but must not stay in production.
app.get('/debug-html', async (req, res) => {
  if (!checkAuth(req, res)) return
  try {
    const result = await dumpBoardHtml()
    res.status(200).json(result)
  } catch {
    res.status(500).json({ error_code: 'internal' })
  }
})

export function startServer() {
  return app.listen(config.port, () => {
    console.log(`qplaze-sync-worker listening on :${config.port}`)
  })
}
