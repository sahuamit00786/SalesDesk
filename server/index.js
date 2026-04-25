import './loadEnv.js'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { validateEnv } from './src/config/env.js'
import app from './src/app.js'
import { sequelize } from './src/config/db.js'

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
