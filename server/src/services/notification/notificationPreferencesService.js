import { Company } from '../../models/index.js'

export const NOTIFICATION_EVENT_TYPES = {
  LEAD_ASSIGNED: 'lead_assigned',
  CAMPAIGN_LEADS_ADDED: 'campaign_leads_added',
  TASK_ASSIGNED: 'task_assigned',
  TASKS_DUE_TODAY: 'tasks_due_today',
  FOLLOWUP_DUE: 'followup_due',
  LEAD_EMAIL_REPLY: 'lead_email_reply',
  MEETING_REMINDER: 'meeting_reminder',
}

const DEFAULT_SETTINGS = {
  leadAssigned: { enabled: true, email: true, inApp: true },
  campaignLeadsAdded: { enabled: true, email: true, inApp: true },
  taskAssigned: { enabled: true, email: true, inApp: true },
  tasksDueToday: {
    enabled: true,
    email: true,
    inApp: true,
    digestHour: 8,
    digestMinute: 0,
    timezone: 'UTC',
  },
  followupDue: { enabled: true, email: false, inApp: true },
  leadEmailReply: { enabled: true, email: false, inApp: true },
  meetingReminder: { enabled: true, email: false, inApp: true },
  quietHours: {
    enabled: false,
    startHour: 22,
    startMinute: 0,
    endHour: 7,
    endMinute: 0,
  },
}

const EVENT_TO_SETTING_KEY = {
  [NOTIFICATION_EVENT_TYPES.LEAD_ASSIGNED]: 'leadAssigned',
  [NOTIFICATION_EVENT_TYPES.CAMPAIGN_LEADS_ADDED]: 'campaignLeadsAdded',
  [NOTIFICATION_EVENT_TYPES.TASK_ASSIGNED]: 'taskAssigned',
  [NOTIFICATION_EVENT_TYPES.TASKS_DUE_TODAY]: 'tasksDueToday',
  [NOTIFICATION_EVENT_TYPES.FOLLOWUP_DUE]: 'followupDue',
  [NOTIFICATION_EVENT_TYPES.LEAD_EMAIL_REPLY]: 'leadEmailReply',
  [NOTIFICATION_EVENT_TYPES.MEETING_REMINDER]: 'meetingReminder',
}

function clampInt(value, min, max, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

function mergeEventSetting(base, patch) {
  if (!patch || typeof patch !== 'object') return { ...base }
  return {
    enabled: patch.enabled !== undefined ? Boolean(patch.enabled) : base.enabled,
    email: patch.email !== undefined ? Boolean(patch.email) : base.email,
    inApp: patch.inApp !== undefined ? Boolean(patch.inApp) : base.inApp,
    digestHour:
      patch.digestHour !== undefined ? clampInt(patch.digestHour, 0, 23, base.digestHour) : base.digestHour,
    digestMinute:
      patch.digestMinute !== undefined
        ? clampInt(patch.digestMinute, 0, 59, base.digestMinute)
        : base.digestMinute,
    timezone: patch.timezone !== undefined ? String(patch.timezone || 'UTC').trim() || 'UTC' : base.timezone,
  }
}

export function normalizeNotificationSettings(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const tasksDueToday = mergeEventSetting(DEFAULT_SETTINGS.tasksDueToday, src.tasksDueToday)
  const quiet = src.quietHours && typeof src.quietHours === 'object' ? src.quietHours : {}
  return {
    leadAssigned: mergeEventSetting(DEFAULT_SETTINGS.leadAssigned, src.leadAssigned),
    campaignLeadsAdded: mergeEventSetting(DEFAULT_SETTINGS.campaignLeadsAdded, src.campaignLeadsAdded),
    taskAssigned: mergeEventSetting(DEFAULT_SETTINGS.taskAssigned, src.taskAssigned),
    tasksDueToday,
    followupDue: mergeEventSetting(DEFAULT_SETTINGS.followupDue, src.followupDue),
    leadEmailReply: mergeEventSetting(DEFAULT_SETTINGS.leadEmailReply, src.leadEmailReply),
    meetingReminder: mergeEventSetting(DEFAULT_SETTINGS.meetingReminder, src.meetingReminder),
    quietHours: {
      enabled: quiet.enabled !== undefined ? Boolean(quiet.enabled) : DEFAULT_SETTINGS.quietHours.enabled,
      startHour: clampInt(quiet.startHour, 0, 23, DEFAULT_SETTINGS.quietHours.startHour),
      startMinute: clampInt(quiet.startMinute, 0, 59, DEFAULT_SETTINGS.quietHours.startMinute),
      endHour: clampInt(quiet.endHour, 0, 23, DEFAULT_SETTINGS.quietHours.endHour),
      endMinute: clampInt(quiet.endMinute, 0, 59, DEFAULT_SETTINGS.quietHours.endMinute),
    },
  }
}

export async function getCompanyNotificationSettings(companyId) {
  const company = await Company.findByPk(companyId, {
    attributes: ['id', 'notificationEmailSettings'],
  })
  if (!company) return normalizeNotificationSettings(null)
  return normalizeNotificationSettings(company.notificationEmailSettings)
}

export async function updateCompanyNotificationSettings(companyId, patch) {
  const current = await getCompanyNotificationSettings(companyId)
  const next = normalizeNotificationSettings({
    ...current,
    ...(patch && typeof patch === 'object' ? patch : {}),
    quietHours: {
      ...current.quietHours,
      ...(patch?.quietHours && typeof patch.quietHours === 'object' ? patch.quietHours : {}),
    },
  })
  await Company.update({ notificationEmailSettings: next }, { where: { id: companyId } })
  return next
}

export function getEventChannels(settings, eventType) {
  const key = EVENT_TO_SETTING_KEY[eventType]
  const eventSettings = key ? settings[key] : null
  if (!eventSettings?.enabled) return { email: false, inApp: false }
  return {
    email: Boolean(eventSettings.email),
    inApp: Boolean(eventSettings.inApp),
  }
}

function minutesSinceMidnight(hour, minute) {
  return hour * 60 + minute
}

/** Returns delay in ms until quiet hours end, or 0 if sending is allowed now. */
export function quietHoursDelayMs(settings, now = new Date()) {
  const q = settings?.quietHours
  if (!q?.enabled) return 0
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const start = minutesSinceMidnight(q.startHour, q.startMinute)
  const end = minutesSinceMidnight(q.endHour, q.endMinute)
  const inQuiet =
    start <= end ? nowMin >= start && nowMin < end : nowMin >= start || nowMin < end
  if (!inQuiet) return 0
  let target = new Date(now)
  if (start <= end) {
    target.setHours(q.endHour, q.endMinute, 0, 0)
  } else if (nowMin >= start) {
    target.setDate(target.getDate() + 1)
    target.setHours(q.endHour, q.endMinute, 0, 0)
  } else {
    target.setHours(q.endHour, q.endMinute, 0, 0)
  }
  return Math.max(target.getTime() - now.getTime(), 0)
}

export function digestDelayMs(settings, eventType, now = new Date()) {
  if (eventType !== NOTIFICATION_EVENT_TYPES.TASKS_DUE_TODAY) return 0
  const digest = settings.tasksDueToday
  const target = new Date(now)
  target.setHours(digest.digestHour, digest.digestMinute, 0, 0)
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1)
  return target.getTime() - now.getTime()
}

export function computeSendDelayMs(settings, eventType, now = new Date()) {
  return Math.max(quietHoursDelayMs(settings, now), digestDelayMs(settings, eventType, now))
}
