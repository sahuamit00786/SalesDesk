import { isToday, isYesterday, isThisWeek, formatDistanceToNowStrict } from 'date-fns'
import {
  Bell,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileText,
  Shield,
  Users,
  XCircle,
} from '@/components/ui/icons'

/** Mirrors server/src/services/notification/notificationCategories.js */
const TYPE_TO_CATEGORY = {
  lead_assigned: 'leads',
  lead_status_changed: 'leads',
  lead_note_added: 'leads',
  lead_email_reply: 'leads',
  campaign_leads_added: 'leads',

  opportunity_created: 'deals',
  opportunity_stage_changed: 'deals',
  deal_created: 'deals',
  deal_stage_changed: 'deals',

  task_assigned: 'tasks',
  task_comment_added: 'tasks',
  tasks_due_today: 'tasks',
  task_due_reminder: 'tasks',
  followup_due: 'tasks',
  reminder_due: 'tasks',

  meeting_invitation: 'meetings',
  meeting_reminder: 'meetings',
  call_reminder: 'meetings',

  approval_requested: 'approvals',
  approval_decided: 'approvals',
  leave: 'approvals',
  leave_requested: 'approvals',
  leave_decided: 'approvals',

  invoice_created: 'finance',
  invoice_payment_received: 'finance',

  document_shared: 'documents',
}

export const NOTIFICATION_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'leads', label: 'Leads' },
  { id: 'deals', label: 'Deals' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'meetings', label: 'Meetings' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'finance', label: 'Finance' },
  { id: 'documents', label: 'Documents' },
  { id: 'system', label: 'System' },
]

export function categoryForType(type) {
  return TYPE_TO_CATEGORY[type] || 'system'
}

const CATEGORY_ICONS = {
  leads: { Icon: Users, className: 'bg-brand-100 text-brand-700' },
  deals: { Icon: Briefcase, className: 'bg-violet-100 text-violet-700' },
  tasks: { Icon: ClipboardList, className: 'bg-amber-100 text-amber-800' },
  meetings: { Icon: CalendarCheck, className: 'bg-sky-100 text-sky-700' },
  approvals: { Icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700' },
  finance: { Icon: DollarSign, className: 'bg-teal-100 text-teal-700' },
  documents: { Icon: FileText, className: 'bg-slate-200 text-ink' },
  system: { Icon: Shield, className: 'bg-slate-200 text-ink-muted' },
}

/** Picks the row icon: reads title text for approved/rejected before falling back to category. */
export function notificationVisual(notification) {
  const title = notification?.title || ''
  if (/rejected|declined/i.test(title)) return { Icon: XCircle, className: 'bg-rose-100 text-rose-700' }
  if (/approved/i.test(title)) return { Icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700' }
  return CATEGORY_ICONS[categoryForType(notification?.type)] || { Icon: Bell, className: 'bg-slate-200 text-brand-700' }
}

export function relativeTime(dateValue) {
  if (!dateValue) return ''
  return formatDistanceToNowStrict(new Date(dateValue), { addSuffix: true })
}

/** Buckets a list of notifications into Today / Yesterday / This week / Earlier, preserving order within each bucket. */
export function groupByDay(rows) {
  const buckets = { Today: [], Yesterday: [], 'This week': [], Earlier: [] }
  for (const row of rows) {
    const date = new Date(row.createdAt)
    if (isToday(date)) buckets.Today.push(row)
    else if (isYesterday(date)) buckets.Yesterday.push(row)
    else if (isThisWeek(date, { weekStartsOn: 1 })) buckets['This week'].push(row)
    else buckets.Earlier.push(row)
  }
  return Object.entries(buckets).filter(([, rows]) => rows.length > 0)
}
