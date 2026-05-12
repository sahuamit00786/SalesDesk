import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const serverEnv = path.join(__dirname, '.env')
const rootEnv = path.join(__dirname, '..', '.env')

// Load both when present: server/.env first, then repo root .env overrides (matches "env in project root" docs).
if (fs.existsSync(serverEnv)) {
  dotenv.config({ path: serverEnv })
}
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv, override: true })
}
