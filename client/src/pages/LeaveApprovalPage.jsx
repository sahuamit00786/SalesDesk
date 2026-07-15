import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search } from '@/components/ui/icons'
import { useIsHrManagerOrAdmin } from '@/features/hr/useHrRole'
import { PageShell } from '@/components/layout/PageShell'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { SkeletonList } from '@/components/shared/SkeletonLoader'
import { BulkApproveBar } from '@/features/leave/components/BulkApproveBar'
import { LeaveRequestTable } from '@/features/leave/components/LeaveRequestTable'
import { HrToolbar, HrToolbarGroup } from '@/features/hr/components/HrToolbar'
import {
  useApproveLeaveMutation,
  useBulkApproveLeavesMutation,
  useGetAllLeavesQuery,
  useGetLeaveTypesQuery,
  useRejectLeaveMutation,
} from '@/features/leave/leaveApi'

export function LeaveApprovalPage() {
  const canApprove = useIsHrManagerOrAdmin()
  const [status, setStatus] = useState('pending')
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [rejectRow, setRejectRow] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: typesData } = useGetLeaveTypesQuery()
  const { data, refetch, isLoading } = useGetAllLeavesQuery({
    status: status || undefined,
    leaveTypeId: leaveTypeId || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
  })
  const [approveLeave] = useApproveLeaveMutation()
  const [rejectLeave, { isLoading: rejecting }] = useRejectLeaveMutation()
  const [bulkApprove, { isLoading: bulkBusy }] = useBulkApproveLeavesMutation()

  const allRows = data?.data || []
  const types = typesData?.data || []

  const rows = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase()
    if (!q) return allRows
    return allRows.filter((r) => String(r.user?.name || '').toLowerCase().includes(q))
  }, [allRows, employeeSearch])

  if (!canApprove) return <Navigate to="/leave" replace />

  function toggleSelect(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function onApprove(row) {
    try {
      await approveLeave(row.id).unwrap()
      toast.success('Leave approved')
      refetch()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Approve failed')
    }
  }

  async function confirmReject() {
    if (!rejectRow) return
    if (!rejectReason.trim()) {
      toast.error('Rejection reason is required')
      return
    }
    try {
      await rejectLeave({ id: rejectRow.id, rejectionReason: rejectReason.trim() }).unwrap()
      toast.success('Leave rejected')
      setRejectRow(null)
      setRejectReason('')
      refetch()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Reject failed')
    }
  }

  async function onBulkApprove() {
    if (!selected.length) return
    try {
      await bulkApprove(selected).unwrap()
      toast.success(`Approved ${selected.length} request(s)`)
      setSelected([])
      refetch()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Bulk approve failed')
    }
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <HrToolbar>
          <HrToolbarGroup label="Filters">
            <Select className="h-10 w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            <Select className="h-10 w-48" value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}>
              <option value="">All leave types</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search employee…"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="h-10 rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </HrToolbarGroup>
          <HrToolbarGroup label="Date range">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
            <span className="text-sm text-gray-400">–</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
          </HrToolbarGroup>
        </HrToolbar>

        <BulkApproveBar selectedCount={selected.length} onApprove={onBulkApprove} busy={bulkBusy} />

        {isLoading ? (
          <SkeletonList rows={6} />
        ) : (
          <LeaveRequestTable
            rows={rows}
            showEmployee
            showActions
            selectable={status === 'pending'}
            selectedIds={selected}
            onToggleSelect={toggleSelect}
            onApprove={onApprove}
            onReject={(row) => {
              setRejectRow(row)
              setRejectReason('')
            }}
            title="Approval queue"
            description="Review team leave requests and approve or reject with a reason"
          />
        )}
      </div>

      <Modal
        open={Boolean(rejectRow)}
        onClose={() => setRejectRow(null)}
        title="Reject leave request"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setRejectRow(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" disabled={rejecting} onClick={confirmReject}>
              Reject
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-ink-muted">
          Provide a reason for rejecting <strong className="text-ink">{rejectRow?.user?.name}</strong>&apos;s request:
        </p>
        <Textarea
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Rejection reason (required)"
        />
      </Modal>
    </PageShell>
  )
}
