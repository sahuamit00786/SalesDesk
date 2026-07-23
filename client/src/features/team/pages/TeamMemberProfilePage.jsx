import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Bell,
  Briefcase,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  Clock,
  Hash,
  Home,
  IdCard,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  NotebookPen,
  Pencil,
  Phone,
  PhoneCall,
  Presentation,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
} from '@/components/ui/icons'
import { PageShell } from '@/components/layout/PageShell'
import { TeamMemberAccessDrawer } from '@/features/team/components/TeamMemberAccessDrawer'
import { MyProfileEditDrawer } from '@/features/team/components/MyProfileEditDrawer'
import { useGetTeamUserQuery } from '@/features/team/teamApi'
import { useAppSelector } from '@/app/hooks'
import { labelCompanyUserRoleKind } from '@/constants/companyUserRoleKind'
import { useGetActivitiesFeedQuery } from '@/features/activities/activitiesApi'
import { useGetTasksQuery } from '@/features/tasks/tasksApi'
import { TaskAttachmentIcons } from '@/features/leads/components/TaskAttachmentIcons'
import { LeadTabSectionHeader, LeadTabEmptyState } from '@/features/leads/components/LeadTabSectionHeader'
import { useGetMeetingsQuery } from '@/features/meetings/meetingsApi'
import { useGetRemindersQuery } from '@/features/reminders/remindersApi'
import { cn } from '@/utils/cn'
import { usePermission } from '@/hooks/usePermission'

const TABS = [
  { id: 'activity', label: 'Activity', icon: Sparkles },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'meetings', label: 'Meetings', icon: Video },
  { id: 'calls', label: 'Calls', icon: PhoneCall },
  { id: 'notes', label: 'Notes', icon: NotebookPen },
  { id: 'followups', label: 'Follow-ups', icon: Bell },
]

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

const TIMELINE_STYLE = {
  note: { Icon: NotebookPen, iconWrap: 'bg-brand-100 text-brand-700', card: 'bg-brand-50' },
  call: { Icon: PhoneCall, iconWrap: 'bg-emerald-100 text-emerald-700', card: 'bg-emerald-50' },
  meeting: { Icon: CalendarCheck2, iconWrap: 'bg-slate-100 text-brand-700', card: 'bg-slate-50' },
  follow_up: { Icon: Bell, iconWrap: 'bg-sky-100 text-sky-700', card: 'bg-sky-50' },
  task: { Icon: CheckSquare, iconWrap: 'bg-sky-100 text-sky-700', card: 'bg-sky-50' },
  system: { Icon: Sparkles, iconWrap: 'bg-slate-100 text-slate-700', card: 'bg-slate-50' },
}

function timelineStyleFor(type) {
  return TIMELINE_STYLE[type] || TIMELINE_STYLE.system
}

function activityDayKey(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function activityDayLabel(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function activityTimeLabel(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function activityDateTimeLabel(value) {
  return `${activityDayLabel(value)}, ${activityTimeLabel(value)}`
}

function formatTaskDueParts(value) {
  if (!value) return { dateLine: '—', timeLine: null }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return { dateLine: '—', timeLine: null }
  return {
    dateLine: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    timeLine: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  }
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
    <section className="px-4 py-2">
      <h3 className="border-b border-surface-border pb-2 text-sm font-semibold text-ink">{title}</h3>
      <div className="divide-y divide-surface-border">{children}</div>
    </section>
  )
}

function InfoLine({ icon: Icon, label, value, valueClassName, href, title }) {
  return (
    <div className="flex items-start gap-2.5 py-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-ink-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        {href && value ? (
          <a href={href} className={cn('mt-0.5 block break-all text-sm font-medium text-ink hover:text-brand-700', valueClassName)} title={title}>
            {value}
          </a>
        ) : (
          <p className={cn('mt-0.5 break-words text-sm font-medium text-ink', valueClassName)} title={title}>
            {value || <span className="text-ink-faint">—</span>}
          </p>
        )}
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, accent = 'brand' }) {
  const palette = {
    brand: 'bg-slate-100 text-brand-700',
    amber: 'bg-amber-50 text-amber-700',
    indigo: 'bg-brand-50 text-brand-700',
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

function ListShell({ isLoading, error, emptyIcon, emptyTitle, emptyHint, wrapperClassName = 'space-y-2', children }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-2xl border border-[#C9BDE8] bg-[#F9F7FC]" />
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
    return <LeadTabEmptyState icon={emptyIcon} title={emptyTitle} description={emptyHint} />
  }
  return <div className={wrapperClassName}>{children}</div>
}

/** Timeline row matching LeadDetailPage's activity/calls feed: day-time column, connecting line, colored icon + card. */
function TimelineRow({ row, showDayMarker, styleKey }) {
  const meta = row.metadata || {}
  const presentation = timelineStyleFor(styleKey)
  const Icon = presentation.Icon
  const isNote = row.type === 'note'
  const title = isNote ? meta.title?.trim() || 'Note added' : meta.title || row.body || 'Activity'
  const detail = (meta.description || (meta.title && row.body !== meta.title ? row.body : '') || '').trim()
  return (
    <article className="grid grid-cols-[130px_36px_minmax(0,1fr)] gap-2 py-1.5">
      <span className="pt-1 text-xs text-ink-muted">
        {showDayMarker ? activityDateTimeLabel(row.createdAt) : activityTimeLabel(row.createdAt)}
      </span>
      <div className="relative flex justify-center">
        <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-surface-border" aria-hidden="true" />
        <span className={`relative z-10 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full ${presentation.iconWrap}`}>
          <Icon size={14} />
        </span>
      </div>
      <div className={`rounded-xl p-2.5 ${presentation.card}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-semibold text-ink">{title}</p>
          {row.lead?.title ? (
            <Link
              to={`/leads/${row.lead.id}`}
              className="shrink-0 truncate rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px] text-ink-muted hover:border-brand-200 hover:text-brand-700"
            >
              {row.lead.title}
            </Link>
          ) : null}
        </div>
        {detail ? <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{detail}</p> : null}
        <p className="mt-2 text-right text-[11px] font-medium text-ink-muted">by {row.user?.name || 'System user'}</p>
      </div>
    </article>
  )
}

/** Task card matching LeadDetailPage's task card: title+badges header, gradient due box, description box, footer byline. */
function TaskRow({ row }) {
  const rawStatus = String(row.status || 'pending').toLowerCase()
  const status = rawStatus === 'open' ? 'pending' : rawStatus
  const statusClass =
    status === 'completed'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'cancelled'
        ? 'border-surface-border bg-white text-ink-faint'
        : status === 'in_progress'
          ? 'border-brand-200 bg-brand-50 text-brand-700'
          : 'border-slate-200 bg-slate-50 text-slate-700'
  const statusLabel = status === 'in_progress' ? 'In progress' : status
  const priority = String(row.priority || '').toLowerCase()
  const priorityClass =
    priority === 'urgent'
      ? 'border-red-200 bg-red-50 text-red-700'
      : priority === 'high'
        ? 'border-brand-200 bg-brand-50 text-brand-700'
        : priority === 'medium'
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-surface-border bg-white text-ink-muted'
  const isOverdue = Boolean(row.isOverdue) || Boolean(row.dueAt && status !== 'completed' && status !== 'cancelled' && new Date(row.dueAt).getTime() < Date.now())
  const subtasks = Array.isArray(row.subtasks) ? row.subtasks : []
  const doneSubtasks = subtasks.filter((s) => s?.done).length
  const assigneeName = row.assignee?.name || row.assignee?.email || ''
  const creatorName = row.creator?.name || row.creator?.email || ''
  const dueParts = formatTaskDueParts(row.dueAt)

  return (
    <div
      className={cn(
        'rounded-2xl border bg-white shadow-sm ring-1 ring-slate-100/80',
        isOverdue ? 'border-red-200 border-l-4 border-l-red-500' : 'border-surface-border',
      )}
    >
      <div className="border-b border-surface-border px-4 py-3 sm:px-5">
        <h3 className="text-base font-semibold leading-snug text-ink">{row.title || 'Untitled task'}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
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
          <TaskAttachmentIcons attachments={row.attachments} variant="compact" />
          {row.lead?.title ? (
            <Link
              to={`/leads/${row.lead.id}`}
              className="truncate rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px] text-ink-muted hover:border-brand-200 hover:text-brand-700"
            >
              {row.lead.title}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 px-4 py-4 sm:px-5">
        {row.dueAt ? (
          <div
            className={`rounded-xl border px-3 py-2.5 ${
              isOverdue ? 'border-red-200 bg-gradient-to-br from-red-50/90 to-white' : 'border-slate-200 bg-gradient-to-br from-slate-50 to-white'
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Due</p>
            <p className={`mt-0.5 text-sm font-semibold ${isOverdue ? 'text-red-900' : 'text-ink'}`}>{dueParts.dateLine}</p>
            {dueParts.timeLine ? <p className="mt-0.5 text-xs tabular-nums text-ink-muted">{dueParts.timeLine}</p> : null}
          </div>
        ) : (
          <p className="text-xs text-ink-muted">No due date set.</p>
        )}

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Description</p>
          {row.description ? (
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink line-clamp-6">{row.description}</p>
          ) : (
            <p className="mt-1.5 text-sm italic text-ink-muted">No description.</p>
          )}
        </div>

        {subtasks.length ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Subtasks</p>
            <ul className="mt-2 space-y-1.5">
              {subtasks.map((subtask, index) => (
                <li key={`${row.id}-sub-${index}`}>
                  <div
                    className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs ${
                      subtask.done ? 'border-emerald-100 bg-emerald-50/50 text-ink-muted' : 'border-slate-200 bg-white text-ink'
                    }`}
                  >
                    <span className={`min-w-0 truncate font-medium ${subtask.done ? 'line-through' : ''}`}>{subtask.title || 'Untitled'}</span>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${subtask.done ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                      {subtask.done ? 'Done' : 'Open'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-surface-border pt-2.5 text-[10px] leading-tight text-ink-muted">
          <span>
            By <span className="font-medium text-ink/80">{creatorName || 'System'}</span>
          </span>
          <span aria-hidden className="text-ink-faint">·</span>
          <span>
            {assigneeName ? (
              <>Assigned <span className="font-medium text-ink/80">{assigneeName}</span></>
            ) : (
              <span>Unassigned</span>
            )}
          </span>
          {subtasks.length ? (
            <>
              <span aria-hidden className="text-ink-faint">·</span>
              <span>{doneSubtasks}/{subtasks.length} subtasks done</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** Follow-up card matching LeadFollowupsTab's tone system (expired/upcoming/done/cancelled). */
function ReminderRow({ row }) {
  const status = String(row.status || 'pending').toLowerCase()
  const at = row.remindAt ? new Date(row.remindAt) : null
  const tMs = at ? at.getTime() : null
  const expired = status === 'pending' && tMs != null && tMs < Date.now()
  const upcoming = status === 'pending' && tMs != null && tMs >= Date.now()
  let tone = 'settled'
  if (expired) tone = 'expired'
  else if (upcoming) tone = 'upcoming'
  else if (status === 'done') tone = 'done'
  else if (status === 'cancelled' || status === 'dismissed') tone = 'cancelled'
  const toneClass = {
    expired: { card: 'border border-red-200/80 bg-white', bar: 'bg-red-300/70', pill: 'bg-red-50 text-red-800 ring-1 ring-red-100' },
    upcoming: { card: 'border border-amber-200/80 bg-white', bar: 'bg-amber-300/65', pill: 'bg-amber-50 text-amber-900 ring-1 ring-amber-100' },
    done: { card: 'border border-emerald-200/70 bg-white', bar: 'bg-emerald-300/55', pill: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100' },
    cancelled: { card: 'border border-slate-200 bg-slate-50/40', bar: 'bg-slate-300/60', pill: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80' },
    settled: { card: 'border border-slate-200 bg-white', bar: 'bg-slate-300/45', pill: 'bg-slate-100 text-slate-700' },
  }[tone]
  const targetLabel = [row.targetType, row.targetId].filter(Boolean).join(' · ')

  return (
    <div className={`group relative overflow-hidden rounded-xl shadow-sm ring-1 ring-slate-100/80 transition hover:shadow-md ${toneClass.card}`}>
      <div className={`absolute left-0 top-0 h-full w-0.5 ${toneClass.bar}`} aria-hidden />
      <div className="relative pl-3.5 pr-3 pt-2.5 pb-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneClass.pill}`}>{status}</span>
          <span className="shrink-0 text-[11px] text-ink-faint" title={formatAbsolute(row.remindAt)}>
            {formatRelative(row.remindAt)}
          </span>
        </div>
        <p className="mt-1.5 truncate text-sm font-medium text-ink">{row.title || 'Reminder'}</p>
        {row.notes ? <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{row.notes}</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-muted">
          <span>Remind at: <span className="text-ink">{formatAbsolute(row.remindAt) || '—'}</span></span>
          {targetLabel ? <span>Target: <span className="text-ink">{targetLabel}</span></span> : null}
        </div>
      </div>
    </div>
  )
}

/** Meeting card matching LeadDetailPage's meeting card: live/upcoming/completed badge, meta lines, agenda box, Join button. */
function MeetingRow({ row, nowMs }) {
  const start = row.scheduledStart ? new Date(row.scheduledStart) : null
  const end = row.scheduledEnd ? new Date(row.scheduledEnd) : null
  const startTime = start ? start.getTime() : null
  const endTime = end ? end.getTime() : null
  const now = nowMs ?? Date.now()
  const isUpcoming = startTime != null && now < startTime
  const isLive = startTime != null && endTime != null && now >= startTime && now <= endTime
  const isCompleted = endTime != null && now > endTime && row.status === 'completed'
  const isExpiredForJoin = endTime != null && now > endTime && row.status !== 'completed'
  const joinDisabled = !row.googleMeetLink || row.status === 'completed' || isExpiredForJoin
  const participants = Array.isArray(row.participants) ? row.participants : []

  return (
    <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-ink">{row.title || 'Meeting'}</h3>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                isLive
                  ? 'bg-green-100 text-green-700'
                  : isUpcoming
                    ? 'bg-brand-100 text-brand-700'
                    : isCompleted
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
              }`}
            >
              {isLive ? 'LIVE' : isUpcoming ? 'UPCOMING' : isCompleted ? 'COMPLETED' : 'EXPIRED'}
            </span>
          </div>
          <p className="text-sm text-ink-muted">{String(row.meetingType || '').replace(/_/g, ' ') || 'meeting'}</p>
          {start ? (
            <p className="text-sm text-ink-muted">
              📅 {start.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          ) : null}
          {start && end ? (
            <p className="text-sm text-ink-muted">
              🕒 {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          ) : null}
          {row.agenda ? <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{row.agenda}</div> : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {joinDisabled ? (
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              <Presentation className="h-4 w-4" />
              {row.status === 'completed' ? 'Completed' : isExpiredForJoin ? 'Expired' : 'No Link'}
            </button>
          ) : (
            <a
              href={row.googleMeetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold cx-icon-inherit text-white hover:bg-green-700"
            >
              <Presentation className="h-4 w-4" />
              Join Meeting
            </a>
          )}
        </div>
      </div>

      {participants.length ? (
        <div className="mt-4 border-t border-surface-border pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Participants</p>
          <div className="flex flex-wrap gap-2">
            {participants.map((p) => (
              <span key={p.userId} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-brand-700">
                {p.user?.name || p.user?.email || p.userId}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** Sticky-note style card matching LeadDetailPage's Notes tab grid. */
function NoteCard({ row }) {
  const title = row.metadata?.title || 'Note'
  const body = row.body || row.metadata?.description || ''
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-b from-amber-50/90 to-white p-4 shadow-sm ring-1 ring-amber-100/40 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-semibold text-ink line-clamp-1">{title}</p>
        <p className="shrink-0 text-[11px] text-ink-muted">{new Date(row.createdAt).toLocaleDateString()}</p>
      </div>
      <p className="mt-0.5 text-[11px] text-ink-muted">By {row.user?.name || 'System'}</p>
      <div className="note-card-preview prose prose-sm mt-3 max-h-[200px] w-full overflow-hidden rounded-xl border border-amber-100/80 bg-white/90 p-3 text-xs leading-relaxed text-ink prose-p:my-1 prose-headings:my-1">
        {body ? <p>{body}</p> : <span className="italic text-ink-muted">Empty note</span>}
      </div>
    </div>
  )
}

function ProfileSidebar({ user, onEdit, canEdit = true, isSelf = false }) {
  const headerInitials = initialsFor(user?.name || user?.email || '')
  const cityState = [user?.city, user?.country].filter(Boolean).join(', ')
  const roleLabel = user?.companyRole?.name
    ? `${user.companyRole.name}${
        user.companyRole.userRoleKind ? ` · ${labelCompanyUserRoleKind(user.companyRole.userRoleKind)}` : ''
      }`
    : null
  return (
    <aside className="space-y-3">
      <section className="overflow-hidden rounded-2xl border border-surface-border bg-white">
        <div className="p-3.5">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-2xl font-semibold text-brand-700">
              {user?.profilePhotoUrl ? (
                <img src={user.profilePhotoUrl} alt={user?.name || 'User'} className="h-20 w-20 rounded-full object-cover" />
              ) : (
                headerInitials
              )}
            </div>
            <div className="mt-2 flex w-full min-w-0 items-center justify-center gap-2">
              <p className="min-w-0 max-w-full truncate text-xl font-semibold text-ink" title={user?.name || 'Unnamed user'}>
                {user?.name || 'Unnamed user'}
              </p>
              {canEdit ? (
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-white text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
                  aria-label="Edit member"
                  title="Edit member"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </button>
              ) : null}
              {isSelf ? null : (
                <Link
                  to={`/team/${user?.id}/permissions`}
                  aria-label="Menu permissions"
                  title="Menu permissions"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-white text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
                >
                  <Lock className="h-3.5 w-3.5" aria-hidden />
                </Link>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-muted">{user?.jobTitle || roleLabel || 'Team member'}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
              <StatusPill active={Boolean(user?.isActive)} />
              {user?.companyRole?.name ? (
                <span className="rounded-full border border-brand-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                  {user.companyRole.name}
                </span>
              ) : null}
              {user?.isCompanyAdmin ? (
                <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                  Admin
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-t border-surface-border">
          <SidebarSection title="About">
            <InfoLine icon={Phone} label="Phone" value={user?.businessPhone} />
            <InfoLine icon={Mail} label="Email" value={user?.email} href={user?.email ? `mailto:${user.email}` : undefined} title={user?.email} />
            <InfoLine icon={MessageCircle} label="WhatsApp" value={user?.whatsappNumber} />
          </SidebarSection>
        </div>

        <div className="border-t border-surface-border">
          <SidebarSection title="Address">
            <InfoLine icon={Home} label="Address" value={user?.street} />
            <InfoLine icon={MapPin} label="City, state" value={cityState} />
            <InfoLine icon={Hash} label="Postcode" value={user?.postalCode} />
          </SidebarSection>
        </div>

        <div className="border-t border-surface-border">
          <SidebarSection title="Employee details">
            <InfoLine icon={Briefcase} label="Title" value={user?.jobTitle} />
            <InfoLine icon={IdCard} label="Role" value={roleLabel} />
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
        </div>

        <div className="border-t border-surface-border">
          <section className="px-4 py-3">
            <p className="text-sm font-semibold text-ink">Workspaces</p>
            <div className="mt-1.5">
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
            </div>
          </section>
        </div>
      </section>
    </aside>
  )
}

export function TeamMemberProfilePage() {
  const { userId: routeUserId } = useParams()
  const currentUser = useAppSelector((s) => s.auth.user)
  const userId = routeUserId || currentUser?.id
  const isSelf = Boolean(currentUser?.id) && String(currentUser.id) === String(userId)
  const canAdminTeam = usePermission('settings.team', 'admin')
  const [activeTab, setActiveTab] = useState('activity')
  const [editOpen, setEditOpen] = useState(false)
  const [meetingListNow] = useState(() => Date.now())

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
      <div className="grid gap-2 px-2 py-2 lg:grid-cols-[320px_1fr] lg:px-3 lg:py-2.5">
        {showLoading ? (
          <div className="col-span-full grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
            <div className="h-[520px] animate-pulse rounded-2xl border border-[#C9BDE8] bg-[#F9F7FC]" />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-2xl border border-[#C9BDE8] bg-[#F9F7FC]" />
                ))}
              </div>
              <div className="h-[420px] animate-pulse rounded-2xl border border-[#C9BDE8] bg-[#F9F7FC]" />
            </div>
          </div>
        ) : showError ? (
          <div className="col-span-full">
            {isApiPermissionError(userError) ? (
              <PermissionDenied message="You don't have permission to view this team member." />
            ) : (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-sm text-rose-800">
                {apiErrorMessage(userError)}
              </div>
            )}
          </div>
        ) : user ? (
          <>
            <ProfileSidebar
              user={user}
              onEdit={() => setEditOpen(true)}
              canEdit={isSelf || (canAdminTeam && Boolean(user?.isActive))}
              isSelf={isSelf}
            />

            <section className="rounded-2xl border border-surface-border bg-white p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-3 border-b border-surface-border pb-4 sm:grid-cols-4">
                <KpiCard icon={CheckSquare} accent="brand" label="Open tasks" value={kpiTasksQuery.isLoading ? '—' : openTasksCount} />
                <KpiCard icon={Bell} accent="amber" label="Pending follow-ups" value={kpiRemindersQuery.isLoading ? '—' : pendingFollowupsCount} />
                <KpiCard icon={Sparkles} accent="indigo" label="Activities this week" value={kpiActivitiesThisWeek.isLoading ? '—' : activitiesThisWeekCount} />
                <KpiCard icon={PhoneCall} accent="emerald" label="Calls this month" value={kpiCallsThisMonth.isLoading ? '—' : callsThisMonthCount} />
              </div>

              <div className="flex flex-col gap-3 border-b border-surface-border pb-0 pt-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                <div className="-mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`h-9 shrink-0 border-b-2 px-3 text-sm ${
                        activeTab === tab.id
                          ? 'border-brand-600 bg-white font-semibold text-ink'
                          : 'border-transparent text-ink-muted hover:text-ink'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === 'activity' ? (
                <div className="mt-4 space-y-4">
                  <LeadTabSectionHeader title="Activity" description="Everything logged by this teammate, most recent first." />
                  <ListShell
                    isLoading={activityQuery.isLoading}
                    error={activityQuery.error}
                    emptyIcon={Sparkles}
                    emptyTitle="No activity yet"
                    emptyHint="Activities logged by this teammate will appear here."
                    wrapperClassName="space-y-0"
                  >
                    {(() => {
                      const rows = activityQuery.data?.data || []
                      if (!rows.length) return null
                      return rows.map((row, index) => {
                        const styleKey = row.metadata?.activityTypeKey || row.type || 'system'
                        const currentDayKey = activityDayKey(row.createdAt)
                        const previousDayKey = index > 0 ? activityDayKey(rows[index - 1].createdAt) : null
                        const showDayMarker = index === 0 || currentDayKey !== previousDayKey
                        return <TimelineRow key={row.id} row={row} styleKey={styleKey} showDayMarker={showDayMarker} />
                      })
                    })()}
                  </ListShell>
                </div>
              ) : null}

              {activeTab === 'tasks' ? (
                <div className="mt-4 space-y-4">
                  <LeadTabSectionHeader title="Tasks" description="Open tasks first, soonest due date at the top." />
                  <ListShell
                    isLoading={tasksQuery.isLoading}
                    error={tasksQuery.error}
                    emptyIcon={CheckSquare}
                    emptyTitle="No tasks assigned"
                    emptyHint="Tasks assigned to this teammate will appear here."
                    wrapperClassName="space-y-3"
                  >
                    {(tasksQuery.data?.data || []).length
                      ? (tasksQuery.data?.data || []).map((row) => <TaskRow key={row.id} row={row} />)
                      : null}
                  </ListShell>
                </div>
              ) : null}

              {activeTab === 'calls' ? (
                <div className="mt-4 space-y-4">
                  <LeadTabSectionHeader title="Calls" description="Calls logged by this teammate, most recent first." />
                  <ListShell
                    isLoading={callsQuery.isLoading}
                    error={callsQuery.error}
                    emptyIcon={PhoneCall}
                    emptyTitle="No calls logged"
                    emptyHint="Calls logged by this teammate will appear here."
                    wrapperClassName="space-y-0"
                  >
                    {(() => {
                      const rows = callsQuery.data?.data || []
                      if (!rows.length) return null
                      return rows.map((row, index) => {
                        const currentDayKey = activityDayKey(row.createdAt)
                        const previousDayKey = index > 0 ? activityDayKey(rows[index - 1].createdAt) : null
                        const showDayMarker = index === 0 || currentDayKey !== previousDayKey
                        return <TimelineRow key={row.id} row={row} styleKey="call" showDayMarker={showDayMarker} />
                      })
                    })()}
                  </ListShell>
                </div>
              ) : null}

              {activeTab === 'meetings' ? (
                <div className="mt-4 space-y-4">
                  <LeadTabSectionHeader title="Meetings" description="Meetings owned by this teammate appear below." />
                  <ListShell
                    isLoading={meetingsQuery.isLoading}
                    error={meetingsQuery.error}
                    emptyIcon={Video}
                    emptyTitle="No meetings scheduled"
                    emptyHint="Meetings owned by this teammate will appear here."
                    wrapperClassName="space-y-3"
                  >
                    {meetingsForUser.length ? meetingsForUser.map((row) => <MeetingRow key={row.id} row={row} nowMs={meetingListNow} />) : null}
                  </ListShell>
                </div>
              ) : null}

              {activeTab === 'notes' ? (
                <div className="mt-4 space-y-4">
                  <LeadTabSectionHeader title="Notes" description="Notes authored by this teammate." />
                  <ListShell
                    isLoading={notesQuery.isLoading}
                    error={notesQuery.error}
                    emptyIcon={NotebookPen}
                    emptyTitle="No notes yet"
                    emptyHint="Notes authored by this teammate will appear here."
                    wrapperClassName="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                  >
                    {(notesQuery.data?.data || []).length
                      ? (notesQuery.data?.data || []).map((row) => <NoteCard key={row.id} row={row} />)
                      : null}
                  </ListShell>
                </div>
              ) : null}

              {activeTab === 'followups' ? (
                <div className="mt-4 space-y-4">
                  <LeadTabSectionHeader title="Follow-ups" description="Reminders owned by this teammate." />
                  <ListShell
                    isLoading={followupsQuery.isLoading}
                    error={followupsQuery.error}
                    emptyIcon={Bell}
                    emptyTitle="No follow-ups"
                    emptyHint="Reminders owned by this teammate will appear here."
                    wrapperClassName="grid w-full grid-cols-1 gap-2.5"
                  >
                    {(followupsQuery.data?.data || []).length
                      ? (followupsQuery.data?.data || []).map((row) => <ReminderRow key={row.id} row={row} />)
                      : null}
                  </ListShell>
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </div>

      {isSelf ? (
        <MyProfileEditDrawer
          open={editOpen}
          user={user}
          onClose={() => setEditOpen(false)}
          onSaved={() => refetchUser()}
        />
      ) : (
        <TeamMemberAccessDrawer
          open={editOpen}
          user={user}
          onClose={() => setEditOpen(false)}
          onSaved={() => refetchUser()}
        />
      )}
    </PageShell>
  )
}

export default TeamMemberProfilePage
