import { useNavigate } from 'react-router-dom'
import { ArrowRight, AlertTriangle, CheckSquare, CalendarCheck } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { PageStack } from '@/components/layout/PageStack'
import { PageContentPanel } from '@/components/layout/PageContentPanel'
import { ReportFilterBar } from '@/features/analytics/ReportFilterBar'
import { useReportFilters } from '@/features/analytics/useReportFilters'
import { REPORT_CATEGORIES, REPORT_META } from '@/features/analytics/reportTypes'
import { formatChartCurrency } from '@/features/dashboard/dummyDashboardData'
import {
  useGetLeadsReportQuery, useGetDealsReportQuery, useGetTasksReportQuery,
  useGetFollowupsReportQuery,
} from '@/features/analytics/analyticsApi'
import { cn } from '@/utils/cn'

function fmt(v, suffix = '') {
  if (v === undefined || v === null) return '—'
  return `${v}${suffix}`
}

function fmtMoney(v) {
  if (v === undefined || v === null) return '—'
  return formatChartCurrency(Number(v) || 0)
}

function ReportCard({ id, onClick }) {
  const meta = REPORT_META[id]
  if (!meta || meta.aliasOf) return null
  const Icon = meta.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-3 rounded-xl border border-surface-border bg-white p-4 text-left shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
    >
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br', meta.iconGrad)}>
        <Icon className="h-5 w-5 text-white" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{meta.label}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{meta.desc}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
          Open <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  )
}

export function AnalyticsPage() {
  const navigate = useNavigate()
  const filters = useReportFilters()
  const params = filters.queryParams

  const { data: ld } = useGetLeadsReportQuery(params)
  const { data: dd } = useGetDealsReportQuery(params)
  const { data: td } = useGetTasksReportQuery(params)
  const { data: fd } = useGetFollowupsReportQuery(params)

  const lk = ld?.data?.kpis || {}
  const dk = dd?.data?.kpis || {}
  const tk = td?.data?.kpis || {}
  const fk = fd?.data?.kpis || {}

  function open(type) {
    const q = new URLSearchParams()
    q.set('preset', filters.presetKey)
    if (filters.presetKey === 'custom') {
      q.set('from', filters.from)
      q.set('to', filters.to)
    }
    navigate(`/reports/${type}?${q.toString()}`)
  }

  const alerts = [
    { label: 'Overdue tasks', value: tk.overdue, icon: CheckSquare, color: 'text-rose-600', bg: 'bg-rose-50', onClick: () => open('tasks') },
    { label: 'Untouched leads', value: lk.staleLeads, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', onClick: () => open('leads') },
    { label: 'Overdue follow-ups', value: fk.overdue, icon: CalendarCheck, color: 'text-orange-600', bg: 'bg-orange-50', onClick: () => open('followups') },
  ]

  return (
    <PageShell fullWidth>
      <PageStack>
        <ReportFilterBar filters={filters} meta={{ filters: [] }} />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Leads', value: fmt(lk.total), color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Pipeline Value', value: fmtMoney(dk.pipelineValue), color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Open Tasks', value: fmt(tk.openTotal), color: 'text-rose-700', bg: 'bg-rose-50' },
            { label: 'Win Rate', value: fmt(dk.winRate, '%'), color: 'text-purple-700', bg: 'bg-purple-50' },
          ].map(({ label, value, color, bg }) => (
            <PageContentPanel key={label} className={cn('!p-3', bg)}>
              <p className={cn('text-xl font-bold tabular-nums', color)}>{value}</p>
              <p className="text-[11px] text-ink-muted">{label}</p>
            </PageContentPanel>
          ))}
        </div>

        <PageContentPanel>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">Needs attention</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {alerts.map(({ label, value, icon: Ic, color, bg, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className={cn('flex items-center gap-3 rounded-xl border border-surface-border px-4 py-3 text-left hover:border-brand-300', bg)}
              >
                <Ic className={cn('h-5 w-5', color)} />
                <div>
                  <p className={cn('text-lg font-bold tabular-nums', color)}>{value ?? 0}</p>
                  <p className="text-xs text-ink-muted">{label}</p>
                </div>
              </button>
            ))}
          </div>
        </PageContentPanel>

        {REPORT_CATEGORIES.map((cat) => (
          <PageContentPanel key={cat.id}>
            <div className="mb-4">
              <p className="font-semibold text-ink">{cat.label}</p>
              <p className="text-xs text-ink-muted">{cat.desc}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cat.reports.map((id) => (
                <ReportCard key={id} id={id} onClick={() => open(id)} />
              ))}
            </div>
          </PageContentPanel>
        ))}
      </PageStack>
    </PageShell>
  )
}
