import { AlertTriangle, UserX, Mail, Copy } from 'lucide-react'
import { ReportKpiCard } from './ReportKpiCard'
import { ReportTable } from './ReportTable'
import { KpiSkeleton } from './ChartSkeleton'
import { useGetDataHealthReportQuery } from '@/features/analytics/analyticsApi'
import { ReportKpiGrid, ReportTableSection } from '@/features/analytics/ReportLayout'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—'

const UNASSIGNED_COLS = [
  { key: 'title', label: 'Lead', render: (v) => <span className="font-medium text-ink">{v}</span> },
  { key: 'company', label: 'Company' },
  { key: 'status', label: 'Status' },
  { key: 'owner', label: 'Owner' },
  { key: 'createdAt', label: 'Created', render: (v) => fmtDate(v) },
]

const UNTOUCHED_COLS = [
  { key: 'title', label: 'Lead', render: (v) => <span className="font-medium text-ink">{v}</span> },
  { key: 'assignee', label: 'Assigned to' },
  { key: 'owner', label: 'Owner' },
  { key: 'status', label: 'Status' },
  { key: 'daysSinceActivity', label: 'Days idle', render: (v) => <span className="font-semibold text-amber-600">{v}</span> },
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
          <ReportKpiCard label="Untouched leads" value={kpis.untouched ?? 0} icon={AlertTriangle} iconBg="bg-orange-50" iconColor="text-orange-600" />
          <ReportKpiCard label="No email" value={kpis.noEmail ?? 0} icon={Mail} iconBg="bg-slate-50" iconColor="text-slate-600" />
          <ReportKpiCard label="Duplicates" value={kpis.duplicates ?? 0} icon={Copy} iconBg="bg-rose-50" iconColor="text-rose-600" />
        </>}
      </ReportKpiGrid>

      <ReportTableSection title="Unassigned leads" subtitle="Leads with no assignee — needs distribution">
        <ReportTable columns={UNASSIGNED_COLS} rows={tables.unassigned || []} isLoading={isLoading} maxH="max-h-[360px]" />
      </ReportTableSection>

      <ReportTableSection title="Untouched leads" subtitle="No activity in 14+ days — assignee shown">
        <ReportTable columns={UNTOUCHED_COLS} rows={tables.untouched || []} isLoading={isLoading} maxH="max-h-[360px]" />
      </ReportTableSection>

      <ReportTableSection title="Leads without email" subtitle="Data quality — missing contact email">
        <ReportTable columns={UNASSIGNED_COLS} rows={tables.noEmail || []} isLoading={isLoading} maxH="max-h-[300px]" />
      </ReportTableSection>
    </div>
  )
}
