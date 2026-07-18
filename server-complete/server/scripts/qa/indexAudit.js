/**
 * Phase 6 — index audit. Read-only. Reports which recommended composite indexes
 * for the hot list queries are present vs missing, and prints CREATE INDEX
 * statements for the gaps. It does NOT alter the schema — you review and apply
 * (or fold into a migration).
 *
 *   node scripts/qa/indexAudit.js
 *
 * The recommended set targets the queries that dominate list-endpoint latency:
 * lead lists, call history, notifications, activities, tasks, deals.
 */
import '../../loadEnv.js'
import { sequelize } from '../../src/config/db.js'

const RECOMMENDED = [
  { table: 'leads', cols: ['company_id', 'workspace_id', 'is_deleted', 'status'], name: 'idx_leads_ws_status' },
  { table: 'leads', cols: ['assigned_to'], name: 'idx_leads_assigned_to' },
  { table: 'leads', cols: ['owner_user_id'], name: 'idx_leads_owner' },
  { table: 'call_logs', cols: ['company_id', 'lead_id'], name: 'idx_calls_company_lead' },
  { table: 'call_logs', cols: ['owner_user_id'], name: 'idx_calls_owner' },
  { table: 'notifications', cols: ['user_id', 'is_read', 'created_at'], name: 'idx_notif_user_read' },
  { table: 'activities', cols: ['lead_id', 'created_at'], name: 'idx_activities_lead_created' },
  { table: 'lead_tasks', cols: ['company_id', 'workspace_id', 'status', 'due_at'], name: 'idx_tasks_ws_status_due' },
  { table: 'lead_tasks', cols: ['assigned_to'], name: 'idx_tasks_assigned' },
  { table: 'deals', cols: ['company_id', 'workspace_id', 'is_deleted', 'stage'], name: 'idx_deals_ws_stage' },
  { table: 'lead_followups', cols: ['assigned_to', 'scheduled_at'], name: 'idx_followups_assigned_sched' },
]

async function existingIndexes(table) {
  const [rows] = await sequelize
    .query(
      `SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t
       GROUP BY INDEX_NAME`,
      { replacements: { t: table } },
    )
    .catch(() => [[]])
  // Map of "col1,col2,..." → indexName (for prefix matching)
  const map = new Map()
  for (const r of rows) map.set(r.cols, r.INDEX_NAME)
  return map
}

function hasCoveringIndex(existingMap, cols) {
  const target = cols.join(',')
  for (const key of existingMap.keys()) {
    // A leading-prefix match is good enough for the query pattern.
    if (key === target || key.startsWith(target + ',') || target.startsWith(key + ',')) return existingMap.get(key)
  }
  // exact-set fallback (order-insensitive)
  const targetSet = new Set(cols)
  for (const key of existingMap.keys()) {
    const keyCols = key.split(',')
    if (keyCols.length === cols.length && keyCols.every((c) => targetSet.has(c))) return existingMap.get(key)
  }
  return null
}

async function main() {
  await sequelize.authenticate()
  console.log('\nIndex audit\n===========')
  const missing = []
  const byTable = {}
  for (const rec of RECOMMENDED) {
    byTable[rec.table] = byTable[rec.table] || (await existingIndexes(rec.table))
    const found = hasCoveringIndex(byTable[rec.table], rec.cols)
    if (found) {
      console.log(`  ✓ ${rec.table}(${rec.cols.join(', ')}) — covered by ${found}`)
    } else {
      console.log(`  ✗ ${rec.table}(${rec.cols.join(', ')}) — MISSING`)
      missing.push(rec)
    }
  }

  if (missing.length) {
    console.log('\nSuggested CREATE INDEX statements (review before applying):\n')
    for (const m of missing) {
      console.log(`  CREATE INDEX ${m.name} ON ${m.table} (${m.cols.join(', ')});`)
    }
    console.log('\nFold these into a migration; they are additive and online-safe on InnoDB.')
  } else {
    console.log('\nAll recommended indexes present.')
  }
  await sequelize.close()
}

main().catch((err) => {
  console.error('index audit failed:', err.message)
  process.exit(1)
})
