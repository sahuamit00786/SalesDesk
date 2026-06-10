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
import { Mail, MailOpen, MousePointerClick, Reply, RefreshCw } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
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

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className={cn('rounded-2xl border border-surface-border bg-white p-4', color)}>
      <div className="mb-2 flex items-center gap-2 text-ink-muted">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-ink">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-ink-muted">{sub}</p> : null}
    </div>
  )
}

const SOURCE_COLOR = {
  direct: '#6366f1',
  bulk: '#0ea5e9',
  workflow: '#10b981',
  'bulk/workflow': '#0ea5e9',
}

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
    <>
      {/* Header controls */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
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
            className="h-9 min-w-[180px]"
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
            className="h-9 min-w-[140px]"
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
      </div>

      {/* Stats strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Mail} label="Sent" value={summary.sent?.toLocaleString() ?? '—'} />
        <StatCard
          icon={MailOpen}
          label="Opened"
          value={summary.opened?.toLocaleString() ?? '—'}
          sub={`${pct(summary.opened, summary.sent)} open rate · ${summary.totalOpens?.toLocaleString() ?? 0} total opens`}
          color="border-indigo-100"
        />
        <StatCard
          icon={MousePointerClick}
          label="Clicked"
          value={summary.clicked?.toLocaleString() ?? '—'}
          sub={`${pct(summary.clicked, summary.sent)} click rate · ${summary.totalClicks?.toLocaleString() ?? 0} total clicks`}
          color="border-sky-100"
        />
        <StatCard
          icon={Reply}
          label="Replied"
          value={summary.replied?.toLocaleString() ?? '—'}
          sub={`${pct(summary.replied, summary.sent)} reply rate`}
          color="border-emerald-100"
        />
      </div>

      {/* Chart */}
      {chartData.length > 0 && groupBy !== 'none' && groupBy !== 'source' ? (
        <div className="mb-6 rounded-2xl border border-surface-border bg-white p-4">
          <h3 className="mb-4 text-sm font-semibold text-ink">Email activity over time</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="sent" name="Sent" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="opened" name="Opened" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="clicked" name="Clicked" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              <Bar dataKey="replied" name="Replied" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {/* Data table */}
      <div className="overflow-hidden rounded-2xl border border-surface-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-surface-border bg-surface-subtle/60">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-ink-muted">Period</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-ink-muted">Source</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-ink-muted">Sent</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-ink-muted">Opened</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-ink-muted">Open rate</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-ink-muted">Clicked</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-ink-muted">Click rate</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-ink-muted">Replied</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-ink-muted">Reply rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {rows.length === 0 && !isFetching ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-ink-muted">
                    No email data for the selected range and source.
                  </td>
                </tr>
              ) : null}
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-surface-subtle/40">
                  <td className="px-4 py-2.5 font-mono text-xs text-ink">{r.period}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{
                        background: `${SOURCE_COLOR[r.source] || '#6b7280'}18`,
                        color: SOURCE_COLOR[r.source] || '#6b7280',
                      }}
                    >
                      {r.source}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-ink">{r.sent.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right text-ink">{r.opened.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right text-ink-muted">{pct(r.opened, r.sent)}</td>
                  <td className="px-4 py-2.5 text-right text-ink">{r.clicked.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right text-ink-muted">{pct(r.clicked, r.sent)}</td>
                  <td className="px-4 py-2.5 text-right text-ink">{r.replied.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right text-ink-muted">{pct(r.replied, r.sent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )

  if (embedded) return content
  return <PageShell>{content}</PageShell>
}
