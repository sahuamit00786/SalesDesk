/**
 * Truncates all application tables while keeping the global nav catalog (`menu_master`)
 * and migration history (`SequelizeMeta` / `sequelize_meta`).
 *
 * Usage (from repo root):
 *   npm run db:clean-except-menus -w server
 *   npm run db:clean-except-menus -w server -- --execute
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

/** Lowercased table names we never truncate */
const PRESERVE_LOWER = new Set(['menu_master', 'sequelize_meta', 'sequelizemeta'])

function normalizeTableName(row) {
  if (typeof row === 'string') return row
  return row.tableName || row.name || ''
}

function quoteIdent(name) {
  return '`' + String(name).replace(/`/g, '``') + '`'
}

async function main() {
  const execute = process.argv.includes('--execute')
  const { sequelize } = await import('../src/config/db.js')
  const qi = sequelize.getQueryInterface()
  const raw = await qi.showAllTables()
  const tables = raw.map(normalizeTableName).filter(Boolean)
  const toTruncate = tables.filter((t) => !PRESERVE_LOWER.has(String(t).toLowerCase()))

  console.log('Database:', process.env.DB_NAME)
  console.log('Preserving (case-insensitive): menu_master, SequelizeMeta')
  console.log('Tables to truncate:', toTruncate.length)
  for (const t of [...toTruncate].sort()) console.log('  -', t)

  if (!execute) {
    console.log('\nDry run. Pass --execute to truncate.')
    await sequelize.close()
    return
  }

  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0')
  try {
    for (const table of toTruncate) {
      await sequelize.query(`TRUNCATE TABLE ${quoteIdent(table)}`)
    }
  } finally {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1')
  }

  console.log('\nTruncated', toTruncate.length, 'tables. menu_master unchanged.')
  await sequelize.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
