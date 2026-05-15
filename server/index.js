import './loadEnv.js'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { validateEnv } from './src/config/env.js'
import {
  isGoogleCalendarConfigured,
  missingGoogleOAuthEnvKeys,
} from './src/services/google/googleEnv.js'
import app from './src/app.js'
import { sequelize } from './src/config/db.js'
import { runEmailAutoSyncJob } from './src/controllers/leadsController.js'
import { renewDueGmailWatches } from './src/services/gmail/gmailPushService.js'
import { startEmailTemplateWorker } from './src/queues/emailTemplateQueue.js'
import { startWorkflowTriggerWorker } from './src/queues/workflowTriggerQueue.js'
import { processWorkflowWakeups } from './src/services/workflowRunner.js'
import { startReminderJob } from './src/jobs/reminderJob.js'
import { startAttendanceJob } from './src/jobs/attendanceJob.js'

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
  const gmailWatchRenewMs = Number(process.env.GMAIL_WATCH_RENEW_INTERVAL_MS || 43200000)
  if (gmailWatchRenewMs > 0) {
    setTimeout(() => {
      renewDueGmailWatches().catch(() => {})
    }, 15000)
    setInterval(() => {
      renewDueGmailWatches().catch(() => {})
    }, gmailWatchRenewMs)
  }
  startEmailTemplateWorker()
  startWorkflowTriggerWorker()
  setInterval(() => {
    processWorkflowWakeups().catch(() => {})
  }, 30000)
  // Reminders, live/completed flags, optional Meet bot → transcription → summary (see reminderJob.js)
  if (process.env.MEETING_CRON_ENABLED !== 'false') {
    startReminderJob()
  }
  startAttendanceJob()
  const server = http.createServer(app)
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`LeadFlow API listening on http://localhost:${port}`)
    if (isGoogleCalendarConfigured()) {
      // eslint-disable-next-line no-console
      console.log('Google Calendar / Meet: enabled')
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        'Google Calendar / Meet: disabled — missing .env:',
        missingGoogleOAuthEnvKeys().join(', '),
      )
    }
  })
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', err.message)
  process.exit(1)
})
