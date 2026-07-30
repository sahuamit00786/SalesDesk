import cron from 'node-cron'
import { Op } from 'sequelize'
import { Meeting } from '../models/Meeting.js'
import { Lead, LeadFollowup, ActivityReminder, Activity, User, Reminder } from '../models/index.js'
import { notifyMeetingParticipants } from '../services/notification/meetingNotificationService.js'
import { notifyFollowupDue, notifyMeetingReminderInternal } from '../services/notification/teamNotificationService.js'
import { enqueueTeamNotification } from '../queues/notificationEmailQueue.js'
import { NOTIFICATION_EVENT_TYPES } from '../services/notification/notificationPreferencesService.js'
import { createNotification, notifyUserEmail } from '../services/notificationService.js'
import { escapeHtml } from '../services/mailService.js'
import { resolveDefaultWorkspaceIdForUser } from '../services/workspaceService.js'
import { primaryClientOrigin } from '../config/corsOrigins.js'

const REMINDER_TARGET_ROUTES = {
  task: '/tasks',
  lead: '/leads',
  opportunity: '/opportunities',
  meeting: '/meetings',
  followup: '/leads',
  general: '/calendar',
}

function reminderLink(reminder) {
  const base = REMINDER_TARGET_ROUTES[reminder.targetType] || '/calendar'
  return reminder.targetId && reminder.targetType !== 'task' ? `${base}/${reminder.targetId}` : base
}

function reminderEmailHtml(reminder) {
  const url = `${primaryClientOrigin}${reminderLink(reminder)}`
  return `
    <p>Reminder: <strong>${escapeHtml(reminder.title)}</strong></p>
    ${reminder.notes ? `<p>${escapeHtml(reminder.notes)}</p>` : ''}
    <p><a href="${escapeHtml(url)}">Open in LeadFlow</a></p>
  `
}

/** Fires reminders (general/lead/opportunity/meeting/task/followup) at their remindAt time, honoring each reminder's own push/email channel choice. */
async function sendDueReminders(now) {
  const dueReminders = await Reminder.findAll({
    where: {
      status: 'pending',
      notifiedAt: null,
      remindAt: { [Op.lte]: now },
    },
    limit: 500,
  })
  for (const reminder of dueReminders) {
    try {
      if (reminder.ownerUserId) {
        const user = await User.findByPk(reminder.ownerUserId, { attributes: ['id', 'name', 'email'] })
        if (user) {
          const workspaceId = reminder.workspaceId || (await resolveDefaultWorkspaceIdForUser(user.id, reminder.companyId))
          if (reminder.channelPush) {
            await createNotification({
              userId: user.id,
              companyId: reminder.companyId,
              workspaceId,
              title: 'Reminder',
              message: reminder.title,
              type: 'reminder_due',
              link: reminderLink(reminder),
            })
          }
          if (reminder.channelEmail) {
            await notifyUserEmail(user, `Reminder: ${reminder.title}`, reminderEmailHtml(reminder))
          }
        }
      }
      // Only stamp notified once delivery actually ran — a thrown error below skips this,
      // leaving notifiedAt null so the next tick retries instead of losing the reminder forever.
      await reminder.update({ notifiedAt: now })
    } catch (e) {
      console.error('[cron] reminder notify failed (will retry next tick):', e?.message)
    }
  }
}

async function sendReminder(meeting) {
  console.log(`Reminder sent for ${meeting.title}`)
  await notifyMeetingParticipants(meeting)

  // Notify the lead's assigned team member (internal in-app notification)
  if (meeting.leadId) {
    try {
      const lead = await Lead.findByPk(meeting.leadId, {
        attributes: ['assignedTo', 'workspaceId', 'companyId'],
      })
      if (lead?.assignedTo) {
        await notifyMeetingReminderInternal({
          companyId: lead.companyId,
          workspaceId: meeting.workspaceId || lead.workspaceId,
          recipientUserId: lead.assignedTo,
          meetingId: meeting.id,
          meetingTitle: meeting.title,
          scheduledStart: meeting.scheduledStart,
          meetLink: meeting.googleMeetLink,
        })
      }
    } catch (e) {
      console.error('[cron] meeting internal notify failed:', e?.message)
    }
  }
}

/** Used after meeting create — hook reserved for delayed jobs */
export async function scheduleReminders(_meeting) {
  return true
}

async function markLiveMeetings(now) {
  const liveMeetings = await Meeting.findAll({
    where: {
      status: 'scheduled',
      scheduledStart: { [Op.lte]: now },
      scheduledEnd: { [Op.gte]: now },
    },
  })
  for (const m of liveMeetings) {
    await m.update({ status: 'live' })
    console.log(`🔴 Meeting is LIVE: ${m.title}`)
  }
}

async function sendMeetingReminders(now) {
  const tenMinLater = new Date(now.getTime() + 10 * 60 * 1000)
  const upcomingMeetings = await Meeting.findAll({
    where: {
      status: 'scheduled',
      scheduledStart: { [Op.between]: [now, tenMinLater] },
      reminderSentAt: null,
    },
  })
  for (const meeting of upcomingMeetings) {
    try {
      await sendReminder(meeting)
      await meeting.update({ reminderSentAt: now })
    } catch (e) {
      console.error('[cron] meeting reminder failed (will retry next tick):', e?.message)
    }
  }
}

async function sendFollowupReminders(now) {
  const dueFollowups = await LeadFollowup.findAll({
    where: {
      status: 'pending',
      notifiedAt: null,
      scheduledAt: { [Op.lte]: now },
    },
    include: [{ model: Lead, as: 'lead', attributes: ['id', 'contactName', 'title', 'assignedTo', 'companyId', 'workspaceId'] }],
    limit: 500,
  })
  for (const followup of dueFollowups) {
    const lead = followup.lead
    if (!lead) continue
    try {
      const recipients = new Set()
      if (followup.createdBy) recipients.add(followup.createdBy)
      if (lead.assignedTo) recipients.add(lead.assignedTo)
      for (const recipientUserId of recipients) {
        await notifyFollowupDue({
          companyId: lead.companyId,
          workspaceId: followup.workspaceId || lead.workspaceId,
          recipientUserId,
          leadId: lead.id,
          leadName: lead.contactName || lead.title || 'Lead',
          scheduledAt: followup.scheduledAt,
          remark: followup.remark,
        })
      }
      await followup.update({ notifiedAt: now })
    } catch (e) {
      console.error('[cron] followup notify failed (will retry next tick):', e?.message)
    }
  }
}

async function sendCallReminders(now) {
  // Fire once remindAt has actually passed — matches the fire-once pattern used everywhere
  // else in this file. The prior [now, +15min] window fired up to 15 minutes early.
  const dueCallReminders = await ActivityReminder.findAll({
    where: {
      remindAt: { [Op.lte]: now },
      sentAt: null,
    },
    include: [{ model: Activity, as: 'activity', where: { type: 'call' }, required: true }],
    limit: 500,
  })
  for (const rem of dueCallReminders) {
    try {
      const act = rem.activity
      const recipientUserId = act?.userId || rem.createdBy
      let callWorkspaceId = null
      if (act?.leadId) {
        const leadRow = await Lead.findByPk(act.leadId, { attributes: ['workspaceId'] })
        callWorkspaceId = leadRow?.workspaceId || null
      }
      if (!callWorkspaceId) {
        callWorkspaceId = await resolveDefaultWorkspaceIdForUser(recipientUserId, rem.companyId)
      }
      await enqueueTeamNotification({
        eventType: NOTIFICATION_EVENT_TYPES.CALL_REMINDER,
        companyId: rem.companyId,
        workspaceId: callWorkspaceId,
        recipientUserId,
        actorUserId: null,
        payload: { activityId: act?.id, leadId: act?.leadId, remindAt: rem.remindAt },
        delayMs: 0,
      })
      await rem.update({ sentAt: new Date() })
    } catch (e) {
      console.error('[cron] call reminder failed (will retry next tick):', e?.message)
    }
  }
}

/** Runs on its own dedicated `0 18 * * *` schedule now (§2.4 of the bug audit) — it used
 *  to be an hour/minute check inside the shared per-minute tick, which meant any lag in
 *  an earlier section that minute silently skipped escalation for the entire day. */
async function escalateMissedFollowups() {
  const now = new Date()
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const overdueFollowups = await LeadFollowup.findAll({
    where: {
      status: { [Op.notIn]: ['done', 'cancelled'] },
      scheduledAt: { [Op.lt]: cutoff },
    },
    include: [{ model: Lead, as: 'lead', attributes: ['id', 'assignedTo', 'workspaceId', 'companyId'] }],
  })

  // One batch lookup instead of a User.findByPk per overdue followup (N+1).
  const repIds = [...new Set(overdueFollowups.map((f) => f.lead?.assignedTo).filter(Boolean))]
  const reps = repIds.length
    ? await User.findAll({ where: { id: repIds }, attributes: ['id', 'managerId'] })
    : []
  const managerIdByRep = new Map(reps.map((r) => [String(r.id), r.managerId]))

  const byManager = new Map()
  for (const f of overdueFollowups) {
    const repId = f.lead?.assignedTo
    if (!repId) continue
    const managerId = managerIdByRep.get(String(repId))
    if (!managerId) continue
    const key = `${managerId}:${f.lead.workspaceId || ''}:${f.lead.companyId}`
    if (!byManager.has(key)) {
      byManager.set(key, { count: 0, companyId: f.lead.companyId, workspaceId: f.lead.workspaceId, managerId })
    }
    byManager.get(key).count += 1
  }
  for (const { count, companyId, workspaceId, managerId } of byManager.values()) {
    await enqueueTeamNotification({
      eventType: NOTIFICATION_EVENT_TYPES.FOLLOWUP_DUE,
      companyId,
      workspaceId,
      recipientUserId: managerId,
      actorUserId: null,
      payload: { escalation: true, overdueCount: count },
      delayMs: 0,
    })
  }
}

async function markCompletedMeetings(now) {
  const completedMeetings = await Meeting.findAll({
    where: {
      status: { [Op.in]: ['scheduled', 'live'] },
      scheduledEnd: { [Op.lt]: now },
    },
  })
  for (const meeting of completedMeetings) {
    await meeting.update({ status: 'completed' })
    console.log(`✅ Meeting marked completed: ${meeting.title}`)
  }
}

/** Each section owns its own try/catch — one section throwing (e.g. an inline notification
 *  send with Redis down) must not skip the rest of the tick, especially "mark completed". */
async function runSection(name, fn, now) {
  try {
    await fn(now)
  } catch (e) {
    console.error(`❌ [cron] reminder section "${name}" failed:`, e?.message)
  }
}

let reminderTickInFlight = false

export function startReminderJob() {
  cron.schedule('* * * * *', async () => {
    // §2.6 of the bug audit: no overlap guard on a 1-minute cron with unbounded-ish work.
    // If a backlog builds (Redis outage, SMTP slowness) tick N+1 could start while tick N
    // is still working the same rows, double-sending everything. Same pattern already
    // used for the workflow wakeup poller (wakeupsInFlight).
    if (reminderTickInFlight) return
    reminderTickInFlight = true
    try {
      const now = new Date()
      await runSection('mark-live', markLiveMeetings, now)
      await runSection('meeting-reminders', sendMeetingReminders, now)
      await runSection('followup-reminders', sendFollowupReminders, now)
      await runSection('generic-reminders', sendDueReminders, now)
      await runSection('call-reminders', sendCallReminders, now)
      await runSection('mark-completed', markCompletedMeetings, now)
    } finally {
      reminderTickInFlight = false
    }
  })

  // Own schedule, not a comparison inside the shared per-minute tick — a slow earlier
  // section that minute could previously make this miss its one shot for the whole day.
  cron.schedule('0 18 * * *', async () => {
    try {
      await escalateMissedFollowups()
    } catch (e) {
      console.error('❌ [cron] missed-followup-escalation failed:', e?.message)
    }
  })

  console.log('[cron] Meeting job scheduled (* * * * *), escalation scheduled (0 18 * * *)')
}
