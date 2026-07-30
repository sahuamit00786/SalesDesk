import cron from 'node-cron'
import { Op } from 'sequelize'
import {
  LeadTask,
  LeadFollowup,
  Meeting,
  MeetingParticipant,
  Company,
  UserWorkspace,
  NotificationDeliveryLog,
  Lead,
  Workspace,
} from '../models/index.js'
import {
  normalizeNotificationSettings,
  NOTIFICATION_EVENT_TYPES,
} from '../services/notification/notificationPreferencesService.js'
import { enqueueTeamNotification } from '../queues/notificationEmailQueue.js'
import { isCurrentlyClockTime, zonedDayBounds } from '../utils/timezone.js'

/**
 * Phase 2 — ONE combined daily digest per user, sent at the company's digest
 * hour (default 08:00). Replaces the temptation to send three separate morning
 * emails (tasks, followups, meetings) — that's the #1 cause of notification
 * fatigue. This supersedes the tasks-only `taskDigestNotificationJob` behavior:
 * keep that job file, but switch its scheduler off (see PHASE2_RUNBOOK) so only
 * this combined digest fires.
 *
 * Idempotent: NotificationDeliveryLog is checked so a restart within the same
 * minute/day never double-sends. Uses the existing DIGEST_DAILY event and the
 * existing enqueue → createNotification → socket+email pipeline.
 *
 * Recipient scoping honors your rule: this is per-user (each person gets THEIR
 * items only), so no elevated/own-only branching is needed — a user only ever
 * sees tasks/followups/meetings that are assigned to or involve them.
 */

function isDigestMinute(settings, now) {
  const d = settings.tasksDueToday // reuse the same hour/minute the admin already configured
  const hour = d?.digestHour ?? 8
  const minute = d?.digestMinute ?? 0
  const timezone = d?.timezone || 'UTC'
  // §1.6 of the bug audit: this used to be now.getHours()/getMinutes() — server-local
  // time regardless of what timezone the company configured.
  return isCurrentlyClockTime(now, hour, minute, timezone)
}

async function alreadySentToday(companyId, workspaceId, userId, dayStartUtc) {
  return NotificationDeliveryLog.findOne({
    where: {
      companyId,
      recipientUserId: userId,
      workspaceId,
      eventType: NOTIFICATION_EVENT_TYPES.DIGEST_DAILY,
      status: { [Op.in]: ['sent', 'queued'] },
      createdAt: { [Op.gte]: dayStartUtc },
    },
  })
}

export async function runDailyDigests() {
  const now = new Date()

  // One bulk query instead of a getCompanyNotificationSettings() DB call per company on
  // every single minute tick regardless of relevance (§7.3 of the bug audit — at 500
  // companies that was 500 queries/minute just to decide "not this minute" for almost all
  // of them). Settings only change when an admin edits them, so an in-process pass over
  // one bulk-fetched batch is exactly as correct and vastly cheaper.
  const companyRows = await Company.findAll({ attributes: ['id', 'notificationEmailSettings'] })
  const dueCompanies = companyRows
    .map((c) => ({ id: c.id, settings: normalizeNotificationSettings(c.notificationEmailSettings) }))
    .filter((c) => isDigestMinute(c.settings, now))
  if (!dueCompanies.length) return

  for (const { id: companyId, settings } of dueCompanies) {
    // "Today" as observed in the company's configured timezone, not the server's.
    const { start, end } = zonedDayBounds(now, settings.tasksDueToday?.timezone || 'UTC')
    // Meeting has no companyId column — scope it via the company's workspace ids instead.
    const companyWorkspaceIds = (
      await Workspace.findAll({ where: { companyId }, attributes: ['id'] })
    ).map((w) => w.id)

    // Gather all three item types for the company, then group per user+workspace.
    const [tasks, followups, meetings] = await Promise.all([
      LeadTask.findAll({
        where: {
          companyId,
          assignedTo: { [Op.ne]: null },
          status: { [Op.notIn]: ['completed', 'cancelled'] },
          dueAt: { [Op.between]: [start, end] },
        },
        attributes: ['id', 'title', 'assignedTo', 'workspaceId'],
        raw: true,
      }),
      // LeadFollowup carries no assignee column — ownership flows through its lead.
      LeadFollowup.findAll({
        where: {
          companyId,
          status: { [Op.notIn]: ['done', 'cancelled'] },
          scheduledAt: { [Op.between]: [start, end] },
        },
        attributes: ['id', 'workspaceId', 'scheduledAt', 'leadId'],
        include: [{ model: Lead, as: 'lead', attributes: ['assignedTo'] }],
      }).catch(() => []),
      companyWorkspaceIds.length
        ? Meeting.findAll({
            where: { workspaceId: { [Op.in]: companyWorkspaceIds }, scheduledStart: { [Op.between]: [start, end] } },
            attributes: ['id', 'title', 'workspaceId', 'scheduledStart'],
            include: [{ model: MeetingParticipant, as: 'participants', attributes: ['userId'] }],
          }).catch(() => [])
        : [],
    ])

    // key = userId:workspaceId → { tasks, followups, meetings }
    const bucket = new Map()
    const put = (userId, workspaceId, kind, item) => {
      if (!userId) return
      const key = `${userId}:${workspaceId || ''}`
      if (!bucket.has(key)) bucket.set(key, { tasks: [], followups: [], meetings: [] })
      bucket.get(key)[kind].push(item)
    }

    for (const t of tasks) put(t.assignedTo, t.workspaceId, 'tasks', t)
    for (const f of followups) put(f.lead?.assignedTo, f.workspaceId, 'followups', f)
    for (const m of meetings) {
      for (const p of m.participants || []) put(p.userId, m.workspaceId, 'meetings', { id: m.id, title: m.title })
    }

    for (const [key, items] of bucket) {
      const total = items.tasks.length + items.followups.length + items.meetings.length
      if (!total) continue
      const [userId, workspaceId] = key.split(':')

      const membership = await UserWorkspace.findOne({ where: { userId, workspaceId } })
      if (!membership) continue
      if (await alreadySentToday(companyId, workspaceId, userId, start)) continue

      await enqueueTeamNotification({
        eventType: NOTIFICATION_EVENT_TYPES.DIGEST_DAILY,
        companyId,
        workspaceId,
        recipientUserId: userId,
        actorUserId: null,
        payload: {
          taskCount: items.tasks.length,
          followupCount: items.followups.length,
          meetingCount: items.meetings.length,
          taskTitles: items.tasks.map((t) => t.title).filter(Boolean).slice(0, 8),
          meetingTitles: items.meetings.map((m) => m.title).filter(Boolean).slice(0, 8),
        },
        delayMs: 0,
      })
    }
  }
}

let dailyDigestTickInFlight = false

export function startDailyDigestJob() {
  if (process.env.MEETING_CRON_ENABLED === 'false') return
  cron.schedule('* * * * *', () => {
    // §2.6 of the bug audit — overlap guard, same reasoning as reminderJob: if the minute
    // where many companies share a digest hour takes over 60s, the next tick must not
    // start processing the same companies again.
    if (dailyDigestTickInFlight) return
    dailyDigestTickInFlight = true
    runDailyDigests()
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[dailyDigestJob]', err.message)
      })
      .finally(() => {
        dailyDigestTickInFlight = false
      })
  })
  // eslint-disable-next-line no-console
  console.log('[cron] Daily digest job scheduled (fires at company digest hour)')
}
