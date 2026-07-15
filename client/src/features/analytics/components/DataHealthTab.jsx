import { AlertTriangle, UserX, Mail, Copy } from '@/components/ui/icons'
import { DataGrid } from '@/components/shared/DataGrid'
import { ReportKpiCard } from './ReportKpiCard'
import { KpiSkeleton } from './ChartSkeleton'
import { useGetDataHealthReportQuery } from '@/features/analytics/analyticsApi'
import { ReportKpiGrid, ReportTableSection, ReportStatusBadge } from '@/features/analytics/ReportLayout'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—'

const UNASSIGNED_COLS = [
  { field: 'title', headerName: 'Lead', renderCell: ({ value }) => <span className="font-medium text-ink">{value}</span> },
  { field: 'company', headerName: 'Company' },
  { field: 'status', headerName: 'Status', renderCell: ({ value }) => <ReportStatusBadge status={value} /> },
  { field: 'owner', headerName: 'Owner' },
  { field: 'createdAt', headerName: 'Created', renderCell: ({ value }) => fmtDate(value) },
]

const UNTOUCHED_COLS = [
  { field: 'title', headerName: 'Lead', renderCell: ({ value }) => <span className="font-medium text-ink">{value}</span> },
  { field: 'assignee', headerName: 'Assigned to' },
  { field: 'owner', headerName: 'Owner' },
  { field: 'status', headerName: 'Status', renderCell: ({ value }) => <ReportStatusBadge status={value} /> },
  { field: 'daysSinceActivity', headerName: 'Days idle', renderCell: ({ value }) => <span className="font-semibold text-amber-600">{value}</span> },
]

export function DataHealthTab({ queryParams }) {
  const { data, isLoading } = useGetDataHealthReportQuery(queryParams)
  const d = data?.data
  const kpis = d?.kpis || {}
  const tables = d?.tables || {}

  return (
    <div id="report-export-root" className="space-y-4">
      <ReportKpiGrid>
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Unassigned leads" value={kpis.unassigned ?? 0} icon={UserX} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <ReportKpiCard label="Untouched leads" value={kpis.untouched ?? 0} icon={AlertTriangle} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <ReportKpiCard label="No email" value={kpis.noEmail ?? 0} icon={Mail} />
          <ReportKpiCard label="Duplicates" value={kpis.duplicates ?? 0} icon={Copy} iconBg="bg-rose-50" iconColor="text-rose-600" />
        </>}
      </ReportKpiGrid>

      <ReportTableSection title="Unassigned leads" subtitle="Leads with no assignee — needs distribution">
        <DataGrid
          columns={UNASSIGNED_COLS}
          data={tables.unassigned || []}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[360px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="No unassigned leads"
        />
      </ReportTableSection>

      <ReportTableSection title="Untouched leads" subtitle="No activity in 14+ days — assignee shown">
        <DataGrid
          columns={UNTOUCHED_COLS}
          data={tables.untouched || []}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[360px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="All leads have recent activity"
        />
      </ReportTableSection>

      <ReportTableSection title="Leads without email" subtitle="Data quality — missing contact email">
        <DataGrid
          columns={UNASSIGNED_COLS}
          data={tables.noEmail || []}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[300px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="All leads have an email on file"
        />
      </ReportTableSection>
    </div>
  )
}
