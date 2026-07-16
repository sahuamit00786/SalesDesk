import { Op, fn, col } from 'sequelize'
import { Activity, CallLog, LeadEmailLog, LeadFollowup, LeadTask } from '../models/index.js'

function emptyEngagement() {
  return {
    calls: 0,
    callLogs: 0,
    emails: 0,
    emailLogs: 0,
    meetings: 0,
    notes: 0,
    tasks: 0,
    activities: 0,
    followups: 0,
  }
}

/**
 * Attach list-table engagement fields to Sequelize lead rows (mutates plain objects).
 */
export async function attachLeadListEngagement(rows, companyId) {
  const leadIds = rows.map((r) => r.id).filter(Boolean)
  if (!leadIds.length) return rows

  const emailSentRows = await LeadEmailLog.findAll({
    where: {
      companyId,
      leadId: leadIds,
      sentAt: { [Op.ne]: null },
    },
    attributes: ['leadId', [fn('MAX', col('sent_at')), 'lastSentAt']],
    group: ['leadId'],
    raw: true,
  })

  const callLogRows = await CallLog.findAll({
    where: { leadId: leadIds },
    attributes: ['leadId', [fn('COUNT', col('id')), 'count']],
    group: ['leadId'],
    raw: true,
  })

  const activityRows = await Activity.findAll({
    where: { leadId: leadIds },
    attributes: ['leadId', 'type', [fn('COUNT', col('id')), 'count']],
    group: ['leadId', 'type'],
    raw: true,
  })

  const taskRows = await LeadTask.findAll({
    where: { companyId, leadId: leadIds },
    attributes: ['leadId', [fn('COUNT', col('id')), 'count']],
    group: ['leadId'],
    raw: true,
  })

  const followupRows = await LeadFollowup.findAll({
    where: { leadId: leadIds },
    attributes: ['leadId', [fn('COUNT', col('id')), 'count']],
    group: ['leadId'],
    raw: true,
  })

  const emailSentByLead = new Map(emailSentRows.map((r) => [String(r.leadId), r.lastSentAt]))
  const callLogsByLead = new Map(callLogRows.map((r) => [String(r.leadId), Number(r.count) || 0]))
  const tasksByLead = new Map(taskRows.map((r) => [String(r.leadId), Number(r.count) || 0]))
  const followupsByLead = new Map(followupRows.map((r) => [String(r.leadId), Number(r.count) || 0]))
  const engagementByLead = new Map()

  for (const id of leadIds) {
    engagementByLead.set(String(id), emptyEngagement())
  }

  for (const row of activityRows) {
    const lid = String(row.leadId)
    const bucket = engagementByLead.get(lid) || emptyEngagement()
    const n = Number(row.count) || 0
    bucket.activities += n
    const type = String(row.type || '').toLowerCase()
    if (type === 'call') bucket.calls += n
    else if (type === 'email') bucket.emails += n
    else if (type === 'meeting') bucket.meetings += n
    else if (type === 'note') bucket.notes += n
    else if (type === 'task') bucket.tasks += n
    engagementByLead.set(lid, bucket)
  }

  for (const [lid, count] of callLogsByLead) {
    const bucket = engagementByLead.get(lid) || emptyEngagement()
    bucket.callLogs = count
    bucket.calls += count
    engagementByLead.set(lid, bucket)
  }

  for (const [lid, count] of tasksByLead) {
    const bucket = engagementByLead.get(lid) || emptyEngagement()
    bucket.tasks = Math.max(bucket.tasks, count)
    engagementByLead.set(lid, bucket)
  }

  for (const [lid, count] of followupsByLead) {
    const bucket = engagementByLead.get(lid) || emptyEngagement()
    bucket.followups = count
    engagementByLead.set(lid, bucket)
  }

  for (const row of emailSentRows) {
    const lid = String(row.leadId)
    const bucket = engagementByLead.get(lid) || emptyEngagement()
    bucket.emailLogs += 1
    engagementByLead.set(lid, bucket)
  }

  return rows.map((row) => {
    const plain = typeof row.get === 'function' ? row.get({ plain: true }) : { ...row }
    const lid = String(plain.id)
    const engagement = engagementByLead.get(lid) || emptyEngagement()
    const emailSent = emailSentByLead.has(lid)
    const contacted =
      emailSent ||
      engagement.callLogs > 0 ||
      engagement.calls > 0 ||
      engagement.emails > 0 ||
      engagement.emailLogs > 0

    return {
      ...plain,
      emailSent,
      emailSentAt: emailSentByLead.get(lid) || null,
      contacted,
      engagement,
    }
  })
}
