/**
 * Phase 0 preflight — run BEFORE applying patches / migrating.
 *
 *   node scripts/qa/phase0Preflight.js
 *
 * Read-only. Verifies the assumptions the Phase 0 changes rely on, so you find
 * schema/name mismatches on your machine instead of mid-deploy. Exits non-zero
 * if anything that would break a patch is wrong; warnings don't fail.
 *
 * Place this file at server/scripts/qa/phase0Preflight.js and run from the
 * server root (same cwd as `npm run db:migrate`).
 */
import '../../loadEnv.js'
import { sequelize } from '../../src/config/db.js'

const ok = (m) => console.log(`  ✓ ${m}`)
const warn = (m) => console.log(`  ⚠ ${m}`)
const fail = (m) => {
  console.log(`  ✗ ${m}`)
  process.exitCode = 1
}

async function columnsOf(table) {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t`,
    { replacements: { t: table } },
  )
  return new Set(rows.map((r) => r.COLUMN_NAME))
}

async function main() {
  console.log('\nPhase 0 preflight\n=================')

  await sequelize.authenticate()
  ok('database reachable')

  // MySQL 8+ (migration uses REGEXP_REPLACE)
  const [[v]] = await sequelize.query('SELECT VERSION() AS v')
  const version = v.v || ''
  const major = Number(String(version).split('.')[0])
  if (major >= 8) ok(`MySQL ${version} (REGEXP_REPLACE available)`)
  else fail(`MySQL ${version} — migration needs 8+ for REGEXP_REPLACE. Backfill phone_digits manually if on 5.7.`)

  // call_logs shape
  const callCols = await columnsOf('call_logs')
  if (!callCols.size) fail("table 'call_logs' not found — check tableName")
  else {
    ok("table 'call_logs' exists")
    callCols.has('owner_user_id')
      ? ok('call_logs.owner_user_id present (visibility patch will work as written)')
      : fail('call_logs.owner_user_id MISSING — adjust the getCalls visibility patch to your creator column')
    callCols.has('device_call_key')
      ? warn('call_logs.device_call_key already exists — migration may have run; skip re-adding')
      : ok('call_logs.device_call_key absent — migration will add it')
  }

  // leads shape
  const leadCols = await columnsOf('leads')
  if (!leadCols.size) fail("table 'leads' not found")
  else {
    ok("table 'leads' exists")
    leadCols.has('phone') && leadCols.has('alt_phone')
      ? ok('leads.phone + leads.alt_phone present (backfill will populate digits)')
      : warn('leads.alt_phone missing — migration backfill of alt_phone_digits will be null; fine')
    ;['phone_digits', 'alt_phone_digits'].forEach((c) =>
      leadCols.has(c)
        ? warn(`leads.${c} already exists — migration may have run`)
        : ok(`leads.${c} absent — migration will add it`),
    )
    leadCols.has('assigned_to') && leadCols.has('owner_user_id')
      ? ok('leads.assigned_to + owner_user_id present (call visibility subquery valid)')
      : fail('leads assignment columns missing — check Lead model field names')
  }

  // notifications shape (socket payload reads these)
  const notifCols = await columnsOf('notifications')
  ;['user_id', 'title', 'message', 'type', 'link', 'is_read', 'workspace_id'].forEach((c) =>
    notifCols.has(c) ? ok(`notifications.${c} present`) : fail(`notifications.${c} MISSING — socket serializer expects it`),
  )

  console.log(
    process.exitCode
      ? '\nRESULT: ✗ fix the ✗ items above before migrating.\n'
      : '\nRESULT: ✓ safe to apply Phase 0 patches and run db:migrate.\n',
  )
  await sequelize.close()
}

main().catch((err) => {
  console.error('preflight crashed:', err.message)
  process.exit(1)
})
