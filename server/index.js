import './loadEnv.js'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { validateEnv } from './src/config/env.js'
import app from './src/app.js'
import { sequelize } from './src/config/db.js'
import { runEmailAutoSyncJob } from './src/controllers/leadsController.js'
import { startEmailTemplateWorker } from './src/queues/emailTemplateQueue.js'
import { startWorkflowTriggerWorker } from './src/queues/workflowTriggerQueue.js'
import { processWorkflowWakeups } from './src/services/workflowRunner.js'

validateEnv()

const port = Number(process.env.PORT) || 4000
const serverRoot = path.dirname(fileURLToPath(import.meta.url))

function runMigrations() {
  const runOnce = () =>
    spawnSync('npx', ['sequelize-cli', 'db:migrate'], {
      cwd: serverRoot,
      stdio: 'inherit',
      shell: true,
      env: process.env,
    })

  const first = runOnce()
  if (first.error) throw first.error
  if (first.status === 0) return

  // In watch mode, rapid restarts can race migrations.
  // Retry once so a transient duplicate-column failure can self-heal.
  const second = runOnce()
  if (second.error) throw second.error
  if (second.status !== 0) {
    throw new Error(`sequelize-cli db:migrate exited with code ${second.status}`)
  }
}

function maskApiKey(value) {
  if (!value) return null
  const v = String(value)
  if (v.length <= 8) return '***'
  return `${v.slice(0, 7)}…${v.slice(-4)} (len=${v.length})`
}

async function start() {
  await sequelize.authenticate()
  runMigrations()
  const openAiMasked = maskApiKey(process.env.OPENAI_API_KEY)
  // eslint-disable-next-line no-console
  console.log(
    openAiMasked
      ? `OpenAI key loaded from .env: ${openAiMasked} (model: ${process.env.OPENAI_MODEL || 'gpt-4o-mini'})`
      : 'OpenAI key missing — AI generation will fail until OPENAI_API_KEY is set in .env',
  )
  const syncIntervalMs = Number(process.env.EMAIL_AUTOSYNC_INTERVAL_MS || 300000)
  if (syncIntervalMs > 0) {
    setInterval(() => {
      runEmailAutoSyncJob().catch(() => {})
    }, syncIntervalMs)
  }
  startEmailTemplateWorker()
  startWorkflowTriggerWorker()
  setInterval(() => {
    processWorkflowWakeups().catch(() => {})
  }, 30000)
  const server = http.createServer(app)
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`LeadFlow API listening on http://localhost:${port}`)
  })
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', err.message)
  process.exit(1)
})
