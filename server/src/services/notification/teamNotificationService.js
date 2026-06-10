import {
  computeSendDelayMs,
  getCompanyNotificationSettings,
  NOTIFICATION_EVENT_TYPES,
} from './notificationPreferencesService.js'
import { enqueueTeamNotification } from '../../queues/notificationEmailQueue.js'

/** Coalesce rapid single-lead assignment pings into one email per recipient. */
const LEAD_ASSIGN_DEBOUNCE_MS = 3000
const pendingLeadAssigned = new Map()

function leadAssignBufferKey({ companyId, workspaceId, recipientUserId, actorUserId }) {
  return `${companyId}|${workspaceId || ''}|${recipientUserId}|${actorUserId || ''}`
}

async function dispatchLeadAssignedNow({
  companyId,
  workspaceId,
  recipientUserId,
  actorUserId,
  leadCount,
}) {
  if (!recipientUserId || !leadCount) return
  if (String(recipientUserId) === String(actorUserId || '')) return
  const settings = await getCompanyNotificationSettings(companyId)
  const delayMs = computeSendDelayMs(settings, NOTIFICATION_EVENT_TYPES.LEAD_ASSIGNED)
  return enqueueTeamNotification({
    eventType: NOTIFICATION_EVENT_TYPES.LEAD_ASSIGNED,
    companyId,
    workspaceId,
    recipientUserId,
    actorUserId,
    payload: { leadCount },
    delayMs,
  })
}

function flushPendingLeadAssigned(key) {
  const entry = pendingLeadAssigned.get(key)
  if (!entry) return Promise.resolve()
  pendingLeadAssigned.delete(key)
  clearTimeout(entry.timer)
  return dispatchLeadAssignedNow(entry).catch(() => {})
}

/**
 * Notify one user about leads assigned to them.
 * Bulk counts (or immediate=true) send right away; rapid singles coalesce within a short window.
 */
export async function notifyLeadAssigned({
  companyId,
  workspaceId,
  recipientUserId,
  actorUserId,
  leadCount,
  immediate = false,
}) {
  const count = Number(leadCount) || 0
  if (!recipientUserId || count <= 0) return
  if (String(recipientUserId) === String(actorUserId || '')) return

  if (immediate || count > 1) {
    const key = leadAssignBufferKey({ companyId, workspaceId, recipientUserId, actorUserId })
    if (pendingLeadAssigned.has(key)) {
      await flushPendingLeadAssigned(key)
    }
    return dispatchLeadAssignedNow({
      companyId,
      workspaceId,
      recipientUserId,
      actorUserId,
      leadCount: count,
    })
  }

  const key = leadAssignBufferKey({ companyId, workspaceId, recipientUserId, actorUserId })
  const existing = pendingLeadAssigned.get(key)
  if (existing) {
    existing.leadCount += count
    clearTimeout(existing.timer)
    existing.timer = setTimeout(() => {
      flushPendingLeadAssigned(key).catch(() => {})
    }, LEAD_ASSIGN_DEBOUNCE_MS)
    return
  }

  const entry = {
    companyId,
    workspaceId,
    recipientUserId,
    actorUserId,
    leadCount: count,
    timer: setTimeout(() => {
      flushPendingLeadAssigned(key).catch(() => {})
    }, LEAD_ASSIGN_DEBOUNCE_MS),
  }
  pendingLeadAssigned.set(key, entry)
}

/**
 * Aggregate bulk assign / distribute / import: Map<userId, count> → one email per user.
 */
export async function notifyLeadAssignedBatch({
  companyId,
  workspaceId,
  actorUserId,
  countByUserId,
}) {
  if (!countByUserId?.size) return
  const entries = [...countByUserId.entries()]
  await Promise.all(
    entries.map(([userId, leadCount]) =>
      notifyLeadAssigned({
        companyId,
        workspaceId,
        recipientUserId: userId,
        actorUserId,
        leadCount,
        immediate: true,
      }),
    ),
  )
}

export async function notifyCampaignLeadsAdded({
  companyId,
  workspaceId,
  recipientUserId,
  actorUserId,
  leadCount,
  campaignId,
  campaignName,
}) {
  if (!recipientUserId || !leadCount) return
  const settings = await getCompanyNotificationSettings(companyId)
  const delayMs = computeSendDelayMs(settings, NOTIFICATION_EVENT_TYPES.CAMPAIGN_LEADS_ADDED)
  return enqueueTeamNotification({
    eventType: NOTIFICATION_EVENT_TYPES.CAMPAIGN_LEADS_ADDED,
    companyId,
    workspaceId,
    recipientUserId,
    actorUserId,
    payload: { leadCount, campaignId, campaignName },
    delayMs,
  })
}

export async function notifyCampaignLeadsBatch({
  companyId,
  workspaceId,
  actorUserId,
  campaignId,
  campaignName,
  countByUserId,
}) {
  if (!countByUserId?.size) return
  await Promise.all(
    [...countByUserId.entries()].map(([userId, leadCount]) =>
      notifyCampaignLeadsAdded({
        companyId,
        workspaceId,
        recipientUserId: userId,
        actorUserId,
        leadCount,
        campaignId,
        campaignName,
      }),
    ),
  )
}

export async function notifyTaskAssigned({
  companyId,
  workspaceId,
  recipientUserId,
  actorUserId,
  tasks,
}) {
  const list = Array.isArray(tasks) ? tasks : []
  if (!recipientUserId || !list.length) return
  const settings = await getCompanyNotificationSettings(companyId)
  const delayMs = computeSendDelayMs(settings, NOTIFICATION_EVENT_TYPES.TASK_ASSIGNED)
  return enqueueTeamNotification({
    eventType: NOTIFICATION_EVENT_TYPES.TASK_ASSIGNED,
    companyId,
    workspaceId,
    recipientUserId,
    actorUserId,
    payload: {
      taskCount: list.length,
      taskTitles: list.map((t) => t.title).filter(Boolean),
    },
    delayMs,
  })
}

export async function notifyTaskAssignedBatch({
  companyId,
  workspaceId,
  actorUserId,
  tasksByUserId,
}) {
  if (!tasksByUserId?.size) return
  await Promise.all(
    [...tasksByUserId.entries()].map(([userId, tasks]) =>
      notifyTaskAssigned({
        companyId,
        workspaceId,
        recipientUserId: userId,
        actorUserId,
        tasks,
      }),
    ),
  )
}

/** Collect newly assigned user IDs from bulk assign (owner + collaborators). */
export function collectBulkAssignRecipients(
  payload,
  beforePlainById,
  leads,
  bulkCollabBeforeByLeadId,
  actorUserId,
) {
  const counts = new Map()
  const primary = payload.assignedTo ? String(payload.assignedTo) : null
  const afterCollabs = new Set((payload.assignedUserIds || []).map(String))

  for (const lead of leads) {
    const lid = String(lead.id)
    const before = beforePlainById?.get(lid)
    const beforePrimary = before?.assignedTo ? String(before.assignedTo) : null
    if (primary && primary !== beforePrimary) {
      counts.set(primary, (counts.get(primary) || 0) + 1)
    }
    const beforeCollabs = new Set(bulkCollabBeforeByLeadId?.get(lid) || [])
    for (const uid of afterCollabs) {
      if (uid && !beforeCollabs.has(uid)) {
        counts.set(uid, (counts.get(uid) || 0) + 1)
      }
    }
  }

  if (actorUserId) counts.delete(String(actorUserId))
  return counts
}

export function collectRoundRobinRecipients(assignments, actorUserId) {
  const counts = new Map()
  for (const row of assignments || []) {
    const uid = row.assignedTo ? String(row.assignedTo) : null
    if (uid) counts.set(uid, (counts.get(uid) || 0) + 1)
  }
  if (actorUserId) counts.delete(String(actorUserId))
  return counts
}

export function collectCampaignRecipients(rows, actorUserId) {
  const counts = new Map()
  for (const row of rows || []) {
    const uid = row.assignedUserId ? String(row.assignedUserId) : null
    if (uid) counts.set(uid, (counts.get(uid) || 0) + 1)
  }
  if (actorUserId) counts.delete(String(actorUserId))
  return counts
}

export async function notifyFollowupDue({ companyId, workspaceId, recipientUserId, leadId, leadName, scheduledAt, remark }) {
  if (!recipientUserId) return
  const settings = await getCompanyNotificationSettings(companyId)
  const delayMs = computeSendDelayMs(settings, NOTIFICATION_EVENT_TYPES.FOLLOWUP_DUE)
  return enqueueTeamNotification({
    eventType: NOTIFICATION_EVENT_TYPES.FOLLOWUP_DUE,
    companyId,
    workspaceId,
    recipientUserId,
    payload: { leadId, leadName, scheduledAt, remark },
    delayMs,
  })
}

export async function notifyLeadEmailReply({ companyId, workspaceId, recipientUserId, leadId, leadName, senderEmail }) {
  if (!recipientUserId) return
  const settings = await getCompanyNotificationSettings(companyId)
  const delayMs = computeSendDelayMs(settings, NOTIFICATION_EVENT_TYPES.LEAD_EMAIL_REPLY)
  return enqueueTeamNotification({
    eventType: NOTIFICATION_EVENT_TYPES.LEAD_EMAIL_REPLY,
    companyId,
    workspaceId,
    recipientUserId,
    payload: { leadId, leadName, senderEmail },
    delayMs,
  })
}

export async function notifyMeetingReminderInternal({ companyId, workspaceId, recipientUserId, meetingId, meetingTitle, scheduledStart, meetLink }) {
  if (!recipientUserId) return
  const settings = await getCompanyNotificationSettings(companyId)
  const delayMs = computeSendDelayMs(settings, NOTIFICATION_EVENT_TYPES.MEETING_REMINDER)
  return enqueueTeamNotification({
    eventType: NOTIFICATION_EVENT_TYPES.MEETING_REMINDER,
    companyId,
    workspaceId,
    recipientUserId,
    payload: { meetingId, meetingTitle, scheduledStart, meetLink },
    delayMs,
  })
}

export { NOTIFICATION_EVENT_TYPES }
