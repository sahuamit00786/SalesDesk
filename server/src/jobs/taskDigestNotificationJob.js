import cron from 'node-cron'
import { Op } from 'sequelize'
import { LeadTask, Company, UserWorkspace, NotificationDeliveryLog } from '../models/index.js'
import {
  normalizeNotificationSettings,
  NOTIFICATION_EVENT_TYPES,
} from '../services/notification/notificationPreferencesService.js'
import { enqueueTeamNotification } from '../queues/notificationEmailQueue.js'
import { notifyTaskOverdue } from '../services/notification/teamNotificationService.js'
import { isCurrentlyClockTime, zonedDayBounds } from '../utils/timezone.js'

function isDigestMinute(settings, now) {
  const digest = settings.tasksDueToday
  if (!digest?.enabled) return false
  // §1.6 of the bug audit — was server-local now.getHours()/getMinutes().
  return isCurrentlyClockTime(now, digest.digestHour, digest.digestMinute, digest.timezone || 'UTC')
}

async function sendWorkspaceDigest({ companyId, workspaceId, userId, tasks, dayStart }) {
  const alreadySent = await NotificationDeliveryLog.findOne({
    where: {
      companyId,
      recipientUserId: userId,
      workspaceId,
      eventType: NOTIFICATION_EVENT_TYPES.TASKS_DUE_TODAY,
      status: { [Op.in]: ['sent', 'queued'] },
      createdAt: { [Op.gte]: dayStart },
    },
  })
  if (alreadySent) return

  const taskCount = tasks.length
  const taskTitles = tasks.map((t) => t.title).filter(Boolean)
  await enqueueTeamNotification({
    eventType: NOTIFICATION_EVENT_TYPES.TASKS_DUE_TODAY,
    companyId,
    workspaceId,
    recipientUserId: userId,
    actorUserId: null,
    payload: { taskCount, taskTitles },
    delayMs: 0,
  })
}

export async function runTaskDueTodayDigests() {
  const now = new Date()

  // One bulk query instead of a settings DB call per company every minute regardless
  // of relevance (§7.3 of the bug audit).
  const companyRows = await Company.findAll({ attributes: ['id', 'notificationEmailSettings'] })
  const dueCompanies = companyRows
    .map((c) => ({ id: c.id, settings: normalizeNotificationSettings(c.notificationEmailSettings) }))
    .filter((c) => isDigestMinute(c.settings, now))
  if (!dueCompanies.length) return

  for (const { id: companyId, settings } of dueCompanies) {
    const { start: dayStart, end: dayEnd } = zonedDayBounds(now, settings.tasksDueToday?.timezone || 'UTC')
    const tasks = await LeadTask.findAll({
      where: {
        companyId,
        assignedTo: { [Op.ne]: null },
        status: { [Op.notIn]: ['completed', 'cancelled'] },
        dueAt: { [Op.between]: [dayStart, dayEnd] },
      },
      attributes: ['id', 'title', 'assignedTo', 'workspaceId'],
    })

    const byUserWorkspace = new Map()
    for (const task of tasks) {
      const key = `${task.assignedTo}:${task.workspaceId}`
      if (!byUserWorkspace.has(key)) byUserWorkspace.set(key, [])
      byUserWorkspace.get(key).push(task)
    }

    for (const [key, userTasks] of byUserWorkspace) {
      if (!userTasks.length) continue
      const [userId, workspaceId] = key.split(':')
      const membership = await UserWorkspace.findOne({
        where: { userId, workspaceId },
      })
      if (!membership) continue
      await sendWorkspaceDigest({
        companyId,
        workspaceId,
        userId,
        tasks: userTasks,
        dayStart,
      })
    }
  }
}

/** Phase 1 item #9 — one-time alert per task once it's overdue (not completed/cancelled). */
export async function runOverdueTaskAlerts() {
  const now = new Date()
  const overdueTasks = await LeadTask.findAll({
    where: {
      assignedTo: { [Op.ne]: null },
      status: { [Op.notIn]: ['completed', 'cancelled'] },
      dueAt: { [Op.lt]: now, [Op.ne]: null },
      overdueNotifiedAt: null,
    },
    attributes: ['id', 'title', 'assignedTo', 'workspaceId', 'companyId', 'leadId', 'dueAt'],
    limit: 500,
  })

  for (const task of overdueTasks) {
    try {
      await notifyTaskOverdue({
        companyId: task.companyId,
        workspaceId: task.workspaceId,
        recipientUserId: task.assignedTo,
        taskId: task.id,
        taskTitle: task.title,
        leadId: task.leadId,
        dueAt: task.dueAt,
      })
      // Only stamp once delivery actually ran — marking it on failure was silently
      // discarding the alert forever (overdueNotifiedAt stayed set, never retried).
      await task.update({ overdueNotifiedAt: now })
    } catch (e) {
      console.error('[taskDigestNotificationJob][overdue] notify failed, will retry next tick:', e?.message)
    }
  }
}

let taskDigestTickInFlight = false

export function startTaskDigestNotificationJob() {
  if (process.env.MEETING_CRON_ENABLED === 'false') return
  cron.schedule('* * * * *', () => {
    // §2.6 of the bug audit — overlap guard.
    if (taskDigestTickInFlight) return
    taskDigestTickInFlight = true
    runTaskDueTodayDigests()
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[taskDigestNotificationJob]', err.message)
      })
      .finally(() => {
        taskDigestTickInFlight = false
      })
  })
}

let overdueAlertsTickInFlight = false

/**
 * Independent of startTaskDigestNotificationJob (which Phase 2 stops scheduling
 * in favor of dailyDigestJob) — the overdue-task alert keeps running either way.
 */
export function startOverdueTaskAlertsJob() {
  if (process.env.MEETING_CRON_ENABLED === 'false') return
  cron.schedule('* * * * *', () => {
    // §2.6 of the bug audit — overlap guard: up to 500 tasks per tick, each doing a
    // notify + DB update, could plausibly run past the next minute's tick.
    if (overdueAlertsTickInFlight) return
    overdueAlertsTickInFlight = true
    runOverdueTaskAlerts()
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[taskDigestNotificationJob][overdue]', err.message)
      })
      .finally(() => {
        overdueAlertsTickInFlight = false
      })
  })
}
