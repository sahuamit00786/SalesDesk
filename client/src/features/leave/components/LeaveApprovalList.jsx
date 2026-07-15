import { useState } from 'react'
import { CheckCircle2, XCircle, Calendar, User } from '@/components/ui/icons'
import {
  useGetAllLeavesQuery,
  useApproveLeaveMutation,
  useRejectLeaveMutation,
} from '@/features/leave/leaveApi'
import toast from 'react-hot-toast'

function formatDateRange(from, to) {
  const opts = { day: 'numeric', month: 'short', year: 'numeric' }
  const f = from ? new Date(from).toLocaleDateString('en-IN', opts) : '—'
  const t = to ? new Date(to).toLocaleDateString('en-IN', opts) : '—'
  if (f === t) return f
  return `${f} – ${t}`
}

function dayCount(from, to) {
  if (!from || !to) return '—'
  const diff = Math.round((new Date(to) - new Date(from)) / 86400000) + 1
  return `${diff} day${diff === 1 ? '' : 's'}`
}

/**
 * LeaveApprovalList — shows pending leave requests for managers with approve/reject actions.
 */
export function LeaveApprovalList() {
  const { data, isLoading, refetch } = useGetAllLeavesQuery({ status: 'pending' })
  const [approveLeave] = useApproveLeaveMutation()
  const [rejectLeave] = useRejectLeaveMutation()

  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const rows = data?.data || []

  async function handleApprove(id) {
    setActionLoading(id)
    try {
      await approveLeave(id).unwrap()
      toast.success('Leave approved')
      refetch()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not approve leave')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(id) {
    setActionLoading(id)
    try {
      await rejectLeave({ id, rejectionReason: rejectReason.trim() }).unwrap()
      toast.success('Leave rejected')
      setRejectingId(null)
      setRejectReason('')
      refetch()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not reject leave')
    } finally {
      setActionLoading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-subtle" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border bg-white py-10 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-ink-faint" />
        <p className="text-sm text-ink-muted">No pending leave requests</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-surface-border bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-surface-border bg-surface-subtle">
          <tr>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Employee</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Leave type</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Dates</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Duration</th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {rows.map((row) => {
            const isRejecting = rejectingId === row.id
            const isProcessing = actionLoading === row.id
            const employeeName = row.user?.firstName
              ? `${row.user.firstName} ${row.user.lastName || ''}`.trim()
              : row.user?.email || 'Employee'

            return (
              <tr key={row.id} className="transition-colors hover:bg-surface-subtle/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                      {(employeeName[0] || '?').toUpperCase()}
                    </div>
                    <span className="font-medium text-ink">{employeeName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {row.leaveType?.name || '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-ink-muted">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {formatDateRange(row.fromDate, row.toDate)}
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold text-ink">
                  {dayCount(row.fromDate, row.toDate)}
                </td>
                <td className="px-4 py-3 text-right">
                  {isRejecting ? (
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="text"
                        className="h-8 w-48 rounded-lg border border-surface-border bg-white px-2.5 text-xs text-ink outline-none focus:border-brand-500"
                        placeholder="Reason (optional)"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        autoFocus
                      />
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleReject(row.id)}
                        className="h-8 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {isProcessing ? 'Rejecting...' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRejectingId(null); setRejectReason('') }}
                        className="h-8 rounded-lg border border-surface-border px-3 text-xs font-medium text-ink-muted hover:bg-surface-subtle"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleApprove(row.id)}
                        className="inline-flex items-center gap-1 h-8 rounded-lg bg-emerald-600 px-3 text-xs font-semibold cx-icon-inherit text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setRejectingId(row.id)}
                        className="inline-flex items-center gap-1 h-8 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default LeaveApprovalList
