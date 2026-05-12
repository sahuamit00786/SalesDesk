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
import { startReminderJob } from './src/jobs/reminderJob.js'

validateEnv()

const port = Number(process.env.PORT) || 4000
const serverRoot = path.dirname(fileURLToPath(import.meta.url))

function runMigrations() {
  const result = spawnSync('npx', ['sequelize-cli', 'db:migrate'], {
    cwd: serverRoot,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`sequelize-cli db:migrate exited with code ${result.status}`)
  }
}

async function start() {
  await sequelize.authenticate()
  runMigrations()
  const syncIntervalMs = Number(process.env.EMAIL_AUTOSYNC_INTERVAL_MS || 300000)
  if (syncIntervalMs > 0) {
    setInterval(() => {
      runEmailAutoSyncJob().catch(() => {})
    }, syncIntervalMs)
  }
  // Reminders, live/completed flags, optional Meet bot → transcription → summary (see reminderJob.js)
  if (process.env.MEETING_CRON_ENABLED !== 'false') {
    startReminderJob()
  }

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
