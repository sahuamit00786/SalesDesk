import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search, AlertTriangle, CheckSquare, CalendarCheck, Users, DollarSign, ListTodo, Percent } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { PageStack } from '@/components/layout/PageStack'
import { PageContentPanel } from '@/components/layout/PageContentPanel'
import { ReportFilterBar } from '@/features/analytics/ReportFilterBar'
import { ReportKpiCard } from '@/features/analytics/components/ReportKpiCard'
import { useReportFilters } from '@/features/analytics/useReportFilters'
import { REPORT_CATEGORIES, REPORT_META } from '@/features/analytics/reportTypes'
import { useFormatChartCurrency } from '@/hooks/useEffectiveCurrency'
import { Input } from '@/components/ui/Input'
import {
  useGetLeadsReportQuery, useGetDealsReportQuery, useGetTasksReportQuery,
  useGetFollowupsReportQuery,
} from '@/features/analytics/analyticsApi'

function fmt(v, suffix = '') {
  if (v === undefined || v === null) return '—'
  return `${v}${suffix}`
}

function ReportCard({ id, onClick }) {
  const meta = REPORT_META[id]
  if (!meta || meta.aliasOf) return null
  const Icon = meta.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-2.5 rounded-xl border border-[#F7F5FB] bg-white p-3 text-left shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50">
        <Icon className="h-4 w-4 text-brand-600" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{meta.label}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{meta.desc}</p>
        <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
          Open <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  )
}

export function AnalyticsPage() {
  const navigate = useNavigate()
  const formatChartCurrency = useFormatChartCurrency()
  const fmtMoney = (v) => {
    if (v === undefined || v === null) return '—'
    return formatChartCurrency(Number(v) || 0)
  }
  const filters = useReportFilters()
  const params = filters.queryParams
  const [query, setQuery] = useState('')

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
    { label: 'Overdue follow-ups', value: fk.overdue, icon: CalendarCheck, color: 'text-rose-600', bg: 'bg-rose-50', onClick: () => open('followups') },
  ]

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return REPORT_CATEGORIES
    return REPORT_CATEGORIES
      .map((cat) => ({
        ...cat,
        reports: cat.reports.filter((id) => {
          const meta = REPORT_META[id]
          if (!meta || meta.aliasOf) return false
          return meta.label.toLowerCase().includes(q) || meta.desc.toLowerCase().includes(q)
        }),
      }))
      .filter((cat) => cat.reports.length > 0)
  }, [query])

  return (
    <PageShell fullWidth>
      <PageStack className="gap-2">
        <ReportFilterBar
          filters={filters}
          meta={{ filters: [] }}
          leading={(
            <div className="relative w-full min-w-[180px] max-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a report…"
                className="border-[#F7F5FB] pl-9"
                aria-label="Find a report"
              />
            </div>
          )}
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ReportKpiCard label="Total Leads" value={fmt(lk.total)} icon={Users} />
          <ReportKpiCard label="Pipeline Value" value={fmtMoney(dk.pipelineValue)} icon={DollarSign} />
          <ReportKpiCard label="Open Tasks" value={fmt(tk.openTotal)} icon={ListTodo} />
          <ReportKpiCard label="Win Rate" value={fmt(dk.winRate, '%')} icon={Percent} />
        </div>

        <PageContentPanel className="border-[#F7F5FB] !p-2.5 sm:!p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">Needs attention</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {alerts.map(({ label, value, icon, color, bg, onClick }) => (
              <ReportKpiCard
                key={label}
                label={label}
                value={value ?? 0}
                icon={icon}
                iconBg={bg}
                iconColor={color}
                onClick={onClick}
              />
            ))}
          </div>
        </PageContentPanel>

        {filteredCategories.length === 0 ? (
          <PageContentPanel className="border-[#F7F5FB] !p-2.5 sm:!p-3">
            <p className="py-8 text-center text-sm text-ink-muted">No reports match &ldquo;{query}&rdquo;.</p>
          </PageContentPanel>
        ) : (
          filteredCategories.map((cat) => (
            <PageContentPanel key={cat.id} className="border-[#F7F5FB] !p-2.5 sm:!p-3">
              <div className="mb-3">
                <p className="font-semibold text-ink">{cat.label}</p>
                <p className="text-xs text-ink-muted">{cat.desc}</p>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {cat.reports.map((id) => (
                  <ReportCard key={id} id={id} onClick={() => open(id)} />
                ))}
              </div>
            </PageContentPanel>
          ))
        )}
      </PageStack>
    </PageShell>
  )
}
