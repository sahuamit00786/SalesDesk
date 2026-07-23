/**
 * Groups the many raw Notification.type values into a small set of filter
 * categories for the notification bell / center. Any type not listed below
 * falls back to 'system'.
 */
export const NOTIFICATION_CATEGORIES = [
  {
    id: 'leads',
    label: 'Leads',
    types: ['lead_assigned', 'lead_status_changed', 'lead_note_added', 'lead_email_reply', 'campaign_leads_added'],
  },
  {
    id: 'deals',
    label: 'Deals & Opportunities',
    types: ['opportunity_created', 'opportunity_stage_changed', 'deal_created', 'deal_stage_changed'],
  },
  {
    id: 'tasks',
    label: 'Tasks & Reminders',
    types: ['task_assigned', 'task_comment_added', 'tasks_due_today', 'task_due_reminder', 'followup_due', 'reminder_due'],
  },
  {
    id: 'meetings',
    label: 'Meetings & Calls',
    types: ['meeting_invitation', 'meeting_reminder', 'call_reminder'],
  },
  {
    id: 'approvals',
    label: 'Approvals',
    types: ['approval_requested', 'approval_decided', 'leave', 'leave_requested', 'leave_decided'],
  },
  {
    id: 'finance',
    label: 'Finance',
    types: ['invoice_created', 'invoice_payment_received'],
  },
  {
    id: 'documents',
    label: 'Documents',
    types: ['document_shared'],
  },
  {
    id: 'system',
    label: 'System & Security',
    types: [
      'welcome',
      'email_verification',
      'password_reset',
      'user_invitation',
      'security_new_device_login',
      'security_password_changed',
      'security_email_changed',
      'digest_daily',
      'digest_weekly',
      'attendance_alert',
      'info',
    ],
  },
]

const TYPE_TO_CATEGORY = new Map()
for (const category of NOTIFICATION_CATEGORIES) {
  for (const type of category.types) TYPE_TO_CATEGORY.set(type, category.id)
}

export function categoryForType(type) {
  return TYPE_TO_CATEGORY.get(type) || 'system'
}

export function typesForCategory(categoryId) {
  const category = NOTIFICATION_CATEGORIES.find((c) => c.id === categoryId)
  return category ? category.types : []
}
