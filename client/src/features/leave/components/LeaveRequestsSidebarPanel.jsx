import { Link } from 'react-router-dom'
import { ArrowRight, ScrollText } from 'lucide-react'
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
    <div className="rounded-xl border border-indigo-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
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
        <p className="text-sm text-gray-400">No leave requests yet. Click a day on the calendar to apply.</p>
      ) : (
        <ul className="space-y-2">
          {recent.map((req) => {
            const style = getLeaveTypeStyle(req.leaveType)
            return (
              <li
                key={req.id}
                className="rounded-lg border border-gray-100 bg-gray-50/80 px-2.5 py-2 transition-colors hover:border-indigo-100 hover:bg-indigo-50/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-900">{style.label}</p>
                    <p className="mt-0.5 text-[10px] tabular-nums text-gray-500">
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
          'mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700',
          'transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700',
        )}
      >
        View all requests
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  )
}
