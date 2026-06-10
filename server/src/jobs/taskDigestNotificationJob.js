import cron from 'node-cron'
import { Op } from 'sequelize'
import { LeadTask, User, UserWorkspace, NotificationDeliveryLog } from '../models/index.js'
import {
  getCompanyNotificationSettings,
  NOTIFICATION_EVENT_TYPES,
} from '../services/notification/notificationPreferencesService.js'
import { enqueueTeamNotification } from '../queues/notificationEmailQueue.js'

function isDigestMinute(settings, now) {
  const digest = settings.tasksDueToday
  if (!digest?.enabled) return false
  return now.getHours() === digest.digestHour && now.getMinutes() === digest.digestMinute
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfToday() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

async function sendWorkspaceDigest({ companyId, workspaceId, userId, tasks }) {
  const dayStart = startOfToday()
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
  const dayStart = startOfToday()
  const dayEnd = endOfToday()

  const companies = await User.findAll({
    attributes: ['companyId'],
    where: { isActive: true },
    group: ['companyId'],
    raw: true,
  })
  const companyIds = [...new Set(companies.map((r) => r.companyId).filter(Boolean))]

  for (const companyId of companyIds) {
    const settings = await getCompanyNotificationSettings(companyId)
    if (!settings.tasksDueToday?.enabled) continue
    if (!isDigestMinute(settings, now)) continue

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
      })
    }
  }
}

export function startTaskDigestNotificationJob() {
  if (process.env.MEETING_CRON_ENABLED === 'false') return
  cron.schedule('* * * * *', () => {
    runTaskDueTodayDigests().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[taskDigestNotificationJob]', err.message)
    })
  })
}
