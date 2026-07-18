import cron from 'node-cron'
import { Op } from 'sequelize'
import { Meeting } from '../models/Meeting.js'
import { Lead, LeadFollowup, ActivityReminder, Activity, User } from '../models/index.js'
import { notifyMeetingParticipants } from '../services/notification/meetingNotificationService.js'
import { notifyFollowupDue, notifyMeetingReminderInternal } from '../services/notification/teamNotificationService.js'
import { enqueueTeamNotification } from '../queues/notificationEmailQueue.js'
import { NOTIFICATION_EVENT_TYPES } from '../services/notification/notificationPreferencesService.js'

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


export function startReminderJob() {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date()

      // --- Mark LIVE ---
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

      // --- Reminders (next 10 minutes) ---
      const tenMinLater = new Date(now.getTime() + 10 * 60 * 1000)
      const upcomingMeetings = await Meeting.findAll({
        where: {
          status: 'scheduled',
          scheduledStart: { [Op.between]: [now, tenMinLater] },
        },
      })
      for (const meeting of upcomingMeetings) {
        await sendReminder(meeting)
      }

      // --- Follow-up reminders (fire once when due) ---
      const dueFollowups = await LeadFollowup.findAll({
        where: {
          status: 'pending',
          notifiedAt: null,
          scheduledAt: { [Op.lte]: now },
        },
        include: [{ model: Lead, as: 'lead', attributes: ['id', 'contactName', 'title', 'assignedTo', 'companyId', 'workspaceId'] }],
      })
      for (const followup of dueFollowups) {
        const lead = followup.lead
        if (!lead) continue
        const recipients = new Set()
        if (followup.createdBy) recipients.add(followup.createdBy)
        if (lead.assignedTo) recipients.add(lead.assignedTo)
        for (const recipientUserId of recipients) {
          notifyFollowupDue({
            companyId: lead.companyId,
            workspaceId: followup.workspaceId || lead.workspaceId,
            recipientUserId,
            leadId: lead.id,
            leadName: lead.contactName || lead.title || 'Lead',
            scheduledAt: followup.scheduledAt,
            remark: followup.remark,
          }).catch(() => {})
        }
        await followup.update({ notifiedAt: now })
      }

      // --- Call reminders (T-15 min), fire once per reminder ---
      const in15 = new Date(now.getTime() + 15 * 60 * 1000)
      const dueCallReminders = await ActivityReminder.findAll({
        where: {
          remindAt: { [Op.between]: [now, in15] },
          sentAt: null,
        },
        include: [{ model: Activity, as: 'activity', where: { type: 'call' }, required: true }],
      })
      for (const rem of dueCallReminders) {
        const act = rem.activity
        let callWorkspaceId = null
        if (act?.leadId) {
          const leadRow = await Lead.findByPk(act.leadId, { attributes: ['workspaceId'] })
          callWorkspaceId = leadRow?.workspaceId || null
        }
        await enqueueTeamNotification({
          eventType: NOTIFICATION_EVENT_TYPES.CALL_REMINDER,
          companyId: rem.companyId,
          workspaceId: callWorkspaceId,
          recipientUserId: act?.userId || rem.createdBy,
          actorUserId: null,
          payload: { activityId: act?.id, leadId: act?.leadId, remindAt: rem.remindAt },
          delayMs: 0,
        })
        await rem.update({ sentAt: new Date() })
      }

      // --- Missed follow-up escalation to the rep's manager, once per day at 18:00 ---
      if (now.getHours() === 18 && now.getMinutes() === 0) {
        const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        const overdueFollowups = await LeadFollowup.findAll({
          where: {
            status: { [Op.notIn]: ['done', 'cancelled'] },
            scheduledAt: { [Op.lt]: cutoff },
          },
          include: [{ model: Lead, as: 'lead', attributes: ['id', 'assignedTo', 'workspaceId', 'companyId'] }],
        })
        const byManager = new Map()
        for (const f of overdueFollowups) {
          const repId = f.lead?.assignedTo
          if (!repId) continue
          const rep = await User.findByPk(repId, { attributes: ['id', 'managerId'] })
          if (!rep?.managerId) continue
          const key = `${rep.managerId}:${f.lead.workspaceId || ''}:${f.lead.companyId}`
          if (!byManager.has(key)) {
            byManager.set(key, { count: 0, companyId: f.lead.companyId, workspaceId: f.lead.workspaceId, managerId: rep.managerId })
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

      // --- Mark COMPLETED ---
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
    } catch (e) {
      console.error('❌ Meeting cron failed:', e.message)
    }
  })

  console.log('[cron] Meeting job scheduled (* * * * *)')
}
