import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  Clock,
  Hash,
  Home,
  IdCard,
  Mail,
  MapPin,
  MessageCircle,
  NotebookPen,
  Pencil,
  Phone,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
} from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { TeamMemberAccessDrawer } from '@/features/team/components/TeamMemberAccessDrawer'
import { useGetTeamUserQuery } from '@/features/team/teamApi'
import { useGetActivitiesFeedQuery } from '@/features/activities/activitiesApi'
import { useGetTasksQuery } from '@/features/tasks/tasksApi'
import { useGetMeetingsQuery } from '@/features/meetings/meetingsApi'
import { useGetRemindersQuery } from '@/features/reminders/remindersApi'
import { cn } from '@/utils/cn'

const TABS = [
  { id: 'activity', label: 'Activity', icon: Sparkles },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'meetings', label: 'Meetings', icon: Video },
  { id: 'calls', label: 'Calls', icon: PhoneCall },
  { id: 'notes', label: 'Notes', icon: NotebookPen },
  { id: 'followups', label: 'Follow-ups', icon: Bell },
]

const TASK_TYPE_LABEL = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  follow_up: 'Follow-up',
  demo: 'Demo',
  discovery: 'Discovery',
  in_person_visit: 'Visit',
  note: 'Note',
}

function initialsFor(text = '') {
  const parts = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatAbsolute(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString()
}

function formatDateOnly(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatRelative(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  const sign = diff >= 0 ? 1 : -1
  const abs = Math.abs(diff)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (abs < minute) return sign > 0 ? 'just now' : 'in a moment'
  if (abs < hour) {
    const m = Math.round(abs / minute)
    return sign > 0 ? `${m}m ago` : `in ${m}m`
  }
  if (abs < day) {
    const h = Math.round(abs / hour)
    return sign > 0 ? `${h}h ago` : `in ${h}h`
  }
  if (abs < 30 * day) {
    const dys = Math.round(abs / day)
    return sign > 0 ? `${dys}d ago` : `in ${dys}d`
  }
  return formatDateOnly(value)
}

function isApiPermissionError(err) {
  const status = err?.status ?? err?.originalStatus
  return status === 401 || status === 403
}

function apiErrorMessage(err) {
  if (!err) return ''
  if (isApiPermissionError(err)) return "You don't have permission to view this section."
  return err?.data?.error?.message || err?.data?.message || 'Failed to load.'
}

function StatusPill({ active }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-rose-200 bg-rose-50 text-rose-700',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-emerald-500' : 'bg-rose-500',
        )}
      />
      {active ? 'Active' : 'Deactivated'}
    </span>
  )
}

function SidebarSection({ title, children }) {
  return (
    <section className="space-y-2.5 px-5 py-4">
      <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function InfoLine({ icon: Icon, label, value, valueClassName, title }) {
  return (
    <div className="flex items-start gap-2.5 text-[13px] leading-relaxed">
      <Icon className="mt-[3px] h-3.5 w-3.5 shrink-0 text-ink-faint" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <span className="text-ink-muted">{label}: </span>
        <span className={cn('break-words text-ink', valueClassName)} title={title}>
          {value || <span className="text-ink-faint">—</span>}
        </span>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, accent = 'brand' }) {
  const palette = {
    brand: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-surface-border bg-white px-4 py-3 shadow-sm">
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', palette[accent] || palette.brand)}>
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
        <p className="truncate text-lg font-semibold text-ink">{value}</p>
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-border bg-white px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
    </div>
  )
}

function PermissionDenied({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/60 px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <ShieldCheck className="h-4 w-4" strokeWidth={2} />
      </div>
      <p className="text-sm font-medium text-amber-900">Restricted</p>
      <p className="text-xs text-amber-800">{message || "You don't have permission to view this section."}</p>
    </div>
  )
}

function ListShell({ isLoading, error, emptyIcon, emptyTitle, emptyHint, children }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-2xl border border-surface-border bg-surface-muted/40" />
        ))}
      </div>
    )
  }
  if (error) {
    if (isApiPermissionError(error)) return <PermissionDenied message={apiErrorMessage(error)} />
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-sm text-rose-800">
        {apiErrorMessage(error)}
      </div>
    )
  }
  if (!children || (Array.isArray(children) && children.length === 0)) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} hint={emptyHint} />
  }
  return <div className="space-y-2">{children}</div>
}

function ActivityRow({ row }) {
  const meta = row.metadata || {}
  const title = meta.title || row.body || 'Activity'
  const description = meta.description || (meta.title && row.body !== meta.title ? row.body : '')
  const typeKey = meta.activityTypeKey || row.type || 'note'
  const typeLabel = TASK_TYPE_LABEL[typeKey] || typeKey.replace('_', ' ')
  return (
    <div className="rounded-2xl border border-surface-border bg-white px-4 py-3 transition hover:border-brand-200 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-brand-100 bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
              {typeLabel}
            </span>
            {row.lead?.title ? (
              <Link
                to={`/leads/${row.lead.id}`}
                className="truncate rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px] text-ink-muted hover:border-brand-200 hover:text-brand-700"
              >
                {row.lead.title}
              </Link>
            ) : null}
          </div>
          <p className="mt-1.5 truncate text-sm font-medium text-ink">{title}</p>
          {description ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{description}</p>
          ) : null}
        </div>
        <span
          className="shrink-0 text-[11px] text-ink-faint"
          title={formatAbsolute(row.createdAt)}
        >
          {formatRelative(row.createdAt)}
        </span>
      </div>
    </div>
  )
}

function CallRow({ row }) {
  const meta = row.metadata || {}
  const title = meta.title || row.body || 'Call'
  const leadLabel = row.lead?.title || row.lead?.contactName || ''
  const agenda = meta.agenda || meta.description || ''
  const durationMinutes = meta.durationMinutes || meta.duration || null
  const outcome = meta.outcome || meta.callOutcome || null
  const participants = Array.isArray(meta.participants) ? meta.participants : []
  const participantLabel = participants.length
    ? participants
        .map((p) => (typeof p === 'string' ? p : p?.name || p?.email || 'Participant'))
        .join(', ')
    : ''

  return (
    <div className="rounded-2xl border border-surface-border bg-white px-4 py-3 transition hover:border-brand-200 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Call
            </span>
            {leadLabel && row.lead?.id ? (
              <Link
                to={`/leads/${row.lead.id}`}
                className="truncate rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px] text-ink-muted hover:border-brand-200 hover:text-brand-700"
              >
                {leadLabel}
              </Link>
            ) : null}
          </div>
          <p className="mt-1.5 truncate text-sm font-medium text-ink">{title}</p>
          {agenda ? <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{agenda}</p> : null}
          <div className="mt-2 grid gap-x-5 gap-y-1 text-[11px] text-ink-muted sm:grid-cols-2">
            <p>
              Logged: <span className="text-ink">{formatAbsolute(row.createdAt) || '—'}</span>
            </p>
            <p>
              Updated: <span className="text-ink">{formatAbsolute(row.updatedAt) || '—'}</span>
            </p>
            <p>
              Duration: <span className="text-ink">{durationMinutes ? `${durationMinutes} min` : '—'}</span>
            </p>
            <p>
              Outcome: <span className="text-ink">{outcome || '—'}</span>
            </p>
            {participantLabel ? (
              <p className="sm:col-span-2">
                Participants: <span className="text-ink">{participantLabel}</span>
              </p>
            ) : null}
          </div>
        </div>
        <span className="shrink-0 text-[11px] text-ink-faint" title={formatAbsolute(row.createdAt)}>
          {formatRelative(row.createdAt)}
        </span>
      </div>
    </div>
  )
}

function TaskRow({ row }) {
  const rawStatus = String(row.status || 'pending').toLowerCase()
  const status = rawStatus === 'open' ? 'pending' : rawStatus
  const statusClass =
    status === 'completed'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'cancelled'
      ? 'border-surface-border bg-white text-ink-faint'
      : status === 'in_progress'
      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
      : 'border-slate-200 bg-slate-50 text-slate-700'
  const statusLabel = status === 'in_progress' ? 'In progress' : status
  const priority = String(row.priority || '').toLowerCase()
  const priorityClass =
    priority === 'urgent'
      ? 'border-red-200 bg-red-50 text-red-700'
      : priority === 'high'
      ? 'border-orange-200 bg-orange-50 text-orange-700'
      : priority === 'medium'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-surface-border bg-white text-ink-muted'
  const isOverdue = Boolean(row.isOverdue)
  const attachmentsCount = Array.isArray(row.attachments) ? row.attachments.length : row.attachmentsCount || 0
  const recurrenceLabel =
    row.recurrenceLabel ||
    (row.recurrenceRule
      ? row.recurrenceRule.freq === 'daily'
        ? 'Daily'
        : row.recurrenceRule.freq === 'weekly'
          ? 'Weekly'
          : row.recurrenceRule.freq === 'monthly'
            ? 'Monthly'
            : 'Recurring'
      : null)
  const subtasks = Array.isArray(row.subtasks) ? row.subtasks : []
  const doneSubtasks = subtasks.filter((s) => s?.done).length
  const commentsCount = Number(row.commentsCount || 0)
  const assigneeName = row.assignee?.name || row.assignee?.email || ''
  const creatorName = row.creator?.name || row.creator?.email || ''

  return (
    <div
      className={cn(
        'rounded-2xl border bg-white px-4 py-3 transition hover:border-brand-200 hover:shadow-sm',
        isOverdue ? 'border-red-200 border-l-4 border-l-red-500' : 'border-surface-border',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', statusClass)}>
              {statusLabel}
            </span>
            {priority ? (
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide', priorityClass)}>
                {priority}
              </span>
            ) : null}
            {isOverdue ? (
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                Overdue
              </span>
            ) : null}
            {recurrenceLabel ? (
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                {recurrenceLabel}
              </span>
            ) : null}
            {attachmentsCount ? (
              <span className="rounded-full border border-surface-border bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
                📎 {attachmentsCount}
              </span>
            ) : null}
            {row.lead?.title ? (
              <Link
                to={`/leads/${row.lead.id}`}
                className="truncate rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px] text-ink-muted hover:border-brand-200 hover:text-brand-700"
              >
                {row.lead.title}
              </Link>
            ) : null}
          </div>
          <p className="mt-1.5 truncate text-sm font-medium text-ink">{row.title || 'Untitled task'}</p>
          {row.description ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{row.description}</p>
          ) : null}
          <div className="mt-2 grid gap-x-5 gap-y-1 text-[11px] text-ink-muted sm:grid-cols-2">
            <p>
              Due on: <span className="text-ink">{formatAbsolute(row.dueAt) || '—'}</span>
            </p>
            <p>
              Created: <span className="text-ink">{formatAbsolute(row.createdAt) || '—'}</span>
            </p>
            <p>
              Subtasks: <span className="text-ink">{subtasks.length ? `${doneSubtasks}/${subtasks.length} done` : 'None'}</span>
            </p>
            <p>
              Comments: <span className="text-ink">{commentsCount || '0'}</span>
            </p>
            {assigneeName ? (
              <p>
                Assigned to: <span className="text-ink">{assigneeName}</span>
              </p>
            ) : null}
            {creatorName ? (
              <p>
                Created by: <span className="text-ink">{creatorName}</span>
              </p>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right text-[11px] text-ink-faint">
          {row.dueAt ? (
            <span title={formatAbsolute(row.dueAt)}>Due {formatRelative(row.dueAt)}</span>
          ) : (
            <span title={formatAbsolute(row.createdAt)}>{formatRelative(row.createdAt)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function ReminderRow({ row }) {
  const status = String(row.status || 'pending').toLowerCase()
  const statusClass =
    status === 'done'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'dismissed'
      ? 'border-surface-border bg-white text-ink-faint'
      : 'border-amber-200 bg-amber-50 text-amber-700'
  const remindAtLabel = formatAbsolute(row.remindAt)
  const createdLabel = formatAbsolute(row.createdAt)
  const targetLabel = [row.targetType, row.targetId].filter(Boolean).join(' · ')
  const ownerLabel = row.ownerUser?.name || row.ownerUser?.email || ''
  return (
    <div className="rounded-2xl border border-surface-border bg-white px-4 py-3 transition hover:border-brand-200 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', statusClass)}>
              {status}
            </span>
            <span className="rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px] text-ink-muted">
              {row.targetType || 'general'}
            </span>
          </div>
          <p className="mt-1.5 truncate text-sm font-medium text-ink">{row.title || 'Reminder'}</p>
          {row.notes ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{row.notes}</p>
          ) : null}
          <div className="mt-2 grid gap-x-5 gap-y-1 text-[11px] text-ink-muted sm:grid-cols-2">
            <p>
              Remind at: <span className="text-ink">{remindAtLabel || '—'}</span>
            </p>
            <p>
              Created: <span className="text-ink">{createdLabel || '—'}</span>
            </p>
            <p>
              Target: <span className="text-ink">{targetLabel || '—'}</span>
            </p>
            {ownerLabel ? (
              <p>
                Owner: <span className="text-ink">{ownerLabel}</span>
              </p>
            ) : null}
          </div>
        </div>
        <span className="shrink-0 text-[11px] text-ink-faint" title={formatAbsolute(row.remindAt)}>
          {formatRelative(row.remindAt)}
        </span>
      </div>
    </div>
  )
}

function MeetingRow({ row }) {
  const start = row.scheduledStart ? new Date(row.scheduledStart) : null
  const end = row.scheduledEnd ? new Date(row.scheduledEnd) : null
  const durationMinutes =
    row.durationMinutes != null
      ? Number(row.durationMinutes)
      : start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
        ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
        : null
  const status = String(row.status || 'scheduled').toLowerCase()
  const statusClass =
    status === 'live'
      ? 'border-red-200 bg-red-50 text-red-700'
      : status === 'completed'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : status === 'cancelled' || status === 'missed'
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-indigo-200 bg-indigo-50 text-indigo-700'
  const participantCount = Array.isArray(row.participants) ? row.participants.length : 0
  const meetingType = String(row.meetingType || '').replace(/_/g, ' ') || 'meeting'
  return (
    <div className="rounded-2xl border border-surface-border bg-white px-4 py-3 transition hover:border-brand-200 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', statusClass)}>
              {status}
            </span>
            <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
              {meetingType}
            </span>
            {row.googleMeetLink ? (
              <a
                href={row.googleMeetLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 hover:bg-brand-100"
              >
                Join link
              </a>
            ) : null}
          </div>
          <p className="mt-1.5 truncate text-sm font-medium text-ink">{row.title || 'Meeting'}</p>
          {row.agenda ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{row.agenda}</p>
          ) : null}
          <div className="mt-2 grid gap-x-5 gap-y-1 text-[11px] text-ink-muted sm:grid-cols-2">
            <p>
              Start: <span className="text-ink">{formatAbsolute(row.scheduledStart) || '—'}</span>
            </p>
            <p>
              End: <span className="text-ink">{formatAbsolute(row.scheduledEnd) || '—'}</span>
            </p>
            <p>
              Duration: <span className="text-ink">{durationMinutes ? `${durationMinutes} min` : '—'}</span>
            </p>
            <p>
              Timezone: <span className="text-ink">{row.timezone || '—'}</span>
            </p>
            <p>
              Participants: <span className="text-ink">{participantCount}</span>
            </p>
            <p>
              Recording: <span className="text-ink">{row.recordingStatus || '—'}</span>
            </p>
          </div>
        </div>
        <span className="shrink-0 text-[11px] text-ink-faint" title={formatAbsolute(row.scheduledStart)}>
          {formatRelative(row.scheduledStart)}
        </span>
      </div>
    </div>
  )
}

function ProfileSidebar({ user, onEdit, canEdit = true }) {
  const headerInitials = initialsFor(user?.name || user?.email || '')
  const cityState = [user?.city, user?.country].filter(Boolean).join(', ')
  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <div className="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm">
        <div className="flex flex-col items-center px-5 pt-4 text-center">
          <div
            className="shrink-0 overflow-hidden rounded-full border-2 border-brand-500 bg-brand-100"
            style={{ width: 84, height: 84 }}
          >
            {user?.profilePhotoUrl ? (
              <img
                src={user.profilePhotoUrl}
                alt={user?.name || 'User'}
                style={{ width: 84, height: 84 }}
                className="block object-cover"
              />
            ) : (
              <span
                className="flex items-center justify-center text-lg font-semibold text-brand-800"
                style={{ width: 84, height: 84 }}
              >
                {headerInitials}
              </span>
            )}
          </div>
          <h2 className="mt-3 break-words text-[16px] font-semibold leading-tight text-ink">
            {user?.name || 'Unnamed user'}
          </h2>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            <StatusPill active={Boolean(user?.isActive)} />
            {user?.companyRole?.name ? (
              <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                {user.companyRole.name}
              </span>
            ) : null}
            {user?.isCompanyAdmin ? (
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                Admin
              </span>
            ) : null}
            {canEdit ? (
              <button
                type="button"
                onClick={onEdit}
                aria-label="Edit member"
                title="Edit member"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-brand-200 bg-white text-brand-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50"
              >
                <Pencil className="h-3 w-3" strokeWidth={2} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 border-t border-surface-border" />

        <SidebarSection title="About">
          <InfoLine icon={Phone} label="Phone" value={user?.businessPhone} />
          <InfoLine icon={Mail} label="Email" value={user?.email} title={user?.email} valueClassName="break-all" />
          <InfoLine icon={MessageCircle} label="WhatsApp" value={user?.whatsappNumber} />
        </SidebarSection>

        <div className="border-t border-surface-border" />

        <SidebarSection title="Address">
          <InfoLine icon={Home} label="Address" value={user?.street} />
          <InfoLine icon={MapPin} label="City state" value={cityState} />
          <InfoLine icon={Hash} label="Postcode" value={user?.postalCode} />
        </SidebarSection>

        <div className="border-t border-surface-border" />

        <SidebarSection title="Employee details">
          <InfoLine icon={Briefcase} label="Title" value={user?.jobTitle} />
          <InfoLine icon={Building2} label="Department" value={user?.department} />
          <InfoLine icon={IdCard} label="Role" value={user?.companyRole?.name} />
          <InfoLine
            icon={CalendarDays}
            label="Member since"
            value={user?.createdAt ? formatDateOnly(user.createdAt) : ''}
            title={formatAbsolute(user?.createdAt)}
          />
          <InfoLine
            icon={Clock}
            label="Last login"
            value={user?.lastLoginAt ? formatRelative(user.lastLoginAt) : 'Never'}
            title={formatAbsolute(user?.lastLoginAt)}
          />
          {user?.deactivatedAt ? (
            <InfoLine
              icon={CalendarClock}
              label="Deactivated"
              value={formatRelative(user.deactivatedAt)}
              title={formatAbsolute(user.deactivatedAt)}
            />
          ) : null}
        </SidebarSection>

        <div className="border-t border-surface-border" />

        <SidebarSection title="Workspaces">
          {user?.workspaces?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {user.workspaces.map((w) => (
                <span
                  key={w.id}
                  className="inline-flex items-center gap-1 rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px] text-ink-muted"
                >
                  <Users className="h-3 w-3 text-ink-faint" strokeWidth={1.75} />
                  {w.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-ink-faint">No workspace assigned</p>
          )}
        </SidebarSection>
      </div>
    </aside>
  )
}

export function TeamMemberProfilePage() {
  const { userId } = useParams()
  const [activeTab, setActiveTab] = useState('activity')
  const [editOpen, setEditOpen] = useState(false)

  const { data: userResp, isLoading: userLoading, error: userError, refetch: refetchUser } = useGetTeamUserQuery(userId, {
    skip: !userId,
  })
  const user = userResp?.data || null

  const baseFilter = useMemo(() => ({ userId }), [userId])

  const activityQuery = useGetActivitiesFeedQuery(baseFilter, {
    skip: !userId || activeTab !== 'activity',
  })
  const callsQuery = useGetActivitiesFeedQuery(
    { userId, types: 'call' },
    { skip: !userId || activeTab !== 'calls' },
  )
  const notesQuery = useGetActivitiesFeedQuery(
    { userId, types: 'note' },
    { skip: !userId || activeTab !== 'notes' },
  )
  const tasksQuery = useGetTasksQuery(
    { assignedTo: userId },
    { skip: !userId || activeTab !== 'tasks' },
  )
  const meetingsQuery = useGetMeetingsQuery(
    { page: 1, limit: 200, sortField: 'scheduledStart', sortOrder: 'desc' },
    { skip: !userId || activeTab !== 'meetings' },
  )
  const followupsQuery = useGetRemindersQuery(
    { ownerUserId: userId, limit: 100 },
    { skip: !userId || activeTab !== 'followups' },
  )

  const kpiTasksQuery = useGetTasksQuery(
    { assignedTo: userId, status: 'pending,in_progress' },
    { skip: !userId },
  )
  const kpiRemindersQuery = useGetRemindersQuery(
    { ownerUserId: userId, status: 'pending', limit: 100 },
    { skip: !userId },
  )
  const kpiWeekStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - 6)
    return d.toISOString()
  }, [])
  const kpiMonthStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(1)
    return d.toISOString()
  }, [])
  const kpiActivitiesThisWeek = useGetActivitiesFeedQuery(
    { userId, from: kpiWeekStart, limit: 100 },
    { skip: !userId },
  )
  const kpiCallsThisMonth = useGetActivitiesFeedQuery(
    { userId, from: kpiMonthStart, types: 'call', limit: 100 },
    { skip: !userId },
  )

  const openTasksCount = (kpiTasksQuery.data?.data || []).filter((t) => {
    const s = String(t?.status || 'pending').toLowerCase()
    return s === 'pending' || s === 'in_progress' || s === 'open'
  }).length
  const pendingFollowupsCount = (kpiRemindersQuery.data?.data || []).length
  const activitiesThisWeekCount = (kpiActivitiesThisWeek.data?.data || []).length
  const callsThisMonthCount = (kpiCallsThisMonth.data?.data || []).length
  const meetingsForUser = useMemo(() => {
    const rows = Array.isArray(meetingsQuery.data?.data) ? meetingsQuery.data.data : []
    if (!userId) return rows
    return rows.filter((m) => String(m.ownerUserId || '') === String(userId))
  }, [meetingsQuery.data, userId])

  const showLoading = userLoading && !user
  const showError = !userLoading && userError && !user

  return (
    <PageShell fullWidth>
      <div className="px-2 pb-1 pt-1 sm:px-3 sm:pb-3 sm:pt-1">
        {showLoading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
            <div className="h-[520px] animate-pulse rounded-2xl border border-surface-border bg-white" />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-2xl border border-surface-border bg-white" />
                ))}
              </div>
              <div className="h-[420px] animate-pulse rounded-2xl border border-surface-border bg-white" />
            </div>
          </div>
        ) : showError ? (
          isApiPermissionError(userError) ? (
            <PermissionDenied message="You don't have permission to view this team member." />
          ) : (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-sm text-rose-800">
              {apiErrorMessage(userError)}
            </div>
          )
        ) : user ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
            <ProfileSidebar user={user} onEdit={() => setEditOpen(true)} canEdit={Boolean(user?.isActive)} />

            <div className="min-w-0 space-y-4">
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard icon={CheckSquare} accent="brand" label="Open tasks" value={kpiTasksQuery.isLoading ? '—' : openTasksCount} />
                <KpiCard icon={Bell} accent="amber" label="Pending follow-ups" value={kpiRemindersQuery.isLoading ? '—' : pendingFollowupsCount} />
                <KpiCard icon={Sparkles} accent="indigo" label="Activities this week" value={kpiActivitiesThisWeek.isLoading ? '—' : activitiesThisWeekCount} />
                <KpiCard icon={PhoneCall} accent="emerald" label="Calls this month" value={kpiCallsThisMonth.isLoading ? '—' : callsThisMonthCount} />
              </section>

              <section className="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm">
                <div className="flex flex-wrap items-center gap-1 overflow-x-auto border-b border-surface-border px-2 py-1.5">
                  {TABS.map((tab) => {
                    const TabIcon = tab.icon
                    const active = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition',
                          active
                            ? 'bg-brand-50 text-brand-700 shadow-sm'
                            : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                        )}
                      >
                        <TabIcon className="h-3.5 w-3.5" />
                        {tab.label}
                      </button>
                    )
                  })}
                </div>

                <div className="bg-surface-muted/30 p-3 sm:p-4">
                  {activeTab === 'activity' ? (
                    <ListShell
                      isLoading={activityQuery.isLoading}
                      error={activityQuery.error}
                      emptyIcon={Sparkles}
                      emptyTitle="No activity yet"
                      emptyHint="Activities logged by this teammate will appear here."
                    >
                      {(activityQuery.data?.data || []).length
                        ? (activityQuery.data?.data || []).map((row) => <ActivityRow key={row.id} row={row} />)
                        : null}
                    </ListShell>
                  ) : null}

                  {activeTab === 'tasks' ? (
                    <ListShell
                      isLoading={tasksQuery.isLoading}
                      error={tasksQuery.error}
                      emptyIcon={CheckSquare}
                      emptyTitle="No tasks assigned"
                      emptyHint="Tasks assigned to this teammate will appear here."
                    >
                      {(tasksQuery.data?.data || []).length
                        ? (tasksQuery.data?.data || []).map((row) => <TaskRow key={row.id} row={row} />)
                        : null}
                    </ListShell>
                  ) : null}

                  {activeTab === 'calls' ? (
                    <ListShell
                      isLoading={callsQuery.isLoading}
                      error={callsQuery.error}
                      emptyIcon={PhoneCall}
                      emptyTitle="No calls logged"
                      emptyHint="Calls logged by this teammate will appear here."
                    >
                      {(callsQuery.data?.data || []).length
                        ? (callsQuery.data?.data || []).map((row) => <CallRow key={row.id} row={row} />)
                        : null}
                    </ListShell>
                  ) : null}

                  {activeTab === 'meetings' ? (
                    <ListShell
                      isLoading={meetingsQuery.isLoading}
                      error={meetingsQuery.error}
                      emptyIcon={Video}
                      emptyTitle="No meetings scheduled"
                      emptyHint="Meetings owned by this teammate will appear here."
                    >
                      {meetingsForUser.length ? meetingsForUser.map((row) => <MeetingRow key={row.id} row={row} />) : null}
                    </ListShell>
                  ) : null}

                  {activeTab === 'notes' ? (
                    <ListShell
                      isLoading={notesQuery.isLoading}
                      error={notesQuery.error}
                      emptyIcon={NotebookPen}
                      emptyTitle="No notes yet"
                      emptyHint="Notes authored by this teammate will appear here."
                    >
                      {(notesQuery.data?.data || []).length
                        ? (notesQuery.data?.data || []).map((row) => <ActivityRow key={row.id} row={row} />)
                        : null}
                    </ListShell>
                  ) : null}

                  {activeTab === 'followups' ? (
                    <ListShell
                      isLoading={followupsQuery.isLoading}
                      error={followupsQuery.error}
                      emptyIcon={Bell}
                      emptyTitle="No follow-ups"
                      emptyHint="Reminders owned by this teammate will appear here."
                    >
                      {(followupsQuery.data?.data || []).length
                        ? (followupsQuery.data?.data || []).map((row) => <ReminderRow key={row.id} row={row} />)
                        : null}
                    </ListShell>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </div>

      <TeamMemberAccessDrawer
        open={editOpen}
        user={user}
        onClose={() => setEditOpen(false)}
        onSaved={() => refetchUser()}
      />
    </PageShell>
  )
}

export default TeamMemberProfilePage
