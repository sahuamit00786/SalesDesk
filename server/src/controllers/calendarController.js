import { Op } from 'sequelize'
import { Meeting } from '../models/Meeting.js'
import { MeetingParticipant } from '../models/MeetingParticipant.js'
import { LeadTask } from '../models/LeadTask.js'
import { LeadTaskSubtask } from '../models/LeadTaskSubtask.js'
import { LeadFollowup } from '../models/LeadFollowup.js'
import { Lead } from '../models/Lead.js'
import { Reminder } from '../models/Reminder.js'
import { User } from '../models/User.js'
import { promotePendingTasksByDueOrStart } from '../services/leadTaskAutoStatusService.js'

// Color mappings for different event types
const EVENT_COLORS = {
  meeting: {
    demo: '#6366f1',
    follow_up: '#8b5cf6',
    closing: '#ec4899',
    internal: '#10b981',
  },
  task: {
    low: '#fbbf24',
    medium: '#f59e0b',
    high: '#ef4444',
  },
  followup: {
    pending: '#10b981',
    done: '#6b7280',
    cancelled: '#9ca3af',
  },
  opportunity: {
    default: '#8b5cf6',
  },
  reminder: {
    default: '#f43f5e',
  },
}

/**
 * Normalize a date to start of day
 */
function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Normalize a date to end of day
 */
function endOfDay(date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function getLeadDisplayName(lead) {
  if (!lead) return null
  return lead.contactName || lead.title || lead.company || lead.email || null
}

const CALENDAR_SEGMENT_MINS = 30

/**
 * react-big-calendar month view often omits all-day events when start === end (zero duration).
 * A short timed window keeps month/week/day consistent while still representing one moment in the UI.
 */
function calendarSegmentWindow(at) {
  if (!at) return { start: at, end: at, allDay: true }
  const start = at instanceof Date ? new Date(at.getTime()) : new Date(at)
  if (Number.isNaN(start.getTime())) return { start: at, end: at, allDay: true }
  const end = new Date(start.getTime() + CALENDAR_SEGMENT_MINS * 60 * 1000)
  return { start, end, allDay: false }
}

/**
 * Treat legacy role_id=0 and company admins as superadmin scope.
 */
function isSuperAdmin(user) {
  const roleId = user?.roleId ?? user?.role_id ?? null
  return (
    Boolean(user?.isCompanyAdmin) ||
    roleId === 0 ||
    roleId === '0' ||
    user?.role === 'company_admin' ||
    user?.role === 'superadmin'
  )
}

/**
 * List all calendar events (meetings, tasks, followups, opportunities, reminders)
 * GET /calendar/events
 */
export async function listEvents(req, res) {
  try {
    const {
      from,
      to,
      types = ['meeting', 'task', 'followup', 'opportunity', 'reminder'],
      ownerUserId,
      leadId,
      opportunityId,
    } = req.query

    const companyId = req.company?.id || req.user?.companyId
    const workspaceId = req.headers['x-workspace-id']

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' })
    }

    const dateFrom = from ? new Date(from) : startOfDay(new Date())
    const dateTo = to ? new Date(to) : endOfDay(new Date())

    const requestedTypes = Array.isArray(types)
      ? types
      : String(types || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
    const superAdmin = isSuperAdmin(req.user)
    const effectiveOwnerUserId = superAdmin ? null : ownerUserId || req.user?.id
    const events = []

    // Fetch meetings
    if (requestedTypes.includes('meeting')) {
      const meetingWhere = {
        workspaceId,
        scheduledStart: {
          [Op.gte]: dateFrom,
          [Op.lte]: dateTo,
        },
      }
      if (effectiveOwnerUserId) meetingWhere.ownerUserId = effectiveOwnerUserId
      if (leadId) meetingWhere.leadId = leadId

      const meetings = await Meeting.findAll({
        where: meetingWhere,
        include: [
          {
            model: MeetingParticipant,
            as: 'participants',
            attributes: ['userId', 'role'],
          },
          {
            model: Lead,
            attributes: ['id', 'contactName', 'title', 'company', 'email'],
          },
        ],
      })

      for (const m of meetings) {
        events.push({
          id: `meeting-${m.id}`,
          source: 'meeting',
          sourceId: m.id,
          title: m.title,
          start: m.scheduledStart,
          end: m.scheduledEnd,
          allDay: false,
          kind: 'meeting',
          status: m.status,
          color: EVENT_COLORS.meeting[m.meetingType] || EVENT_COLORS.meeting.demo,
          leadId: m.leadId,
          leadName: getLeadDisplayName(m.lead || m.Lead),
          ownerUserId: m.ownerUserId,
          ownerName: null,
          attendees: m.participants?.map(p => p.userId) || [],
          meta: {
            meetingType: m.meetingType,
            agenda: m.agenda,
            googleMeetLink: m.googleMeetLink,
            timezone: m.timezone,
            recordingStatus: m.recordingStatus ?? null,
            transcriptionStatus: m.transcriptionStatus ?? null,
            durationMinutes: m.durationMinutes ?? null,
          },
        })
      }
    }

    // Fetch tasks
    if (requestedTypes.includes('task')) {
      const taskWhere = {
        companyId,
        workspaceId,
        dueAt: {
          [Op.gte]: dateFrom,
          [Op.lte]: dateTo,
        },
      }
      if (effectiveOwnerUserId) taskWhere.assignedTo = effectiveOwnerUserId
      if (leadId) taskWhere.leadId = leadId

      const tasks = await LeadTask.findAll({
        where: taskWhere,
        include: [
          {
            model: Lead,
            as: 'lead',
            attributes: ['id', 'contactName', 'title', 'company', 'email'],
          },
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'name'],
          },
          {
            model: LeadTaskSubtask,
            as: 'subtasks',
            attributes: ['title', 'done', 'position'],
            separate: true,
            order: [['position', 'ASC']],
          },
        ],
      })

      await promotePendingTasksByDueOrStart(tasks, { companyId, workspaceId })

      for (const t of tasks) {
        const subtasks = Array.isArray(t.subtasks)
          ? t.subtasks.map((s) => ({ title: s.title, done: Boolean(s.done) }))
          : []
        events.push({
          id: `task-${t.id}`,
          source: 'task',
          sourceId: t.id,
          title: t.title,
          ...calendarSegmentWindow(t.dueAt),
          kind: 'task',
          status: t.status,
          color: EVENT_COLORS.task[t.priority] || EVENT_COLORS.task.medium,
          leadId: t.leadId,
          leadName: getLeadDisplayName(t.lead),
          ownerUserId: t.assignedTo,
          ownerName: t.assignee?.name || null,
          priority: t.priority,
          meta: {
            description: t.description,
            taskType: t.taskType,
            subtasks,
            attachments: Array.isArray(t.attachments) ? t.attachments : [],
          },
        })
      }
    }

    // Fetch followups
    if (requestedTypes.includes('followup')) {
      const followupWhere = {
        companyId,
        workspaceId,
        scheduledAt: {
          [Op.gte]: dateFrom,
          [Op.lte]: dateTo,
        },
      }
      if (leadId) followupWhere.leadId = leadId
      // LeadFollowup has no ownerUserId/assignedTo, filter by createdBy for non-superadmins.
      if (effectiveOwnerUserId) followupWhere.createdBy = effectiveOwnerUserId

      const followups = await LeadFollowup.findAll({
        where: followupWhere,
        include: [
          {
            model: Lead,
            as: 'lead',
            attributes: ['id', 'contactName', 'title', 'company', 'email'],
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name'],
          },
        ],
      })

      for (const f of followups) {
        events.push({
          id: `followup-${f.id}`,
          source: 'followup',
          sourceId: f.id,
          title: f.remark || 'Follow-up',
          ...calendarSegmentWindow(f.scheduledAt),
          kind: 'followup',
          status: f.status,
          color: EVENT_COLORS.followup[f.status] || EVENT_COLORS.followup.pending,
          leadId: f.leadId,
          leadName: getLeadDisplayName(f.lead),
          ownerUserId: f.createdBy,
          ownerName: f.creator?.name || null,
          meta: {
            remark: f.remark,
            quickPickMinutes: f.quickPickMinutes,
          },
        })
      }
    }

    // Pipeline deals: leads flagged as opportunities
    if (requestedTypes.includes('opportunity')) {
      const oppWhere = {
        companyId,
        workspaceId,
        isDeleted: false,
        isOpportunity: true,
      }
      if (opportunityId) oppWhere.id = opportunityId
      else if (leadId) oppWhere.id = leadId
      if (effectiveOwnerUserId) oppWhere.assignedTo = effectiveOwnerUserId

      const opps = await Lead.findAll({
        where: oppWhere,
        include: [
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'name'],
          },
        ],
        limit: 100,
      })

      for (const o of opps) {
        const eventDate = o.createdAt
        if (eventDate < dateFrom || eventDate > dateTo) continue
        const companyLabel = (o.company || '').trim() || 'Deal'
        events.push({
          id: `opportunity-${o.id}`,
          source: 'opportunity',
          sourceId: o.id,
          title: `${companyLabel} - ${o.value ? `$${o.value}` : 'Deal'}`,
          ...calendarSegmentWindow(eventDate),
          kind: 'opportunity',
          status: o.opportunityStage,
          color: EVENT_COLORS.opportunity.default,
          leadId: o.id,
          leadName: getLeadDisplayName(o),
          opportunityId: o.id,
          opportunityName: companyLabel,
          ownerUserId: o.assignedTo,
          ownerName: o.assignee?.name || null,
          meta: {
            dealValue: o.value,
            stage: o.opportunityStage,
          },
        })
      }
    }

    // Fetch reminders
    if (requestedTypes.includes('reminder')) {
      const reminderWhere = {
        companyId,
        workspaceId,
        remindAt: {
          [Op.gte]: dateFrom,
          [Op.lte]: dateTo,
        },
      }
      if (effectiveOwnerUserId) reminderWhere.ownerUserId = effectiveOwnerUserId
      if (leadId && !opportunityId) {
        reminderWhere.targetType = 'lead'
        reminderWhere.targetId = leadId
      }
      if (opportunityId) {
        reminderWhere.targetType = 'opportunity'
        reminderWhere.targetId = opportunityId
      }

      const reminders = await Reminder.findAll({
        where: reminderWhere,
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'name'],
          },
        ],
      })

      for (const r of reminders) {
        events.push({
          id: `reminder-${r.id}`,
          source: 'reminder',
          sourceId: r.id,
          title: r.title,
          ...calendarSegmentWindow(r.remindAt),
          kind: 'reminder',
          status: r.status,
          color: r.color || EVENT_COLORS.reminder.default,
          ownerUserId: r.ownerUserId,
          ownerName: r.owner?.name || null,
          meta: {
            notes: r.notes,
            targetType: r.targetType,
            targetId: r.targetId,
            channelPush: r.channelPush,
            channelEmail: r.channelEmail,
          },
        })
      }
    }

    // Sort events by start time
    events.sort((a, b) => new Date(a.start) - new Date(b.start))

    return res.json({
      data: events,
      meta: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
        total: events.length,
      },
    })
  } catch (err) {
    console.error('Calendar listEvents error:', err)
    return res.status(500).json({ message: err.message || 'Failed to fetch calendar events' })
  }
}

/**
 * Get day digest for "Today" rail
 * GET /calendar/today
 */
export async function getDayDigest(req, res) {
  try {
    const { ownerUserId } = req.query
    const companyId = req.company?.id || req.user?.companyId
    const workspaceId = req.headers['x-workspace-id']

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' })
    }

    const todayStart = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)
    const tomorrowEnd = new Date(todayEnd)
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)

    const superAdmin = isSuperAdmin(req.user)
    const targetOwnerId = superAdmin ? null : ownerUserId || req.user?.id

    // Fetch today's meetings
    const todayMeetingWhere = {
      workspaceId,
      scheduledStart: {
        [Op.gte]: todayStart,
        [Op.lte]: todayEnd,
      },
    }
    if (targetOwnerId) todayMeetingWhere.ownerUserId = targetOwnerId
    const meetings = await Meeting.findAll({
      where: todayMeetingWhere,
      include: [
        {
          model: MeetingParticipant,
          as: 'participants',
          attributes: ['userId'],
        },
        {
          model: Lead,
          attributes: ['id', 'contactName', 'title', 'company', 'email'],
        },
      ],
    })

    // Fetch today's tasks
    const todayTaskWhere = {
      companyId,
      workspaceId,
      dueAt: {
        [Op.gte]: todayStart,
        [Op.lte]: todayEnd,
      },
    }
    if (targetOwnerId) todayTaskWhere.assignedTo = targetOwnerId
    const tasks = await LeadTask.findAll({
      where: todayTaskWhere,
      include: [
        {
          model: Lead,
          as: 'lead',
          attributes: ['id', 'contactName', 'title', 'company', 'email'],
        },
      ],
    })
    await promotePendingTasksByDueOrStart(tasks, { companyId, workspaceId })

    // Fetch today's followups (by createdBy for non-superadmins)
    const todayFollowupWhere = {
      companyId,
      workspaceId,
      scheduledAt: {
        [Op.gte]: todayStart,
        [Op.lte]: todayEnd,
      },
    }
    if (targetOwnerId) todayFollowupWhere.createdBy = targetOwnerId
    const followups = await LeadFollowup.findAll({
      where: todayFollowupWhere,
      include: [
        {
          model: Lead,
          as: 'lead',
          attributes: ['id', 'contactName', 'title', 'company', 'email'],
        },
      ],
    })

    // Fetch today's reminders
    const todayReminderWhere = {
      companyId,
      workspaceId,
      remindAt: {
        [Op.gte]: todayStart,
        [Op.lte]: todayEnd,
      },
    }
    if (targetOwnerId) todayReminderWhere.ownerUserId = targetOwnerId
    const reminders = await Reminder.findAll({
      where: todayReminderWhere,
    })

    // Fetch tomorrow's items for the "Tomorrow" section
    const tomorrowMeetingWhere = {
      workspaceId,
      scheduledStart: {
        [Op.gte]: tomorrowStart,
        [Op.lte]: tomorrowEnd,
      },
    }
    if (targetOwnerId) tomorrowMeetingWhere.ownerUserId = targetOwnerId
    const tomorrowMeetings = await Meeting.findAll({
      where: tomorrowMeetingWhere,
      include: [
        {
          model: Lead,
          attributes: ['id', 'contactName', 'title', 'company', 'email'],
        },
      ],
    })

    const tomorrowTaskWhere = {
      companyId,
      workspaceId,
      dueAt: {
        [Op.gte]: tomorrowStart,
        [Op.lte]: tomorrowEnd,
      },
    }
    if (targetOwnerId) tomorrowTaskWhere.assignedTo = targetOwnerId
    const tomorrowTasks = await LeadTask.findAll({
      where: tomorrowTaskWhere,
      include: [
        {
          model: Lead,
          as: 'lead',
          attributes: ['id', 'contactName', 'title', 'company', 'email'],
        },
      ],
    })

    const now = new Date()

    // Normalize and combine today's events
    const todayEvents = [
      ...meetings.map(m => ({
        id: `meeting-${m.id}`,
        kind: 'meeting',
        title: m.title,
        time: m.scheduledStart,
        endTime: m.scheduledEnd,
        status: m.status,
        isNow: now >= new Date(m.scheduledStart) && now <= new Date(m.scheduledEnd),
        leadName: getLeadDisplayName(m.lead || m.Lead),
        color: EVENT_COLORS.meeting[m.meetingType] || EVENT_COLORS.meeting.demo,
      })),
      ...tasks.map(t => ({
        id: `task-${t.id}`,
        kind: 'task',
        title: t.title,
        time: t.dueAt,
        status: t.status,
        priority: t.priority,
        leadName: getLeadDisplayName(t.lead),
        color: EVENT_COLORS.task[t.priority] || EVENT_COLORS.task.medium,
      })),
      ...followups.map(f => ({
        id: `followup-${f.id}`,
        kind: 'followup',
        title: f.remark || 'Follow-up',
        time: f.scheduledAt,
        status: f.status,
        leadName: getLeadDisplayName(f.lead),
        color: EVENT_COLORS.followup[f.status] || EVENT_COLORS.followup.pending,
      })),
      ...reminders.map(r => ({
        id: `reminder-${r.id}`,
        kind: 'reminder',
        title: r.title,
        time: r.remindAt,
        status: r.status,
        color: r.color || EVENT_COLORS.reminder.default,
      })),
    ].sort((a, b) => new Date(a.time) - new Date(b.time))

    // Tomorrow events
    const tomorrowEvents = [
      ...tomorrowMeetings.map(m => ({
        id: `meeting-${m.id}`,
        kind: 'meeting',
        title: m.title,
        time: m.scheduledStart,
        status: m.status,
        leadName: getLeadDisplayName(m.lead || m.Lead),
        color: EVENT_COLORS.meeting[m.meetingType] || EVENT_COLORS.meeting.demo,
      })),
      ...tomorrowTasks.map(t => ({
        id: `task-${t.id}`,
        kind: 'task',
        title: t.title,
        time: t.dueAt,
        status: t.status,
        priority: t.priority,
        leadName: getLeadDisplayName(t.lead),
        color: EVENT_COLORS.task[t.priority] || EVENT_COLORS.task.medium,
      })),
    ].sort((a, b) => new Date(a.time) - new Date(b.time))

    // Calculate stats
    const completed = todayEvents.filter(e => e.status === 'completed' || e.status === 'done').length
    const scheduled = todayEvents.filter(e =>
      ['scheduled', 'pending', 'open', 'in_progress'].includes(e.status),
    ).length

    return res.json({
      today: {
        date: todayStart.toISOString(),
        events: todayEvents,
        stats: {
          total: todayEvents.length,
          completed,
          scheduled,
        },
      },
      tomorrow: {
        date: tomorrowStart.toISOString(),
        events: tomorrowEvents,
      },
    })
  } catch (err) {
    console.error('Calendar getDayDigest error:', err)
    return res.status(500).json({ message: err.message || 'Failed to fetch day digest' })
  }
}
