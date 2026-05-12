import { useMemo, useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Award, Briefcase, ChevronDown, Target, UserRound, Users } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { useGetCampaignQuery, useGetCampaignLeadsQuery, usePatchCampaignLeadStageMutation } from '@/features/campaigns/campaignsApi'
import { LeadSourceTag } from '@/features/leads/components/LeadSourceTag'
import { cn } from '@/utils/cn'

function initials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || '—'
}

function companyGlyph(name) {
  const c = String(name || '?').trim().charAt(0).toUpperCase()
  return /[A-Z0-9]/.test(c) ? c : '?'
}

function formatLeadDate(iso) {
  if (!iso) return '—'
  try {
    const d = typeof iso === 'string' ? parseISO(iso) : new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return format(d, 'MMM d, yyyy • h:mm a')
  } catch {
    return '—'
  }
}

function PillSelect({ value, onChange, options, className }) {
  return (
    <div className={cn('relative inline-block min-w-[8.5rem]', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-full border border-neutral-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-neutral-800 shadow-sm outline-none transition hover:border-orange-200 hover:bg-orange-50/30 focus:border-orange-400"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" aria-hidden />
    </div>
  )
}

/** Horizontal funnel ribbon + stage headers (live counts from campaign funnel). */
function CampaignHorizontalFunnel({ stages, activeStageKey, onStageClick }) {
  const data = useMemo(() => {
    if (!stages?.length) return []
    const counts = stages.map((s) => Number(s.count) || 0)
    const base = counts[0] > 0 ? counts[0] : 1
    return stages.map((s, i) => ({
      key: s.key,
      label: s.label,
      count: counts[i],
      pct: Math.min(100, Math.round((counts[i] / base) * 100)),
    }))
  }, [stages])

  const vbW = 1000
  const vbH = 128
  const cy = 82
  const maxHalf = 38

  const polyPoints = useMemo(() => {
    const m = data.length
    if (m === 0) return ''
    const counts = data.map((d) => d.count)
    const maxC = Math.max(...counts, 1)
    const hs = counts.map((c) => Math.max((c / maxC) * maxHalf, m === 1 ? maxHalf * 0.42 : 7))
    const tops = []
    for (let i = 0; i <= m; i += 1) {
      const x = (i / m) * vbW
      const h = i < m ? hs[i] : hs[m - 1]
      tops.push(`${x},${cy - h}`)
    }
    const bots = []
    for (let i = m; i >= 0; i -= 1) {
      const x = (i / m) * vbW
      const h = i < m ? hs[i] : hs[m - 1]
      bots.push(`${x},${cy + h}`)
    }
    return [...tops, ...bots].join(' ')
  }, [data, vbW, cy, maxHalf])

  if (!data.length) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-white px-4 py-10 text-center text-sm text-neutral-500 shadow-sm">
        No funnel stages configured for this campaign yet.
      </div>
    )
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-sm">
      <div className="border-b border-neutral-100 px-4 py-3 sm:px-5">
        <h2 className="text-sm font-bold text-neutral-900">Campaign funnel</h2>
        <p className="mt-0.5 text-xs text-neutral-500">
          Live counts by stage · click a column to filter the roster (same as pipeline chips).
        </p>
      </div>

      <div
        className="grid divide-x divide-dashed divide-neutral-200/90"
        style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
      >
        {data.map((d) => {
          const active = activeStageKey === d.key
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => onStageClick(d.key)}
              className={cn(
                'group px-2 py-4 text-center transition sm:px-3',
                active ? 'bg-sky-50/90 ring-1 ring-inset ring-sky-300/80' : 'bg-white hover:bg-slate-50/80',
              )}
            >
              <div className="text-[11px] font-medium leading-tight text-neutral-500 sm:text-xs">{d.label}</div>
              <div className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-neutral-900 sm:text-3xl">
                {d.count.toLocaleString()}
              </div>
              <span className="mt-2 inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-600 ring-1 ring-neutral-200/80">
                {d.pct}%
              </span>
            </button>
          )
        })}
      </div>

      <div className="border-t border-neutral-100 bg-gradient-to-b from-white to-slate-50/60 px-1 pb-2 pt-1">
        <svg viewBox={`0 0 ${vbW} ${vbH}`} className="h-[88px] w-full sm:h-[108px]" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="camp-funnel-flow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="18%" stopColor="#dbeafe" />
              <stop offset="45%" stopColor="#93c5fd" />
              <stop offset="78%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
          </defs>
          <polygon points={polyPoints} fill="url(#camp-funnel-flow)" opacity={0.95} />
        </svg>
      </div>
    </div>
  )
}

export function CampaignDetailPage() {
  const { id } = useParams()
  const { data: campRes, isLoading: campLoading } = useGetCampaignQuery(id, { skip: !id })
  const campaign = campRes?.data

  const stages = useMemo(() => (Array.isArray(campaign?.stages) ? campaign.stages : []), [campaign?.stages])
  const displayFunnel = useMemo(() => {
    if (!campaign) return []
    if (Array.isArray(campaign.funnel) && campaign.funnel.length) return campaign.funnel
    const sc = campaign.stageCounts || {}
    return stages.map((s) => ({ ...s, count: Number(sc[s.key] || 0) }))
  }, [campaign, stages])

  const teamMembers = useMemo(() => {
    const raw = campaign?.teamMembers
    if (!Array.isArray(raw)) return []
    return raw.map((m) => m.user).filter(Boolean)
  }, [campaign?.teamMembers])

  const [stageKey, setStageKey] = useState('')
  const [assignedUserId, setAssignedUserId] = useState('')
  const [isOpp, setIsOpp] = useState('')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [selected, setSelected] = useState(() => new Set())

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  const leadQuery = useMemo(() => {
    const params = { campaignId: id }
    if (stageKey) params.stageKey = stageKey
    if (assignedUserId) params.assignedUserId = assignedUserId
    if (isOpp === 'true' || isOpp === 'false') params.isOpportunity = isOpp
    if (debouncedQ) params.q = debouncedQ
    return params
  }, [id, stageKey, assignedUserId, isOpp, debouncedQ])

  const { data: leadsRes, isLoading: leadsLoading } = useGetCampaignLeadsQuery(leadQuery, { skip: !id })
  const rows = useMemo(() => leadsRes?.data || [], [leadsRes?.data])
  const [patchStage, { isLoading: patching }] = usePatchCampaignLeadStageMutation()

  const totalLeads = useMemo(
    () => displayFunnel.reduce((a, s) => a + (Number(s.count) || 0), 0),
    [displayFunnel],
  )
  const formatAmount = useCallback((n) => {
    const v = Number(n)
    if (!Number.isFinite(v)) return '—'
    return `₹${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }, [])

  const memberCount = teamMembers.length
  const leadTargetRaw = Number(campaign?.leadTarget)
  const hasLeadTarget = Number.isFinite(leadTargetRaw) && leadTargetRaw > 0
  const achievedAmount = Number(campaign?.totalAmount) || 0
  const achievedPct = hasLeadTarget ? Math.min(100, Math.round((achievedAmount / leadTargetRaw) * 100)) : null

  const kpiStrip = useMemo(() => {
    return [
      { label: 'Total leads', value: totalLeads, sub: 'In this campaign', Icon: Users },
      {
        label: 'Campaign target',
        value: hasLeadTarget ? formatAmount(leadTargetRaw) : '—',
        sub: hasLeadTarget ? 'Amount goal' : 'Not set on campaign',
        Icon: Target,
      },
      { label: 'Total members', value: memberCount, sub: 'On campaign team', Icon: UserRound },
      {
        label: 'Target achieved',
        value: hasLeadTarget ? `${achievedPct}%` : '—',
        sub: hasLeadTarget ? `${formatAmount(achievedAmount)} / ${formatAmount(leadTargetRaw)}` : 'Set a target to track',
        Icon: Award,
      },
    ]
  }, [achievedAmount, achievedPct, formatAmount, hasLeadTarget, leadTargetRaw, memberCount, totalLeads])

  const onFunnelClick = useCallback((key) => {
    setStageKey((prev) => (prev === key ? '' : key))
  }, [])

  const onStageChange = async (leadId, nextKey) => {
    if (!id || !nextKey) return
    try {
      await patchStage({ campaignId: id, leadId, stageKey: nextKey }).unwrap()
    } catch {
      /* toast in api */
    }
  }

  const toggleSelect = (leadId) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(leadId)) next.delete(leadId)
      else next.add(leadId)
      return next
    })
  }

  const stageOptions = stages.length ? stages : displayFunnel

  return (
    <PageShell fullWidth mainClassName="border-t border-neutral-100 bg-[#fafafa] px-4 pb-10 pt-3 sm:px-6">
      <div className="mx-auto w-full max-w-[1600px]">
        {campLoading ? (
          <p className="mt-8 text-sm text-neutral-500">Loading campaign…</p>
        ) : !campaign ? (
          <p className="mt-8 text-sm text-red-600">Campaign not found.</p>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
              <header className="min-w-0 flex-1 md:max-w-[min(100%,42rem)] md:pr-2">
                <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">{campaign.name}</h1>
                <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-neutral-600 sm:text-sm">
                  {String(campaign.description || '').trim() ||
                    'See how leads move through this campaign, who owns follow-ups, and where momentum is building.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <PillSelect
                    value={isOpp}
                    onChange={setIsOpp}
                    options={[
                      { value: '', label: 'All records' },
                      { value: 'true', label: 'Opportunities' },
                      { value: 'false', label: 'Leads only' },
                    ]}
                  />
                  <PillSelect
                    value={assignedUserId}
                    onChange={setAssignedUserId}
                    options={[
                      { value: '', label: 'All owners' },
                      ...teamMembers.map((u) => ({ value: u.id, label: u.name || u.email || u.id })),
                    ]}
                  />
                </div>
              </header>

              {/* KPI strip — compact, aligned to the right of the title block on md+ */}
              <div className="w-full shrink-0 overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-sm md:mt-0 md:w-auto md:max-w-[min(100%,34rem)] lg:max-w-[min(100%,38rem)]">
                <div className="grid grid-cols-2 divide-x divide-y divide-neutral-100 sm:grid-cols-4 sm:divide-y-0 md:grid-cols-2 md:divide-y lg:grid-cols-4 lg:divide-y-0">
                  {kpiStrip.map(({ label, value, sub, Icon }, i) => (
                    <div
                      key={label}
                      className={cn(
                        'flex flex-col gap-0.5 px-2.5 py-2.5 sm:px-3 sm:py-3',
                        i === 0 ? 'bg-gradient-to-br from-white to-orange-50/40' : 'bg-white',
                      )}
                    >
                      <div className="flex items-center gap-1 text-neutral-500">
                        <Icon className="h-3 w-3 shrink-0 text-orange-500 sm:h-3.5 sm:w-3.5" strokeWidth={2} aria-hidden />
                        <span className="text-[9px] font-bold uppercase tracking-wide text-neutral-500 sm:text-[10px]">
                          {label}
                        </span>
                      </div>
                      <p className="text-lg font-bold tabular-nums tracking-tight text-neutral-900 sm:text-xl">
                        {typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : value}
                      </p>
                      <p className="text-[10px] leading-snug text-neutral-500 sm:text-[11px]">{sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <CampaignHorizontalFunnel stages={displayFunnel} activeStageKey={stageKey} onStageClick={onFunnelClick} />

            {/* Search + table */}
            <div className="mt-6 rounded-2xl border border-neutral-200/90 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <h2 className="text-sm font-bold text-neutral-900">Campaign roster</h2>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name, email, company…"
                  className="w-full max-w-md rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:bg-white"
                />
              </div>

              <div className="overflow-x-auto">
                {leadsLoading ? (
                  <p className="px-5 py-8 text-sm text-neutral-500">Loading leads…</p>
                ) : (
                  <table className="w-full min-w-[1100px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-neutral-100 bg-neutral-50/90 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                        <th className="w-10 px-3 py-3 pl-4 sm:pl-5" />
                        <th className="px-3 py-3">Contact</th>
                        <th className="px-3 py-3">Organization</th>
                        <th className="px-3 py-3">Source</th>
                        <th className="px-3 py-3">Email</th>
                        <th className="px-3 py-3">Phone</th>
                        <th className="px-3 py-3">Pipeline</th>
                        <th className="px-3 py-3">Campaign stage</th>
                        <th className="px-3 py-3">Owner</th>
                        <th className="px-3 py-3 pr-4 sm:pr-5">Added</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {rows.map((row) => {
                        const l = row.lead || {}
                        const name = (l.contactName || l.title || 'Untitled').trim()
                        const checked = selected.has(l.id)
                        return (
                          <tr key={row.campaignLeadId} className={cn('transition hover:bg-orange-50/40', checked && 'bg-orange-50/60')}>
                            <td className="px-3 py-3 pl-4 sm:pl-5">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSelect(l.id)}
                                className="rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                                aria-label={`Select ${name}`}
                              />
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-orange-50 text-xs font-bold text-orange-800 ring-1 ring-orange-200/60">
                                  {initials(name)}
                                </span>
                                <Link to={`/leads/${l.id}`} className="font-semibold text-neutral-900 hover:text-orange-600">
                                  {name}
                                </Link>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs font-bold text-neutral-600 ring-1 ring-neutral-200/80">
                                  {companyGlyph(l.company)}
                                </span>
                                <span className="text-neutral-700">{l.company || '—'}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <LeadSourceTag source={l.source} />
                            </td>
                            <td className="max-w-[10rem] truncate px-3 py-3 text-neutral-700" title={l.email || ''}>
                              {l.email || '—'}
                            </td>
                            <td className="max-w-[8rem] truncate px-3 py-3 text-neutral-700" title={l.phone || ''}>
                              {l.phone || '—'}
                            </td>
                            <td className="px-3 py-3">
                              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-700">
                                <Briefcase className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
                                <span className="max-w-[9rem] truncate">{l.opportunityStage || '—'}</span>
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <select
                                value={row.stageKey}
                                disabled={patching}
                                onChange={(e) => onStageChange(l.id, e.target.value)}
                                className="max-w-[9.5rem] cursor-pointer rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs font-semibold text-neutral-800 outline-none focus:border-orange-400"
                              >
                                {stageOptions.map((s) => (
                                  <option key={s.key} value={s.key}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-3 text-xs text-neutral-700">
                              {row.campaignAssignee?.name || row.campaignAssignee?.email || '—'}
                            </td>
                            <td className="px-3 py-3 pr-4 text-xs tabular-nums text-neutral-600 sm:pr-5">{formatLeadDate(l.createdAt)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              {!leadsLoading && rows.length === 0 ? (
                <p className="border-t border-neutral-100 px-5 py-8 text-center text-sm text-neutral-500">No leads match these filters.</p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </PageShell>
  )
}
