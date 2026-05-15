import { Users } from 'lucide-react'
import { HrCard } from '@/features/hr/components/HrCard'
import { HrEmptyState } from '@/features/hr/components/HrEmptyState'
import { HrDataTable, HrTableBody, HrTableHead, HrTd, HrTh, HrTr } from '@/features/hr/components/HrDataTable'

export function MonthlySummaryTable({ summary = [] }) {
  return (
    <HrCard
      title="Monthly summary"
      description="Attendance totals per team member for the selected period"
      icon={Users}
      flush
      bodyClassName="p-0"
    >
      {!summary.length ? (
        <HrEmptyState
          icon={Users}
          title="No summary data"
          description="There is no team attendance data for this month yet."
          className="m-5 border-0 bg-transparent"
        />
      ) : (
        <HrDataTable minWidth="720px">
          <HrTableHead>
            <HrTh>Employee</HrTh>
            <HrTh>Department</HrTh>
            <HrTh>Present</HrTh>
            <HrTh>Absent</HrTh>
            <HrTh>Late</HrTh>
            <HrTh>Half day</HrTh>
            <HrTh>Total hours</HrTh>
          </HrTableHead>
          <HrTableBody>
            {summary.map((row) => (
              <HrTr key={row.userId}>
                <HrTd className="font-semibold">{row.name}</HrTd>
                <HrTd muted>{row.department || '—'}</HrTd>
                <HrTd>{row.daysPresent}</HrTd>
                <HrTd>{row.daysAbsent}</HrTd>
                <HrTd>{row.daysLate}</HrTd>
                <HrTd>{row.daysHalfDay}</HrTd>
                <HrTd className="font-medium tabular-nums">{Number(row.totalHours || 0).toFixed(1)}h</HrTd>
              </HrTr>
            ))}
          </HrTableBody>
        </HrDataTable>
      )}
    </HrCard>
  )
}
