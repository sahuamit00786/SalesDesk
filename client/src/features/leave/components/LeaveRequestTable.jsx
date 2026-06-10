import { useMemo } from 'react'
import { ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DataGrid } from '@/components/shared/DataGrid'
import { HrCard } from '@/features/hr/components/HrCard'
import { HrEmptyState } from '@/features/hr/components/HrEmptyState'
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
  const columns = useMemo(() => {
    const cols = []
    if (showEmployee) {
      cols.push({
        field: 'employee',
        headerName: 'Employee',
        flex: 1,
        minWidth: 140,
        valueGetter: (_v, row) => row.user?.name,
      })
    }
    cols.push(
      { field: 'leaveType', headerName: 'Type', flex: 1, minWidth: 100, valueGetter: (_v, row) => row.leaveType?.name },
      { field: 'fromDate', headerName: 'From', width: 110 },
      { field: 'toDate', headerName: 'To', width: 110 },
      { field: 'days', headerName: 'Days', width: 70 },
      {
        field: 'reason',
        headerName: 'Reason',
        flex: 1,
        minWidth: 120,
        renderCell: ({ row }) => (
          <span className="block max-w-[200px] truncate text-ink-muted" title={row.reason || ''}>
            {row.reason || '—'}
          </span>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 110,
        renderCell: ({ row }) => <HrStatusPill status={row.status} />,
      },
      {
        field: 'appliedAt',
        headerName: 'Applied',
        width: 110,
        valueGetter: (_v, row) =>
          row.appliedAt ? new Date(row.appliedAt).toLocaleDateString() : '—',
      },
    )
    if (showActions) {
      cols.push({
        field: 'reviewActions',
        headerName: 'Actions',
        width: 160,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) =>
          row.status === 'pending' ? (
            <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
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
          ),
      })
    }
    if (onCancel) {
      cols.push({
        field: 'cancelAction',
        headerName: '',
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) =>
          row.status === 'pending' || row.status === 'approved' ? (
            <Button
              type="button"
              className="!h-8 !px-3 !text-xs"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                onCancel(row)
              }}
            >
              Cancel
            </Button>
          ) : null,
      })
    }
    return cols
  }, [showEmployee, showActions, onApprove, onReject, onCancel])

  const table = !rows.length ? (
    <HrEmptyState
      icon={ClipboardList}
      title="No leave requests"
      description="Requests matching your filters will appear here."
      className={embedded ? 'border-0 bg-transparent py-10' : 'm-5 border-0 bg-transparent'}
    />
  ) : (
    <DataGrid
      gridColumns
      columns={columns}
      data={rows}
      searchable={false}
      showColumnToggle={false}
      showExportCsv={false}
      checkboxSelection={selectable}
      rowSelectionModel={selectedIds.map(String)}
      onRowSelectionModelChange={(model) => {
        const next = new Set(model.map(String))
        const prev = new Set(selectedIds.map(String))
        for (const id of next) {
          if (!prev.has(id)) onToggleSelect?.(id)
        }
        for (const id of prev) {
          if (!next.has(id)) onToggleSelect?.(id)
        }
      }}
      isRowSelectable={(params) => params.row.status === 'pending'}
      defaultPageSize={15}
      hideFooter={rows.length <= 15}
      maxHeightClass="max-h-[min(60vh,520px)]"
      emptyTitle="No leave requests"
      className="border-0 shadow-none"
    />
  )

  if (embedded) return table

  return (
    <HrCard title={title} description={description} icon={ClipboardList} flush bodyClassName="p-0">
      {table}
    </HrCard>
  )
}
