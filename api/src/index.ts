import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { roleRouter } from './routes/role.js'
import { matchRouter } from './routes/match.js'
import { candidateRouter } from './routes/candidate.js'

const app = new Hono()

app.use('*', logger())

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173']

app.use('*', cors({ origin: allowedOrigins }))

app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }))

app.route('/role', roleRouter)
app.route('/match', matchRouter)
app.route('/candidate', candidateRouter)

const port = parseInt(process.env.PORT ?? '3000')

serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`)
})

export default app
