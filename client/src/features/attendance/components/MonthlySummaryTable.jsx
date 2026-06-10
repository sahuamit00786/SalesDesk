import { useMemo } from 'react'
import { Users } from 'lucide-react'
import { DataGrid } from '@/components/shared/DataGrid'
import { HrCard } from '@/features/hr/components/HrCard'
import { HrEmptyState } from '@/features/hr/components/HrEmptyState'

export function MonthlySummaryTable({ summary = [], onUserSelect }) {
  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Employee',
        size: 140,
        cell: ({ getValue }) => <span className="font-semibold">{getValue()}</span>,
      },
      {
        accessorKey: 'department',
        header: 'Department',
        size: 120,
        cell: ({ getValue }) => getValue() || '—',
      },
      { accessorKey: 'daysPresent', header: 'Present', size: 90 },
      { accessorKey: 'daysAbsent', header: 'Absent', size: 90 },
      { accessorKey: 'daysLate', header: 'Late', size: 80 },
      { accessorKey: 'daysHalfDay', header: 'Half day', size: 90 },
      {
        accessorKey: 'totalHours',
        header: 'Total hours',
        size: 110,
        cell: ({ getValue }) => `${Number(getValue() || 0).toFixed(1)}h`,
      },
    ],
    [],
  )

  const rows = useMemo(
    () =>
      summary.map((r) => ({
        ...r,
        id: String(r.userId ?? r.id),
      })),
    [summary],
  )

  return (
    <HrCard
      title="Monthly summary"
      description="Attendance totals per team member for the selected period"
      icon={Users}
      flush
      bodyClassName="p-0"
    >
      {!rows.length ? (
        <HrEmptyState
          icon={Users}
          title="No results"
          description="There is no team attendance data for this month yet."
          className="m-5 border-0 bg-transparent"
        />
      ) : (
        <DataGrid
          columns={columns}
          data={rows}
          searchable
          showColumnToggle={false}
          defaultPageSize={15}
          onRowClick={onUserSelect ? (params) => onUserSelect(params.row.userId) : undefined}
          getRowId={(row) => String(row.userId ?? row.id)}
          maxHeightClass="max-h-[min(60vh,480px)]"
          emptyTitle="No results"
          className="border-0 shadow-none"
        />
      )}
    </HrCard>
  )
}
