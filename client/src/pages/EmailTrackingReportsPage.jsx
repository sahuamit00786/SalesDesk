import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Mail, MailOpen, MousePointerClick, Reply, RefreshCw, Printer } from '@/components/ui/icons'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { DataGrid } from '@/components/shared/DataGrid'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { useGetEmailTrackingReportQuery } from '@/features/email/emailApi'
import { cn } from '@/utils/cn'

const SOURCE_OPTIONS = [
  { value: 'all', label: 'All sources' },
  { value: 'direct', label: 'Direct (lead profile)' },
  { value: 'bulk', label: 'Bulk (template send)' },
  { value: 'workflow', label: 'Workflow automation' },
]

const GROUP_OPTIONS = [
  { value: 'day', label: 'By day' },
  { value: 'week', label: 'By week' },
  { value: 'month', label: 'By month' },
  { value: 'source', label: 'By source' },
  { value: 'none', label: 'Summary only' },
]

function defaultDateFrom() {
  const d = new Date()
  d.setDate(d.getDate() - 29)
  return d.toISOString().slice(0, 10)
}
function defaultDateTo() {
  return new Date().toISOString().slice(0, 10)
}

function pct(n, total) {
  if (!total) return '—'
  return `${Math.round((n / total) * 100)}%`
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-xl border border-surface-border bg-white p-3">
      <div className="mb-1.5 flex items-center gap-2 text-ink-muted">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-bold text-ink">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-ink-muted">{sub}</p> : null}
    </div>
  )
}

const SOURCE_COLOR = {
  direct: CHART_COLORS.primary,
  bulk: CHART_COLORS.secondary,
  workflow: CHART_COLORS.ink,
  'bulk/workflow': CHART_COLORS.secondary,
}

const EMAIL_COLS = [
  { field: 'period', headerName: 'Period', renderCell: ({ value }) => <span className="font-mono text-xs">{value}</span> },
  {
    field: 'source',
    headerName: 'Source',
    renderCell: ({ value }) => (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
        style={{
          background: `${SOURCE_COLOR[value] || '#6b7280'}18`,
          color: SOURCE_COLOR[value] || '#6b7280',
        }}
      >
        {value}
      </span>
    ),
  },
  { field: 'sent', headerName: 'Sent', renderCell: ({ value }) => value.toLocaleString() },
  { field: 'opened', headerName: 'Opened', renderCell: ({ value }) => value.toLocaleString() },
  { field: 'openRate', headerName: 'Open rate', renderCell: ({ row }) => <span className="text-ink-muted">{pct(row.opened, row.sent)}</span> },
  { field: 'clicked', headerName: 'Clicked', renderCell: ({ value }) => value.toLocaleString() },
  { field: 'clickRate', headerName: 'Click rate', renderCell: ({ row }) => <span className="text-ink-muted">{pct(row.clicked, row.sent)}</span> },
  { field: 'replied', headerName: 'Replied', renderCell: ({ value }) => value.toLocaleString() },
  { field: 'replyRate', headerName: 'Reply rate', renderCell: ({ row }) => <span className="text-ink-muted">{pct(row.replied, row.sent)}</span> },
]

export function EmailTrackingReportsPage({ embedded = false }) {
  const [dateFrom, setDateFrom] = useState(defaultDateFrom)
  const [dateTo, setDateTo] = useState(defaultDateTo)
  const [source, setSource] = useState('all')
  const [groupBy, setGroupBy] = useState('day')

  const params = useMemo(
    () => ({ dateFrom, dateTo, source, groupBy }),
    [dateFrom, dateTo, source, groupBy],
  )

  const { data, isFetching, refetch } = useGetEmailTrackingReportQuery(params)
  const summary = data?.data?.summary || {}
  const rows = data?.data?.rows || []

  const chartData = useMemo(() => {
    if (!rows.length) return []
    // Pivot by period: merge direct + log rows sharing the same period
    const map = new Map()
    for (const r of rows) {
      const key = r.period
      if (!map.has(key)) map.set(key, { period: key, sent: 0, opened: 0, clicked: 0, replied: 0 })
      const e = map.get(key)
      e.sent += r.sent
      e.opened += r.opened
      e.clicked += r.clicked
      e.replied += r.replied
    }
    return [...map.values()].sort((a, b) => (a.period > b.period ? 1 : -1))
  }, [rows])

  const content = (
    <div id="report-export-root">
      {/* Header controls */}
      <div className="no-print mb-3 flex flex-wrap items-end gap-2.5">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-muted">From</label>
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 rounded-xl border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-muted">To</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded-xl border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-muted">Source</label>
          <Select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="h-9 w-44"
          >
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-muted">Group by</label>
          <Select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="h-9 w-36"
          >
            {GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
        <Button variant="secondary" onClick={refetch} disabled={isFetching} className="mt-auto h-9">
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          Refresh
        </Button>
        <Button variant="icon" className="mt-auto border border-surface-border" onClick={() => window.print()} aria-label="Print report">
          <Printer className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats strip */}
      <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard icon={Mail} label="Sent" value={summary.sent?.toLocaleString() ?? '—'} />
        <StatCard
          icon={MailOpen}
          label="Opened"
          value={summary.opened?.toLocaleString() ?? '—'}
          sub={`${pct(summary.opened, summary.sent)} open rate · ${summary.totalOpens?.toLocaleString() ?? 0} total opens`}
        />
        <StatCard
          icon={MousePointerClick}
          label="Clicked"
          value={summary.clicked?.toLocaleString() ?? '—'}
          sub={`${pct(summary.clicked, summary.sent)} click rate · ${summary.totalClicks?.toLocaleString() ?? 0} total clicks`}
        />
        <StatCard
          icon={Reply}
          label="Replied"
          value={summary.replied?.toLocaleString() ?? '—'}
          sub={`${pct(summary.replied, summary.sent)} reply rate`}
        />
      </div>

      {/* Chart */}
      {chartData.length > 0 && groupBy !== 'none' && groupBy !== 'source' ? (
        <div className="mb-3 rounded-xl border border-surface-border bg-white p-3">
          <h3 className="mb-2 text-sm font-semibold text-ink">Email activity over time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="sent" name="Sent" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="opened" name="Opened" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="clicked" name="Clicked" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="replied" name="Replied" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {/* Data table */}
      <DataGrid
        columns={EMAIL_COLS}
        data={rows}
        loading={isFetching}
        showColumnToggle={false}
        showExportCsv={false}
        autoHeight={false}
        maxHeightClass="max-h-[420px]"
        className="border-surface-border"
        emptyTitle="No email data"
        emptyDescription="No email data for the selected range and source."
      />
    </div>
  )

  if (embedded) return content
  return <PageShell>{content}</PageShell>
}
