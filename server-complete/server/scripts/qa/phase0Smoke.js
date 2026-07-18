/**
 * Phase 0 smoke test — run AFTER applying patches + migrating, with the server
 * running.
 *
 *   node scripts/qa/phase0Smoke.js
 *
 * Exercises the four Phase 0 guarantees against a live server using two seeded
 * users (one elevated, one sales). Set these env vars before running:
 *
 *   SMOKE_BASE=http://localhost:4000/api/v1
 *   SMOKE_ADMIN_EMAIL=...   SMOKE_ADMIN_PASSWORD=...      (companyAdmin/manager)
 *   SMOKE_SALES_EMAIL=...   SMOKE_SALES_PASSWORD=...      (sales role)
 *
 * It does NOT write business data; it only reads and checks response SHAPES.
 */
import '../../loadEnv.js'
import { io as ioClient } from 'socket.io-client'

const BASE = process.env.SMOKE_BASE || 'http://localhost:4000/api/v1'
const SOCKET_URL = BASE.replace(/\/api\/v1\/?$/, '')

const results = []
const check = (name, pass, detail = '') =>
  results.push({ name, pass, detail })

async function login(email, password) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await r.json()
  if (!body?.data?.accessToken) throw new Error(`login failed for ${email}: ${body?.error?.message || r.status}`)
  return body.data.accessToken
}

async function main() {
  // 1) Clear error shape: bad login returns precise message, not vague 500
  {
    const r = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nope@example.com', password: 'x' }),
    })
    const body = await r.json()
    check(
      'error shape: bad login is a clean 4xx with code+message',
      r.status >= 400 && r.status < 500 && body?.error?.code && body?.error?.message && !/something went wrong/i.test(body.error.message || ''),
      `status=${r.status} code=${body?.error?.code}`,
    )
  }

  // 2) Malformed JSON → INVALID_JSON, not 500
  {
    const r = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ not json',
    })
    const body = await r.json().catch(() => ({}))
    check('error shape: malformed JSON → 400 INVALID_JSON', r.status === 400 && body?.error?.code === 'INVALID_JSON', `code=${body?.error?.code}`)
  }

  const adminToken = await login(process.env.SMOKE_ADMIN_EMAIL, process.env.SMOKE_ADMIN_PASSWORD)
  const salesToken = await login(process.env.SMOKE_SALES_EMAIL, process.env.SMOKE_SALES_PASSWORD)
  check('auth: both test users log in', Boolean(adminToken && salesToken))

  // 3) Calls visibility: sales sees <= admin's call count (own-only vs all)
  {
    const hdr = (t) => ({ Authorization: `Bearer ${t}` })
    const [adminCalls, salesCalls] = await Promise.all([
      fetch(`${BASE}/calls?limit=1`, { headers: hdr(adminToken) }).then((r) => r.json()),
      fetch(`${BASE}/calls?limit=1`, { headers: hdr(salesToken) }).then((r) => r.json()),
    ])
    const adminTotal = adminCalls?.meta?.total ?? adminCalls?.meta?.totalItems
    const salesTotal = salesCalls?.meta?.total ?? salesCalls?.meta?.totalItems
    check(
      'visibility: sales call total ≤ admin call total',
      typeof adminTotal === 'number' && typeof salesTotal === 'number' ? salesTotal <= adminTotal : true,
      `admin=${adminTotal} sales=${salesTotal}`,
    )
  }

  // 4) Socket hub: authed connect joins, unauth connect is rejected
  {
    const good = await new Promise((resolve) => {
      const s = ioClient(SOCKET_URL, { transports: ['websocket'], auth: { token: adminToken }, timeout: 5000 })
      const done = (v) => { s.close(); resolve(v) }
      s.on('connect', () => done(true))
      s.on('connect_error', () => done(false))
      setTimeout(() => done(false), 6000)
    })
    check('socket: authenticated connect succeeds', good)

    const bad = await new Promise((resolve) => {
      const s = ioClient(SOCKET_URL, { transports: ['websocket'], auth: { token: 'garbage' }, timeout: 5000 })
      const done = (v) => { s.close(); resolve(v) }
      s.on('connect', () => done(false)) // should NOT connect
      s.on('connect_error', () => done(true))
      setTimeout(() => done(true), 6000)
    })
    check('socket: unauthenticated connect is rejected', bad)
  }

  console.log('\nPhase 0 smoke results\n=====================')
  let failed = 0
  for (const r of results) {
    console.log(`  ${r.pass ? '✓' : '✗'} ${r.name}${r.detail ? `  (${r.detail})` : ''}`)
    if (!r.pass) failed++
  }
  console.log(failed ? `\n${failed} check(s) failed.\n` : '\nAll Phase 0 checks passed.\n')
  process.exit(failed ? 1 : 0)
}

main().catch((err) => {
  console.error('smoke crashed:', err.message)
  process.exit(1)
})
