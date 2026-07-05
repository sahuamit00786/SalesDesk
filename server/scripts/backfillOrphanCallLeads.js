/**
 * One-time backfill: link orphan call logs (lead_id IS NULL) to existing leads
 * by matching phone numbers on their last 10 digits.
 *
 * Default: dry-run (prints what would link). Add --execute to apply.
 *
 * Usage:
 *   node scripts/backfillOrphanCallLeads.js
 *   node scripts/backfillOrphanCallLeads.js --execute
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const { sequelize } = await import('../src/config/db.js')
const { Op } = await import('sequelize')
const { CallLog, Lead } = await import('../src/models/index.js')

const dryRun = !process.argv.includes('--execute')

function phoneDigitsKey(value) {
  const digits = String(value || '').replace(/\D/g, '')
  return digits ? digits.slice(-10) : ''
}

const orphans = await CallLog.findAll({
  where: { leadId: null, phoneNumber: { [Op.ne]: null } },
  attributes: ['id', 'companyId', 'phoneNumber', 'workspaceId', 'callerName'],
})
console.log(`Orphan calls with a phone number: ${orphans.length}`)

const companyIds = [...new Set(orphans.map((c) => String(c.companyId)))]
const leads = await Lead.findAll({
  where: { companyId: { [Op.in]: companyIds }, isDeleted: false },
  attributes: ['id', 'companyId', 'title', 'phone', 'altPhone', 'workspaceId'],
  order: [['createdAt', 'DESC']],
})

// company -> phoneKey -> lead (first seen = newest lead wins)
const index = new Map()
for (const lead of leads) {
  for (const key of [phoneDigitsKey(lead.phone), phoneDigitsKey(lead.altPhone)]) {
    if (!key) continue
    const mapKey = `${lead.companyId}:${key}`
    if (!index.has(mapKey)) index.set(mapKey, lead)
  }
}

let linked = 0
for (const call of orphans) {
  const key = phoneDigitsKey(call.phoneNumber)
  if (!key) continue
  const lead = index.get(`${call.companyId}:${key}`)
  if (!lead) continue
  linked += 1
  console.log(`${dryRun ? '[dry-run] ' : ''}call ${call.id} (${call.phoneNumber}) -> lead "${lead.title}" (${lead.id})`)
  if (!dryRun) {
    await call.update({ leadId: lead.id, workspaceId: call.workspaceId || lead.workspaceId || null })
  }
}

console.log(`${dryRun ? 'Would link' : 'Linked'} ${linked} of ${orphans.length} orphan calls.`)
if (dryRun) console.log('Re-run with --execute to apply.')
await sequelize.close()
