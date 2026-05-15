import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { CalendarDays, ScrollText } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Select } from '@/components/ui/Select'
import { LeaveRequestTable } from '@/features/leave/components/LeaveRequestTable'
import { HrToolbar, HrToolbarGroup } from '@/features/hr/components/HrToolbar'
import { HrCard } from '@/features/hr/components/HrCard'
import { Loader } from '@/components/shared/Loader'
import { useCancelLeaveMutation, useGetMyLeavesQuery } from '@/features/leave/leaveApi'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function LeaveRequestsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const { data, refetch, isLoading } = useGetMyLeavesQuery()
  const [cancelLeave] = useCancelLeaveMutation()

  const rows = data?.data || []

  const filtered = useMemo(() => {
    if (!statusFilter) return rows
    return rows.filter((r) => r.status === statusFilter)
  }, [rows, statusFilter])

  async function onCancel(row) {
    if (!window.confirm('Cancel this leave request?')) return
    try {
      await cancelLeave(row.id).unwrap()
      toast.success('Leave cancelled')
      refetch()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not cancel')
    }
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <HrCard
          title="Leave requests"
          description="Track pending, approved, and past leave. Pending requests also appear on your leave calendar until approved."
          icon={ScrollText}
          action={
            <Link
              to="/leave"
              className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-white px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-subtle"
            >
              <CalendarDays className="h-4 w-4" />
              Open calendar
            </Link>
          }
          flush
          bodyClassName="p-0"
        >
          <div className="border-b border-surface-border/70 px-5 py-3">
            <HrToolbar className="!mb-0 border-0 !p-0">
              <HrToolbarGroup label="Status">
                <Select className="h-10 w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value || 'all'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </HrToolbarGroup>
            </HrToolbar>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader />
            </div>
          ) : (
            <LeaveRequestTable embedded rows={filtered} onCancel={onCancel} />
          )}
        </HrCard>
      </div>
    </PageShell>
  )
}
