import cron from 'node-cron'
import { Op } from 'sequelize'
import { Meeting } from '../models/Meeting.js'
import { Lead, LeadFollowup } from '../models/index.js'
import { notifyMeetingParticipants } from '../services/notification/meetingNotificationService.js'
import { notifyFollowupDue, notifyMeetingReminderInternal } from '../services/notification/teamNotificationService.js'

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

      // --- Follow-up reminders (due in 14–15 minutes) ---
      const fu14 = new Date(now.getTime() + 14 * 60 * 1000)
      const fu15 = new Date(now.getTime() + 15 * 60 * 1000)
      const dueFollowups = await LeadFollowup.findAll({
        where: {
          status: 'pending',
          scheduledAt: { [Op.between]: [fu14, fu15] },
        },
        include: [{ model: Lead, as: 'lead', attributes: ['id', 'contactName', 'title', 'assignedTo', 'companyId', 'workspaceId'] }],
      })
      for (const followup of dueFollowups) {
        const lead = followup.lead
        if (!lead?.assignedTo) continue
        notifyFollowupDue({
          companyId: lead.companyId,
          workspaceId: followup.workspaceId || lead.workspaceId,
          recipientUserId: lead.assignedTo,
          leadId: lead.id,
          leadName: lead.contactName || lead.title || 'Lead',
          scheduledAt: followup.scheduledAt,
          remark: followup.remark,
        }).catch(() => {})
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
