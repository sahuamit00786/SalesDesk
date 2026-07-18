import { Link } from 'react-router-dom'
import { ArrowRight, ScrollText } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import { HrStatusPill } from '@/features/hr/components/HrStatusPill'
import { getLeaveTypeStyle } from '@/features/leave/constants/leaveTypeStyles'

function sortByRecent(rows) {
  return [...rows].sort((a, b) => {
    const ta = a.appliedAt ? new Date(a.appliedAt).getTime() : 0
    const tb = b.appliedAt ? new Date(b.appliedAt).getTime() : 0
    return tb - ta
  })
}

export function LeaveRequestsSidebarPanel({ requests = [], maxItems = 5 }) {
  const recent = sortByRecent(requests).slice(0, maxItems)
  const pendingCount = requests.filter((r) => r.status === 'pending').length

  return (
    <div className="rounded-2xl border border-surface-border bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">
          <ScrollText className="h-3.5 w-3.5" aria-hidden />
          My requests
        </h4>
        {pendingCount > 0 ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            {pendingCount} pending
          </span>
        ) : null}
      </div>

      {recent.length === 0 ? (
        <p className="text-sm text-ink-muted">No leave requests yet. Click a day on the calendar to apply.</p>
      ) : (
        <ul className="space-y-2">
          {recent.map((req) => {
            const style = getLeaveTypeStyle(req.leaveType)
            return (
              <li
                key={req.id}
                className="rounded-xl border border-surface-border bg-surface-subtle/60 px-2.5 py-2 transition-colors hover:border-brand-200/60 hover:bg-brand-50/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-ink">{style.label}</p>
                    <p className="mt-0.5 text-[10px] tabular-nums text-ink-muted">
                      {req.fromDate} → {req.toDate}
                      {req.days != null ? ` · ${req.days}d` : ''}
                    </p>
                  </div>
                  <HrStatusPill status={req.status} className="!px-1.5 !py-0 !text-[10px]" />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Link
        to="/leave/requests"
        className={cn(
          'mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-surface-border bg-white px-3 py-2 text-xs font-semibold text-ink',
          'transition-colors hover:border-brand-200/60 hover:bg-brand-50 hover:text-brand-700',
        )}
      >
        View all requests
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  )
}
