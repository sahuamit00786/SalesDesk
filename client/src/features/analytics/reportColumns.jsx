import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

export function fmtReportDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function fmtReportDateTime(v) {
  if (!v) return '—'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-neutral-100 text-neutral-600',
}

const PRIORITY_STYLES = {
  low: 'bg-neutral-100 text-neutral-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-rose-100 text-rose-700',
}

export function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase()
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize', STATUS_STYLES[s] || 'bg-neutral-100 text-neutral-600')}>
      {s.replace(/_/g, ' ')}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  const p = String(priority || '').toLowerCase()
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize', PRIORITY_STYLES[p] || 'bg-neutral-100 text-neutral-600')}>
      {p || '—'}
    </span>
  )
}

export function LeadLinkCell({ leadId, label }) {
  if (!leadId) return <span className="text-ink-muted">—</span>
  return (
    <Link to={`/leads/${leadId}`} className="font-medium text-brand-700 hover:underline">
      {label || 'View lead'}
    </Link>
  )
}

export const TASK_DETAIL_COLS = [
  {
    key: 'title',
    label: 'Task',
    render: (v, row) => (
      <div className="max-w-[220px]">
        <p className="truncate font-medium text-ink" title={v}>{v || '—'}</p>
        {row.taskType ? <p className="truncate text-[11px] capitalize text-ink-faint">{String(row.taskType).replace(/_/g, ' ')}</p> : null}
      </div>
    ),
  },
  {
    key: 'assignee',
    label: 'Assigned to',
    render: (v, row) => (
      <div className="max-w-[160px]">
        <p className="truncate font-medium text-ink">{v || 'Unassigned'}</p>
        {row.assigneeEmail ? <p className="truncate text-[11px] text-ink-faint">{row.assigneeEmail}</p> : null}
      </div>
    ),
  },
  {
    key: 'lead',
    label: 'Lead / record',
    render: (v, row) => <LeadLinkCell leadId={row.leadId} label={v} />,
  },
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  { key: 'priority', label: 'Priority', render: (v) => <PriorityBadge priority={v} /> },
  {
    key: 'dueAt',
    label: 'Due',
    render: (v, row) => (
      <span className={row.isOverdue ? 'font-semibold text-rose-600' : 'text-ink-muted'}>{fmtReportDate(v)}</span>
    ),
  },
  { key: 'createdAt', label: 'Created', render: (v) => fmtReportDate(v) },
]

export const ASSIGNEE_WORKLOAD_COLS = [
  { key: 'name', label: 'Team member', render: (v) => <span className="font-semibold text-ink">{v || 'Unassigned'}</span> },
  { key: 'email', label: 'Email', render: (v) => <span className="text-xs text-ink-muted">{v || '—'}</span> },
  { key: 'open', label: 'Open', render: (v) => <span className="font-semibold text-ink">{v ?? 0}</span> },
  { key: 'pending', label: 'Pending', render: (v) => v ?? 0 },
  { key: 'inProgress', label: 'In progress', render: (v) => v ?? 0 },
  { key: 'overdue', label: 'Overdue', render: (v) => <span className={v > 0 ? 'font-semibold text-rose-600' : ''}>{v ?? 0}</span> },
  { key: 'assignedInPeriod', label: 'Assigned (period)', render: (v) => v ?? 0 },
  { key: 'completedInPeriod', label: 'Completed (period)', render: (v) => <span className="text-emerald-700">{v ?? 0}</span> },
]
