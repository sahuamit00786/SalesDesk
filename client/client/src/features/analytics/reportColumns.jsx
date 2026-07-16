import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { ReportStatusBadge } from '@/features/analytics/ReportLayout'

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

const PRIORITY_STYLES = {
  low: 'bg-neutral-100 text-neutral-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-rose-100 text-rose-700',
}

export const StatusBadge = ReportStatusBadge

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
    field: 'title',
    headerName: 'Task',
    renderCell: ({ value, row }) => (
      <div className="max-w-[220px]">
        <p className="truncate font-medium text-ink" title={value}>{value || '—'}</p>
        {row.taskType ? <p className="truncate text-[11px] capitalize text-ink-faint">{String(row.taskType).replace(/_/g, ' ')}</p> : null}
      </div>
    ),
  },
  {
    field: 'assignee',
    headerName: 'Assigned to',
    renderCell: ({ value, row }) => (
      <div className="max-w-[160px]">
        <p className="truncate font-medium text-ink">{value || 'Unassigned'}</p>
        {row.assigneeEmail ? <p className="truncate text-[11px] text-ink-faint">{row.assigneeEmail}</p> : null}
      </div>
    ),
  },
  {
    field: 'lead',
    headerName: 'Lead / record',
    renderCell: ({ value, row }) => <LeadLinkCell leadId={row.leadId} label={value} />,
  },
  { field: 'status', headerName: 'Status', renderCell: ({ value }) => <StatusBadge status={value} /> },
  { field: 'priority', headerName: 'Priority', renderCell: ({ value }) => <PriorityBadge priority={value} /> },
  {
    field: 'dueAt',
    headerName: 'Due',
    renderCell: ({ value, row }) => (
      <span className={row.isOverdue ? 'font-semibold text-rose-600' : 'text-ink-muted'}>{fmtReportDate(value)}</span>
    ),
  },
  { field: 'createdAt', headerName: 'Created', renderCell: ({ value }) => fmtReportDate(value) },
]

export const ASSIGNEE_WORKLOAD_COLS = [
  { field: 'name', headerName: 'Team member', renderCell: ({ value }) => <span className="font-semibold text-ink">{value || 'Unassigned'}</span> },
  { field: 'email', headerName: 'Email', renderCell: ({ value }) => <span className="text-xs text-ink-muted">{value || '—'}</span> },
  { field: 'open', headerName: 'Open', renderCell: ({ value }) => <span className="font-semibold text-ink">{value ?? 0}</span> },
  { field: 'pending', headerName: 'Pending', renderCell: ({ value }) => value ?? 0 },
  { field: 'inProgress', headerName: 'In progress', renderCell: ({ value }) => value ?? 0 },
  { field: 'overdue', headerName: 'Overdue', renderCell: ({ value }) => <span className={value > 0 ? 'font-semibold text-rose-600' : ''}>{value ?? 0}</span> },
  { field: 'assignedInPeriod', headerName: 'Assigned (period)', renderCell: ({ value }) => value ?? 0 },
  { field: 'completedInPeriod', headerName: 'Completed (period)', renderCell: ({ value }) => <span className="text-emerald-700">{value ?? 0}</span> },
]
