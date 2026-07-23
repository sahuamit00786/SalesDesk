import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Flag,
  User,
} from '@/components/ui/icons'
import { cn } from '@/utils/cn'

export const DASHBOARD_EXPIRING_TASK_LIMIT = 6
export const EXPIRING_HORIZON_DAYS = 7

const PRIORITY_META = {
  urgent: { label: 'Urgent', flag: 'text-rose-600', chip: 'bg-rose-50 text-rose-800 ring-rose-200' },
  high: { label: 'High', flag: 'text-red-500', chip: 'bg-red-50 text-red-700 ring-red-200' },
  medium: { label: 'Medium', flag: 'text-amber-500', chip: 'bg-amber-50 text-amber-900 ring-amber-200' },
  low: { label: 'Low', flag: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
}

const STATUS_META = {
  pending: { label: 'Pending', chip: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'In progress', chip: 'bg-brand-50 text-brand-800' },
}

function isOpenTask(task) {
  const s = String(task?.status || '').toLowerCase()
  return s === 'pending' || s === 'in_progress'
}

function isOverdue(task) {
  if (typeof task?.isOverdue === 'boolean') return task.isOverdue
  if (!task?.dueAt) return false
  const t = new Date(task.dueAt).getTime()
  return !Number.isNaN(t) && t < Date.now()
}

export function isExpiringTask(task, horizonDays = EXPIRING_HORIZON_DAYS) {
  if (!isOpenTask(task) || !task?.dueAt) return false
  const due = new Date(task.dueAt).getTime()
  if (Number.isNaN(due)) return false
  const horizonMs = horizonDays * 24 * 60 * 60 * 1000
  return due <= Date.now() + horizonMs
}

export function sortExpiringTasks(tasks) {
  const prio = (p) => ({ urgent: 0, high: 1, medium: 2, low: 3 }[String(p || 'medium').toLowerCase()] ?? 2)
  return [...tasks].sort((a, b) => {
    const oa = isOverdue(a) ? 1 : 0
    const ob = isOverdue(b) ? 1 : 0
    if (oa !== ob) return ob - oa
    const da = new Date(a.dueAt).getTime()
    const db = new Date(b.dueAt).getTime()
    if (da !== db) return da - db
    return prio(a.priority) - prio(b.priority)
  })
}

function dueMeta(dueAt) {
  const d = new Date(dueAt)
  if (Number.isNaN(d.getTime())) return { label: 'No due date', tone: 'muted', badge: 'bg-slate-100 text-slate-600' }
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((day - today) / (24 * 60 * 60 * 1000))
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

  if (diffDays < 0) {
    const n = Math.abs(diffDays)
    return {
      label: n === 1 ? '1 day overdue' : `${n} days overdue`,
      sub: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      tone: 'overdue',
      badge: 'bg-rose-100 text-rose-800 ring-rose-200',
    }
  }
  if (diffDays === 0) {
    return { label: 'Due today', sub: time, tone: 'today', badge: 'bg-amber-100 text-amber-900 ring-amber-200' }
  }
  if (diffDays === 1) {
    return { label: 'Due tomorrow', sub: time, tone: 'soon', badge: 'bg-orange-100 text-orange-900 ring-orange-200' }
  }
  if (diffDays <= EXPIRING_HORIZON_DAYS) {
    return {
      label: `Due in ${diffDays} days`,
      sub: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      tone: 'upcoming',
      badge: 'bg-brand-50 text-brand-800 ring-brand-200',
    }
  }
  return {
    label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    sub: time,
    tone: 'muted',
    badge: 'bg-slate-100 text-slate-600 ring-slate-200',
  }
}

function taskProgress(task) {
  if (task.status === 'completed') return { pct: 100, label: 'Done' }
  const subs = Array.isArray(task.subtasks) ? task.subtasks : []
  if (!subs.length) return null
  const done = subs.filter((s) => s.done).length
  return { pct: Math.round((done / subs.length) * 100), label: `${done}/${subs.length}` }
}

function ProgressRing({ value, size = 40, stroke = 3 }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, value))
  const offset = c - (pct / 100) * c
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--brand-primary, #4f46e5)"
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  )
}

function initials(name) {
  const n = String(name || '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function DashboardExpiringTasksSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-surface-border bg-white p-4 shadow-sm"
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="h-6 w-24 rounded-full bg-surface-subtle" />
            <div className="h-10 w-10 rounded-full bg-surface-subtle" />
          </div>
          <div className="mt-4 h-4 w-4/5 rounded bg-surface-subtle" />
          <div className="mt-2 h-3 w-1/2 rounded bg-surface-subtle" />
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-16 rounded-md bg-surface-subtle" />
            <div className="h-6 w-20 rounded-md bg-surface-subtle" />
          </div>
          <div className="mt-4 h-9 w-full rounded-xl bg-surface-subtle" />
        </div>
      ))}
    </div>
  )
}

function ExpiringTaskCard({ task }) {
  const priority = PRIORITY_META[String(task.priority || 'medium').toLowerCase()] || PRIORITY_META.medium
  const status = STATUS_META[String(task.status || 'pending').toLowerCase()] || STATUS_META.pending
  const due = dueMeta(task.dueAt)
  const overdue = isOverdue(task)
  const progress = taskProgress(task)
  const leadLabel = task.lead?.contactName || task.lead?.title || task.lead?.email || null
  const assigneeName = task.assignee?.name || task.assignee?.email || null
  const href = task.leadId ? `/leads/${task.leadId}` : '/tasks'

  return (
    <Link
      to={href}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
        overdue ? 'border-rose-200/80 ring-1 ring-rose-100' : 'border-surface-border hover:border-brand-200',
      )}
    >
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          due.tone === 'overdue' && 'bg-rose-500',
          due.tone === 'today' && 'bg-amber-500',
          due.tone === 'soon' && 'bg-orange-400',
          due.tone === 'upcoming' && 'bg-brand-500',
          due.tone === 'muted' && 'bg-slate-300',
        )}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-3 pl-2">
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1', due.badge)}>
          {overdue ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />}
          {due.label}
        </span>
        {progress ? (
          <div className="relative shrink-0">
            <ProgressRing value={progress.pct} />
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-ink-muted">
              {progress.label}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-3 min-w-0 flex-1 pl-2">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink group-hover:text-brand-700">
          {task.title || 'Untitled task'}
        </p>
        {leadLabel ? (
          <p className="mt-1.5 truncate text-xs text-ink-muted">
            <span className="font-medium text-ink-faint">Lead · </span>
            {leadLabel}
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-2">
        <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1', priority.chip)}>
          <Flag className={cn('h-3 w-3 fill-current', priority.flag)} strokeWidth={1.5} aria-hidden />
          {priority.label}
        </span>
        <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-semibold', status.chip)}>{status.label}</span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-surface-border/80 pt-3 pl-2">
        <div className="flex min-w-0 items-center gap-2 text-xs text-ink-muted">
          {assigneeName ? (
            <>
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-[10px] font-bold text-brand-800">
                {initials(assigneeName)}
              </span>
              <span className="truncate">{assigneeName}</span>
            </>
          ) : (
            <>
              <User className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
              <span>Unassigned</span>
            </>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end text-right">
          {due.sub ? (
            <span className="flex items-center gap-1 text-[11px] font-medium text-ink-muted">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              {due.sub}
            </span>
          ) : null}
          <span className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-semibold text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
            Open
            <ArrowRight className="h-3 w-3" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  )
}

export function DashboardExpiringTasks({ tasks, loading, error, noAccess }) {
  if (loading) return <DashboardExpiringTasksSkeleton />

  if (noAccess) {
    return (
      <p className="rounded-2xl border border-surface-border bg-surface-subtle px-4 py-3 text-sm text-ink-muted">
        You don't have permission to view tasks. Contact your workspace admin for access.
      </p>
    )
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        Could not load tasks.
      </p>
    )
  }

  if (!tasks.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border bg-white px-6 py-12 text-center shadow-sm">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" aria-hidden />
        <p className="mt-3 text-sm font-medium text-ink">No tasks expiring soon</p>
        <p className="mt-1 max-w-sm text-xs text-ink-muted">
          Open tasks with a due date in the next {EXPIRING_HORIZON_DAYS} days (or overdue) will show up here.
        </p>
        <Link to="/tasks" className="mt-4 text-sm font-semibold text-brand-600 hover:underline">
          Go to Tasks
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {tasks.map((task) => (
        <ExpiringTaskCard key={task.id} task={task} />
      ))}
    </div>
  )
}
