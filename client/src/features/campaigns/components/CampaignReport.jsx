import { useMemo, useState, useEffect } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  BadgeDollarSign,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  Target,
  TrendingUp,
  UserCheck,
  UserMinus,
  Users,
  XCircle,
} from 'lucide-react'
import { useGetCampaignReportQuery } from '@/features/campaigns/campaignsApi'
import { formatDealMoney } from '@/features/deals/dealCurrencies'

const MODE_LABEL = {
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  cheque: 'Cheque',
  upi: 'UPI',
  card: 'Card',
  crypto: 'Crypto',
  other: 'Other',
}

const MODES = Object.entries(MODE_LABEL).map(([value, label]) => ({ value, label }))

const STATUSES = [
  { value: 'received', label: 'Received' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
]

const STATUS_CONFIG = {
  received: { label: 'Received', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  failed: { label: 'Failed', className: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  refunded: { label: 'Refunded', className: 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200' },
}

function fmt(n, currency) {
  return formatDealMoney(n ?? 0, currency || 'USD')
}

function pct(n, total) {
  if (!total) return 0
  return Math.min(100, Math.round((n / total) * 100))
}

function SummaryCard({ label, value, sub, Icon, accent }) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl border p-4 ${accent || 'border-neutral-200 bg-white'}`}>
      <div className="flex items-center gap-1.5 text-neutral-500">
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-bold tabular-nums tracking-tight text-neutral-900">{value}</p>
      {sub && <p className="text-[11px] leading-snug text-neutral-500">{sub}</p>}
    </div>
  )
}

function ProgressBar({ value, max, className }) {
  const w = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 ${className}`}>
      <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${w}%` }} />
    </div>
  )
}

function PillSelect({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-semibold text-neutral-700 outline-none focus:border-brand-500 cursor-pointer"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

const PAGE_SIZE = 10

export function CampaignReport({ campaignId, currency }) {
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMode, setFilterMode] = useState('')

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q.trim()); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [q])

  const onStatusChange = (v) => { setFilterStatus(v); setPage(1) }
  const onModeChange = (v) => { setFilterMode(v); setPage(1) }

  const queryParams = useMemo(() => ({
    id: campaignId,
    page,
    limit: PAGE_SIZE,
    ...(debouncedQ ? { q: debouncedQ } : {}),
    ...(filterStatus ? { status: filterStatus } : {}),
    ...(filterMode ? { mode: filterMode } : {}),
  }), [campaignId, page, debouncedQ, filterStatus, filterMode])

  const { data: res, isLoading, isFetching, isError } = useGetCampaignReportQuery(queryParams, { skip: !campaignId })
  const report = res?.data

  const cur = currency || report?.campaign?.currency || 'USD'

  const maxStageLeads = useMemo(
    () => Math.max(1, ...(report?.stageBreakdown?.map((s) => s.leadCount) ?? [0])),
    [report?.stageBreakdown],
  )
  const maxMemberReceived = useMemo(
    () => Math.max(1, ...(report?.teamPerformance?.map((m) => m.receivedAmount) ?? [0])),
    [report?.teamPerformance],
  )
  const totalModeAmount = useMemo(
    () => (report?.paymentsByMode ?? []).reduce((a, b) => a + b.amount, 0),
    [report?.paymentsByMode],
  )

  if (isLoading) {
    return (
      <div className="mt-6 flex items-center justify-center py-16 text-sm text-neutral-500">
        Loading report…
      </div>
    )
  }
  if (isError || !report) {
    return (
      <div className="mt-6 flex items-center justify-center gap-2 py-16 text-sm text-red-500">
        <AlertCircle className="h-4 w-4" />
        Could not load report.
      </div>
    )
  }

  const { summary, stageBreakdown, teamPerformance, paymentsByMode, recentPayments, paymentsMeta } = report
  const totalPages = paymentsMeta?.totalPages ?? 1
  const totalPayments = paymentsMeta?.total ?? 0

  return (
    <div className="mt-6 space-y-6">

      {/* Summary KPIs */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-neutral-900">Overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryCard
            label="Total leads"
            value={summary.totalLeads.toLocaleString()}
            sub={`${summary.assignedCount} assigned · ${summary.unassignedCount} unassigned`}
            Icon={Users}
          />
          <SummaryCard
            label="Total received"
            value={fmt(summary.totalReceived, cur)}
            sub="Payments with status Received"
            Icon={CheckCircle2}
            accent="border-emerald-200 bg-emerald-50"
          />
          <SummaryCard
            label="Pending"
            value={fmt(summary.totalPending, cur)}
            sub="Awaiting confirmation"
            Icon={Clock}
            accent="border-amber-200 bg-amber-50"
          />
          <SummaryCard
            label="Target"
            value={summary.leadTarget ? fmt(summary.leadTarget, cur) : '—'}
            sub={summary.leadTarget ? `${summary.achievedPct ?? 0}% achieved` : 'No target set'}
            Icon={Target}
          />
          <SummaryCard
            label="Failed"
            value={fmt(summary.totalFailed, cur)}
            sub="Payments marked failed"
            Icon={XCircle}
            accent="border-red-200 bg-red-50/60"
          />
          <SummaryCard
            label="Refunded"
            value={fmt(summary.totalRefunded, cur)}
            sub="Payments refunded"
            Icon={ArrowUpRight}
            accent="border-neutral-200 bg-neutral-50"
          />
        </div>

        {/* Target progress bar */}
        {summary.leadTarget > 0 && (
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-neutral-600">
              <span className="font-semibold">Target achievement</span>
              <span className="font-bold text-brand-700">{summary.achievedPct ?? 0}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
                style={{ width: `${summary.achievedPct ?? 0}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-neutral-500">
              <span>{fmt(summary.totalReceived, cur)} received</span>
              <span>Goal: {fmt(summary.leadTarget, cur)}</span>
            </div>
          </div>
        )}
      </section>

      {/* Stage Breakdown */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-neutral-900">Stage breakdown</h2>
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-brand-600 text-xs font-bold uppercase tracking-wide text-white">
              <tr>
                <th className="px-4 py-2.5 text-left">Stage</th>
                <th className="px-4 py-2.5 text-right">Leads</th>
                <th className="px-4 py-2.5 text-left">Distribution</th>
                <th className="px-4 py-2.5 text-right">Received</th>
                <th className="px-4 py-2.5 text-right">Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {stageBreakdown.map((s) => (
                <tr key={s.key} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-semibold text-neutral-800">{s.label}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-700">{s.leadCount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={s.leadCount} max={maxStageLeads} className="flex-1" />
                      <span className="w-9 text-right text-[11px] text-neutral-500">
                        {pct(s.leadCount, summary.totalLeads)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-700">
                    {s.receivedAmount > 0 ? fmt(s.receivedAmount, cur) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-600">
                    {s.pendingAmount > 0 ? fmt(s.pendingAmount, cur) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-neutral-50 text-xs font-bold">
              <tr className="border-t border-neutral-200">
                <td className="px-4 py-2.5 text-neutral-700">Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-neutral-900">{summary.totalLeads.toLocaleString()}</td>
                <td />
                <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">{fmt(summary.totalReceived, cur)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-amber-600">{fmt(summary.totalPending, cur)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Team Performance */}
      {teamPerformance.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold text-neutral-900">Team performance</h2>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-brand-600 text-xs font-bold uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-2.5 text-left">Member</th>
                  <th className="px-4 py-2.5 text-right">Leads</th>
                  <th className="px-4 py-2.5 text-right">Received</th>
                  <th className="px-4 py-2.5 text-left">Share of total</th>
                  <th className="px-4 py-2.5 text-right">Pending</th>
                  <th className="px-4 py-2.5 text-right">Avg / lead</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {teamPerformance.map((m) => {
                  const avg = m.leadsCount > 0 ? m.receivedAmount / m.leadsCount : 0
                  return (
                    <tr key={m.userId} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-xs font-bold text-brand-800">
                            {String(m.name || '?').slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-semibold text-neutral-900">{m.name}</p>
                            <p className="text-[11px] text-neutral-500">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-neutral-700">{m.leadsCount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-700">
                        {m.receivedAmount > 0 ? fmt(m.receivedAmount, cur) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={m.receivedAmount} max={maxMemberReceived} className="flex-1" />
                          <span className="w-9 text-right text-[11px] text-neutral-500">
                            {pct(m.receivedAmount, summary.totalReceived)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-600">
                        {m.pendingAmount > 0 ? fmt(m.pendingAmount, cur) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-neutral-500 text-xs">
                        {avg > 0 ? fmt(avg, cur) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {stageBreakdown.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white">
              <div className="border-b border-neutral-100 px-4 py-2.5">
                <p className="text-xs font-bold text-neutral-700">Leads by member &amp; stage</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-50 text-[10px] font-bold uppercase tracking-wide text-neutral-600">
                    <tr>
                      <th className="px-4 py-2 text-left">Member</th>
                      {stageBreakdown.map((s) => (
                        <th key={s.key} className="px-3 py-2 text-right">{s.label}</th>
                      ))}
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {teamPerformance.map((m) => (
                      <tr key={m.userId} className="hover:bg-neutral-50">
                        <td className="px-4 py-2 font-semibold text-neutral-800">{m.name}</td>
                        {stageBreakdown.map((s) => (
                          <td key={s.key} className="px-3 py-2 text-right tabular-nums text-neutral-600">
                            {m.byStage[s.key] ?? 0}
                          </td>
                        ))}
                        <td className="px-4 py-2 text-right tabular-nums font-bold text-neutral-900">
                          {m.leadsCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Payment by Mode */}
      {paymentsByMode.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold text-neutral-900">Payments by method</h2>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white p-4">
            <div className="space-y-3">
              {paymentsByMode.map((m) => (
                <div key={m.mode} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs font-semibold text-neutral-700">
                    {MODE_LABEL[m.mode] || m.mode}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-2 rounded-full bg-brand-500"
                      style={{ width: `${pct(m.amount, totalModeAmount)}%` }}
                    />
                  </div>
                  <span className="w-28 text-right text-xs tabular-nums font-semibold text-neutral-800">
                    {fmt(m.amount, cur)}
                  </span>
                  <span className="w-10 text-right text-[11px] text-neutral-500">
                    {pct(m.amount, totalModeAmount)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Payments table with search, filters, pagination */}
      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-bold text-neutral-900">
            All payments
            {totalPayments > 0 && (
              <span className="ml-2 text-xs font-normal text-neutral-500">({totalPayments.toLocaleString()} total)</span>
            )}
          </h2>
          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search lead, assignee, ref…"
                className="h-8 rounded-lg border border-neutral-200 bg-white pl-7 pr-3 text-xs outline-none focus:border-brand-500 w-48"
              />
            </div>
            <PillSelect value={filterStatus} onChange={onStatusChange} options={STATUSES} placeholder="All statuses" />
            <PillSelect value={filterMode} onChange={onModeChange} options={MODES} placeholder="All methods" />
            {(q || filterStatus || filterMode) && (
              <button
                type="button"
                onClick={() => { setQ(''); setFilterStatus(''); setFilterMode(''); setPage(1) }}
                className="h-8 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-600 text-xs font-bold uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-2.5 text-left">Date</th>
                  <th className="px-4 py-2.5 text-left">Lead</th>
                  <th className="px-4 py-2.5 text-left">Assigned to</th>
                  <th className="px-4 py-2.5 text-left">Method</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-left">Ref</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-neutral-100 transition-opacity ${isFetching ? 'opacity-50' : ''}`}>
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-400">
                      <BadgeDollarSign className="mx-auto mb-2 h-6 w-6 text-neutral-300" />
                      {q || filterStatus || filterMode ? 'No payments match these filters.' : 'No payments recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  recentPayments.map((p) => {
                    const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending
                    const dateStr = p.paymentDate
                      ? new Date(p.paymentDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'
                    return (
                      <tr key={p.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">{dateStr}</td>
                        <td className="px-4 py-3 font-semibold text-neutral-900 max-w-[10rem] truncate">{p.leadName}</td>
                        <td className="px-4 py-3 text-neutral-600">{p.assigneeName || '—'}</td>
                        <td className="px-4 py-3 text-xs text-neutral-600">{MODE_LABEL[p.mode] || p.mode}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-neutral-900">
                          {fmt(p.amount, p.currency || cur)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${sc.className}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-400 max-w-[8rem] truncate">{p.reference || '—'}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3">
              <p className="text-xs text-neutral-500">
                Page {page} of {totalPages} · {totalPayments.toLocaleString()} payments
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p
                  if (totalPages <= 5) p = i + 1
                  else if (page <= 3) p = i + 1
                  else if (page >= totalPages - 2) p = totalPages - 4 + i
                  else p = page - 2 + i
                  return (
                    <button
                      key={p}
                      type="button"
                      disabled={isFetching}
                      onClick={() => setPage(p)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-semibold transition ${
                        page === p
                          ? 'border-brand-500 bg-brand-600 text-white'
                          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                })}
                <button
                  type="button"
                  disabled={page >= totalPages || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
