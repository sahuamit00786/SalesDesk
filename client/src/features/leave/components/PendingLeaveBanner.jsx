import { Link } from 'react-router-dom'
import { ClipboardCheck } from 'lucide-react'
import { useGetAllLeavesQuery } from '@/features/leave/leaveApi'
import { useIsHrManagerOrAdmin } from '@/features/hr/useHrRole'

export function PendingLeaveBanner() {
  const canApprove = useIsHrManagerOrAdmin()
  const { data } = useGetAllLeavesQuery({ status: 'pending' }, { skip: !canApprove })
  const count = data?.data?.length || 0

  if (!canApprove || count === 0) return null

  return (
    <Link
      to="/leave/approval"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-white px-4 py-3.5 shadow-sm transition hover:border-amber-300 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
          <ClipboardCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">
            {count} leave request{count === 1 ? '' : 's'} awaiting approval
          </p>
          <p className="text-xs text-ink-muted">Review and approve from the approval queue</p>
        </div>
      </div>
      <span className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">Review now</span>
    </Link>
  )
}
