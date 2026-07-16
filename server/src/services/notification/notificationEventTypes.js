/**
 * Full event registry — the 7 legacy keys keep their existing string values and flow
 * through the existing Company.notificationEmailSettings JSON path (unchanged).
 * New keys are gated via RoleNotificationPreference/UserNotificationPreference.
 */
export const NOTIFICATION_EVENT_TYPES = {
  // Auth (mandatory — see mandatoryEvents.js)
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
  USER_INVITATION: 'user_invitation',

  // Leads (legacy)
  LEAD_ASSIGNED: 'lead_assigned',
  LEAD_STATUS_CHANGED: 'lead_status_changed',
  LEAD_NOTE_ADDED: 'lead_note_added',

  // Opportunities / Deals
  OPPORTUNITY_CREATED: 'opportunity_created',
  OPPORTUNITY_STAGE_CHANGED: 'opportunity_stage_changed',
  DEAL_CREATED: 'deal_created',
  DEAL_STAGE_CHANGED: 'deal_stage_changed',

  // Tasks (legacy)
  TASK_ASSIGNED: 'task_assigned',
  TASKS_DUE_TODAY: 'tasks_due_today',
  TASK_DUE_REMINDER: 'task_due_reminder',
  TASK_COMMENT_ADDED: 'task_comment_added',
  FOLLOWUP_DUE: 'followup_due',

  // Meetings (legacy + new)
  MEETING_INVITATION: 'meeting_invitation',
  MEETING_REMINDER: 'meeting_reminder',
  CALL_REMINDER: 'call_reminder',

  // Approvals (generic — stopgap until a dedicated approvals module exists)
  APPROVAL_REQUESTED: 'approval_requested',
  APPROVAL_DECIDED: 'approval_decided',

  // Finance
  INVOICE_CREATED: 'invoice_created',
  INVOICE_PAYMENT_RECEIVED: 'invoice_payment_received',

  // Documents
  DOCUMENT_SHARED: 'document_shared',

  // HR
  LEAVE_REQUESTED: 'leave_requested',
  LEAVE_DECIDED: 'leave_decided',
  ATTENDANCE_ALERT: 'attendance_alert',

  // Security (mandatory)
  SECURITY_NEW_DEVICE_LOGIN: 'security_new_device_login',
  SECURITY_PASSWORD_CHANGED: 'security_password_changed',
  SECURITY_EMAIL_CHANGED: 'security_email_changed',

  // Digests
  DIGEST_DAILY: 'digest_daily',
  DIGEST_WEEKLY: 'digest_weekly',

  // Existing (legacy)
  CAMPAIGN_LEADS_ADDED: 'campaign_leads_added',
  LEAD_EMAIL_REPLY: 'lead_email_reply',
}

/** The 7 events that still flow through Company.notificationEmailSettings JSON (unchanged behavior). */
export const LEGACY_EVENT_TYPES = new Set([
  NOTIFICATION_EVENT_TYPES.LEAD_ASSIGNED,
  NOTIFICATION_EVENT_TYPES.CAMPAIGN_LEADS_ADDED,
  NOTIFICATION_EVENT_TYPES.TASK_ASSIGNED,
  NOTIFICATION_EVENT_TYPES.TASKS_DUE_TODAY,
  NOTIFICATION_EVENT_TYPES.FOLLOWUP_DUE,
  NOTIFICATION_EVENT_TYPES.LEAD_EMAIL_REPLY,
  NOTIFICATION_EVENT_TYPES.MEETING_REMINDER,
])

export const EVENT_MODULE_GROUPS = [
  { module: 'Auth & Security', events: ['welcome', 'email_verification', 'password_reset', 'user_invitation', 'security_new_device_login', 'security_password_changed', 'security_email_changed'] },
  { module: 'Leads', events: ['lead_assigned', 'lead_status_changed', 'lead_note_added'] },
  { module: 'Opportunities & Deals', events: ['opportunity_created', 'opportunity_stage_changed', 'deal_created', 'deal_stage_changed'] },
  { module: 'Tasks & Follow-ups', events: ['task_assigned', 'task_comment_added', 'tasks_due_today', 'task_due_reminder', 'followup_due'] },
  { module: 'Meetings', events: ['meeting_invitation', 'meeting_reminder', 'call_reminder'] },
  { module: 'Approvals', events: ['approval_requested', 'approval_decided'] },
  { module: 'Finance', events: ['invoice_created', 'invoice_payment_received'] },
  { module: 'Documents', events: ['document_shared'] },
  { module: 'HR', events: ['leave_requested', 'leave_decided', 'attendance_alert'] },
  { module: 'Digests', events: ['digest_daily', 'digest_weekly'] },
  { module: 'Campaigns & Email', events: ['campaign_leads_added', 'lead_email_reply'] },
]
