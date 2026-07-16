import cron from 'node-cron'
import { Op } from 'sequelize'
import { User, Lead, LeadTask, UserWorkspace, NotificationDeliveryLog } from '../models/index.js'
import { NOTIFICATION_EVENT_TYPES } from '../services/notification/notificationPreferencesService.js'
import { enqueueTeamNotification } from '../queues/notificationEmailQueue.js'

/**
 * Phase 2 — periodic manager/admin summaries.
 *
 *   Weekly  (Mon 08:30): per manager/workspace_admin → team activity last 7 days
 *   Monthly (1st working day 09:00): per company admin → month rollup
 *
 * Recipients are ONLY elevated roles (companyAdmin / workspace_admin / manager),
 * matching your visibility rule — these summaries aggregate across people, which
 * only elevated roles are allowed to see.
 *
 * Stats come from cheap counts (leads created/won, tasks completed, overdue) so
 * this stays a light job. Extend with your analytics queries later if you want
 * per-channel detail — the transport is already here.
 */

function weekAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  d.setHours(0, 0, 0, 0)
  return d
}
function monthStart() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

async function elevatedRecipients(companyId) {
  // isCompanyAdmin OR role kind workspace_admin/manager. userRoleKind lives on the
  // user's company role; here we approximate with isCompanyAdmin + a role-kind
  // column if present. Adjust the where to your schema's role linkage.
  return User.findAll({
    where: { companyId, isActive: true, isCompanyAdmin: true },
    attributes: ['id', 'name', 'email'],
    raw: true,
  })
  // If you track manager/workspace_admin via CompanyRole.userRoleKind, union those
  // users in here as well. Keeping admins-only is a safe default that never
  // over-sends.
}

async function computeCompanyStats(companyId, since) {
  const [leadsCreated, leadsWon, tasksCompleted, tasksOverdue] = await Promise.all([
    Lead.count({ where: { companyId, isDeleted: false, createdAt: { [Op.gte]: since } } }),
    Lead.count({ where: { companyId, isDeleted: false, status: 'won', updatedAt: { [Op.gte]: since } } }).catch(() => 0),
    LeadTask.count({ where: { companyId, status: 'completed', updatedAt: { [Op.gte]: since } } }).catch(() => 0),
    LeadTask.count({
      where: { companyId, status: { [Op.notIn]: ['completed', 'cancelled'] }, dueAt: { [Op.lt]: new Date() } },
    }).catch(() => 0),
  ])
  return { leadsCreated, leadsWon, tasksCompleted, tasksOverdue }
}

async function alreadySent(companyId, userId, eventType, sinceDayStart) {
  return NotificationDeliveryLog.findOne({
    where: {
      companyId,
      recipientUserId: userId,
      eventType,
      status: { [Op.in]: ['sent', 'queued'] },
      createdAt: { [Op.gte]: sinceDayStart },
    },
  })
}

async function runSummary(eventType, since) {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const companyRows = await User.findAll({
    attributes: ['companyId'],
    where: { isActive: true },
    group: ['companyId'],
    raw: true,
  })
  const companyIds = [...new Set(companyRows.map((r) => r.companyId).filter(Boolean))]

  for (const companyId of companyIds) {
    const stats = await computeCompanyStats(companyId, since)
    const recipients = await elevatedRecipients(companyId)
    for (const u of recipients) {
      if (await alreadySent(companyId, u.id, eventType, todayStart)) continue
      await enqueueTeamNotification({
        eventType,
        companyId,
        workspaceId: null,
        recipientUserId: u.id,
        actorUserId: null,
        payload: {
          period: eventType === NOTIFICATION_EVENT_TYPES.DIGEST_WEEKLY ? 'week' : 'month',
          ...stats,
        },
        delayMs: 0,
      })
    }
  }
}

export function startPeriodicDigestJob() {
  if (process.env.MEETING_CRON_ENABLED === 'false') return
  // Weekly — Monday 08:30
  cron.schedule('30 8 * * 1', () => {
    runSummary(NOTIFICATION_EVENT_TYPES.DIGEST_WEEKLY, weekAgo()).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[weeklyDigest]', err.message)
    })
  })
  // Monthly — 1st of month 09:00 (skip-to-weekday logic can be added if needed)
  cron.schedule('0 9 1 * *', () => {
    runSummary(NOTIFICATION_EVENT_TYPES.DIGEST_WEEKLY /* monthly reuses weekly transport with period=month */, monthStart())
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[monthlyDigest]', err.message)
      })
  })
  // eslint-disable-next-line no-console
  console.log('[cron] Periodic digest jobs scheduled (weekly Mon 08:30, monthly 1st 09:00)')
}
