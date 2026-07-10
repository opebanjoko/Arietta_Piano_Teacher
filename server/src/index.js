/** Arietta sync API (SR-BCK-01..03). Plain node:http, JSON in and out. */
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'
import { openDb } from './db.js'
import { createHousehold, linkHousehold, pullSync, pushSync, deleteHousehold } from './routes.js'

const MAX_BODY = 512 * 1024

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    let settled = false
    req.setEncoding('utf8') // decode chunks as utf8 text, not per-chunk Buffers — a multibyte
    // char split across a chunk boundary must not get coerced into two mangled halves
    req.on('data', c => {
      if (settled) return
      data += c
      if (data.length > MAX_BODY) {
        settled = true
        req.destroy() // stop the stream so an oversized body can't keep buffering
        reject(new Error('too large'))
      }
    })
    req.on('end', () => { if (!settled) { settled = true; resolve(data) } })
    req.on('error', e => { if (!settled) { settled = true; reject(e) } })
  })
}

export function createApp({ db, now = () => Date.now(), allowOrigin = process.env.ALLOWED_ORIGIN ?? '*' }) {
  return createServer(async (req, res) => {
    res.setHeader('access-control-allow-origin', allowOrigin)
    res.setHeader('access-control-allow-headers', 'authorization, content-type')
    res.setHeader('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS')
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }

    let out
    try {
      const raw = await readBody(req)
      const body = raw ? JSON.parse(raw) : {}
      const token = (req.headers.authorization ?? '').replace(/^Bearer /, '') || null
      const deps = { db, now: now() }
      const r = { body, token }
      const key = `${req.method} ${req.url.split('?')[0]}`
      if (key === 'POST /households') out = createHousehold(deps, r)
      else if (key === 'POST /households/link') out = linkHousehold(deps, r)
      else if (key === 'GET /sync') out = pullSync(deps, r)
      else if (key === 'PUT /sync') out = pushSync(deps, r)
      else if (key === 'DELETE /households') out = deleteHousehold(deps, r)
      else out = { status: 404, body: { error: 'not found' } }
    } catch {
      out = { status: 400, body: { error: 'bad request' } }
    }
    res.writeHead(out.status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(out.body ?? {}))
  })
}

// Started directly (Railway): serve on PORT with the volume-backed db.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = openDb(process.env.DB_PATH ?? '/data/arietta.db')
  const port = Number(process.env.PORT ?? 8080)
  createApp({ db }).listen(port, () => console.log(`arietta api on :${port}`))
}
