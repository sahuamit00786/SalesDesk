import { ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { HrCard } from '@/features/hr/components/HrCard'
import { HrEmptyState } from '@/features/hr/components/HrEmptyState'
import { HrDataTable, HrTableBody, HrTableHead, HrTd, HrTh, HrTr } from '@/features/hr/components/HrDataTable'
import { HrStatusPill } from '@/features/hr/components/HrStatusPill'

export function LeaveRequestTable({
  rows = [],
  showEmployee = false,
  showActions = false,
  onApprove,
  onReject,
  onCancel,
  selectedIds = [],
  onToggleSelect,
  selectable = false,
  title = 'Leave requests',
  description,
  embedded = false,
}) {
  const table = !rows.length ? (
    <HrEmptyState
      icon={ClipboardList}
      title="No leave requests"
      description="Requests matching your filters will appear here."
      className={embedded ? 'border-0 bg-transparent py-10' : 'm-5 border-0 bg-transparent'}
    />
  ) : (
    <HrDataTable minWidth="880px">
      <HrTableHead>
        {selectable ? <HrTh className="w-10" /> : null}
        {showEmployee ? <HrTh>Employee</HrTh> : null}
        <HrTh>Type</HrTh>
        <HrTh>From</HrTh>
        <HrTh>To</HrTh>
        <HrTh>Days</HrTh>
        <HrTh>Reason</HrTh>
        <HrTh>Status</HrTh>
        <HrTh>Applied</HrTh>
        {showActions ? <HrTh>Actions</HrTh> : null}
        {onCancel ? <HrTh className="w-24" /> : null}
      </HrTableHead>
      <HrTableBody>
        {rows.map((row) => (
          <HrTr key={row.id}>
            {selectable ? (
              <HrTd>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30"
                  checked={selectedIds.includes(row.id)}
                  onChange={() => onToggleSelect?.(row.id)}
                  disabled={row.status !== 'pending'}
                />
              </HrTd>
            ) : null}
            {showEmployee ? <HrTd className="font-semibold">{row.user?.name}</HrTd> : null}
            <HrTd>{row.leaveType?.name}</HrTd>
            <HrTd className="tabular-nums">{row.fromDate}</HrTd>
            <HrTd className="tabular-nums">{row.toDate}</HrTd>
            <HrTd className="font-medium tabular-nums">{row.days}</HrTd>
            <HrTd className="max-w-[200px] truncate" muted title={row.reason || ''}>
              {row.reason || '—'}
            </HrTd>
            <HrTd>
              <HrStatusPill status={row.status} />
            </HrTd>
            <HrTd muted className="tabular-nums">
              {row.appliedAt ? new Date(row.appliedAt).toLocaleDateString() : '—'}
            </HrTd>
            {showActions ? (
              <HrTd>
                {row.status === 'pending' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" className="!h-8 !px-3 !text-xs" onClick={() => onApprove?.(row)}>
                      Approve
                    </Button>
                    <Button
                      type="button"
                      className="!h-8 !px-3 !text-xs"
                      variant="secondary"
                      onClick={() => onReject?.(row)}
                    >
                      Reject
                    </Button>
                  </div>
                ) : (
                  '—'
                )}
              </HrTd>
            ) : null}
            {onCancel ? (
              <HrTd>
                {(row.status === 'pending' || row.status === 'approved') && (
                  <Button type="button" className="!h-8 !px-3 !text-xs" variant="secondary" onClick={() => onCancel(row)}>
                    Cancel
                  </Button>
                )}
              </HrTd>
            ) : null}
          </HrTr>
        ))}
      </HrTableBody>
    </HrDataTable>
  )

  if (embedded) return table

  return (
    <HrCard title={title} description={description} icon={ClipboardList} flush bodyClassName="p-0">
      {table}
    </HrCard>
  )
}
