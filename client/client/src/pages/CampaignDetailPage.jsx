import { useMemo, useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'

import {
  Award,
  BarChart2,
  Briefcase,
  CalendarDays,
  ChevronDown,
  DollarSign,
  Download,
  History,
  ListOrdered,
  Shuffle,
  Target,
  Trash2,
  UserPlus,
  UserRound,
  Users,
} from '@/components/ui/icons'
import { formatCampaignEndDate } from '@/features/campaigns/campaignDateUtils'
import { PageShell } from '@/components/layout/PageShell'
import { SkeletonDetail } from '@/components/shared/SkeletonLoader'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { DataGrid } from '@/components/shared/DataGrid'
import {
  useGetCampaignQuery,
  useGetCampaignLeadsQuery,
  usePatchCampaignLeadStageMutation,
  useRemoveCampaignLeadMutation,
  useDistributeCampaignLeadsMutation,
  useLazyExportCampaignLeadsCsvQuery,
  useLazyExportCampaignPaymentsCsvQuery,
} from '@/features/campaigns/campaignsApi'
import { CampaignFunnelChart } from '@/features/campaigns/components/CampaignFunnelChart'
import { CampaignPaymentsDrawer } from '@/features/campaigns/components/CampaignPaymentsDrawer'
import { CampaignStageEditorDrawer } from '@/features/campaigns/components/CampaignStageEditorDrawer'
import { CampaignStageHistoryDrawer } from '@/features/campaigns/components/CampaignStageHistoryDrawer'
import { formatDealMoney } from '@/features/deals/dealCurrencies'
import { AddLeadsDrawer } from '@/features/campaigns/components/AddLeadsDrawer'
import { AddMembersDrawer } from '@/features/campaigns/components/AddMembersDrawer'
import { cn } from '@/utils/cn'

function downloadCsvText(csvText, filename) {
  const blob = new Blob([csvText], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function initials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || '—'
}

function PillSelect({ value, onChange, options, className }) {
  return (
    <div className={cn('relative inline-block min-w-[8.5rem]', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-full border border-neutral-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-neutral-800 shadow-sm outline-none transition hover:border-brand-200 hover:bg-brand-50/30 focus:border-brand-500"
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

export function CampaignDetailPage() {
  const { id } = useParams()
  const authUser = useSelector((s) => s.auth.user)
  const isSalesRole = !authUser?.isCompanyAdmin && authUser?.companyRole?.userRoleKind === 'sales'
  const canManage = !isSalesRole

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

  // drawer states
  const [addLeadsOpen, setAddLeadsOpen] = useState(false)
  const [addMembersOpen, setAddMembersOpen] = useState(false)
  const [removeConfirmId, setRemoveConfirmId] = useState(null)
  const [stageEditorOpen, setStageEditorOpen] = useState(false)
  const [stageHistory, setStageHistory] = useState(null) // { leadId, leadName }

  const [triggerExportLeads, { isFetching: exportingLeads }] = useLazyExportCampaignLeadsCsvQuery()
  const [triggerExportPayments, { isFetching: exportingPayments }] = useLazyExportCampaignPaymentsCsvQuery()

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

  // IDs of leads already in campaign (for AddLeadsDrawer exclusion)
  const existingLeadIds = useMemo(() => rows.map((r) => r.lead?.id).filter(Boolean), [rows])

  const [patchStage, { isLoading: patching }] = usePatchCampaignLeadStageMutation()
  const [removeLead, { isLoading: removing }] = useRemoveCampaignLeadMutation()
  const [paymentsDrawer, setPaymentsDrawer] = useState(null) // { leadId, leadName }
  const [distribute, { isLoading: distributing }] = useDistributeCampaignLeadsMutation()

  const totalLeads = useMemo(
    () => displayFunnel.reduce((a, s) => a + (Number(s.count) || 0), 0),
    [displayFunnel],
  )
  const campaignCurrency = campaign?.currency || 'USD'
  const formatAmount = useCallback(
    (n) => formatDealMoney(n, campaignCurrency),
    [campaignCurrency],
  )

  const memberCount = teamMembers.length
  const endDateLabel = formatCampaignEndDate(campaign?.endDate)
  const leadTargetRaw = Number(campaign?.leadTarget)
  const hasLeadTarget = Number.isFinite(leadTargetRaw) && leadTargetRaw > 0
  const achievedAmount = Number(campaign?.totalAmount) || 0
  const achievedPct = hasLeadTarget ? Math.min(100, Math.round((achievedAmount / leadTargetRaw) * 100)) : null

  const kpiStrip = useMemo(() => ([
    { label: 'Total leads', value: totalLeads, sub: 'In this campaign', Icon: Users },
    { label: 'Campaign target', value: hasLeadTarget ? formatAmount(leadTargetRaw) : '—', sub: hasLeadTarget ? 'Amount goal' : 'Not set on campaign', Icon: Target },
    { label: 'Total members', value: memberCount, sub: 'On campaign team', Icon: UserRound },
    { label: 'Target achieved', value: hasLeadTarget ? `${achievedPct}%` : '—', sub: hasLeadTarget ? `${formatAmount(achievedAmount)} / ${formatAmount(leadTargetRaw)}` : 'Set a target to track', Icon: Award },
  ]), [achievedAmount, achievedPct, formatAmount, hasLeadTarget, leadTargetRaw, memberCount, totalLeads])

  const onFunnelClick = useCallback((key) => {
    setStageKey((prev) => (prev === key ? '' : key))
  }, [])

  const onStageChange = async (leadId, nextKey) => {
    if (!id || !nextKey) return
    try { await patchStage({ campaignId: id, leadId, stageKey: nextKey }).unwrap() } catch { /* toast in api */ }
  }

  const onRemoveLead = async (leadId) => {
    try {
      await removeLead({ campaignId: id, leadId }).unwrap()
      toast.success('Lead removed from campaign')
      setRemoveConfirmId(null)
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Could not remove lead')
    }
  }

  const onDistribute = async () => {
    try {
      const res = await distribute({ campaignId: id }).unwrap()
      const n = res?.data?.distributed ?? 0
      if (n === 0) toast('No unassigned leads to distribute', { icon: 'ℹ️' })
      else toast.success(`${n} lead${n !== 1 ? 's' : ''} distributed to team members`)
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Distribution failed')
    }
  }

  const onExportLeads = async () => {
    try {
      const csv = await triggerExportLeads({ campaignId: id }).unwrap()
      downloadCsvText(csv, `campaign-${id}-leads.csv`)
      toast.success('Leads exported')
    } catch {
      toast.error('Export failed')
    }
  }

  const onExportPayments = async () => {
    try {
      const csv = await triggerExportPayments({ campaignId: id }).unwrap()
      downloadCsvText(csv, `campaign-${id}-payments.csv`)
      toast.success('Payments exported')
    } catch {
      toast.error('Export failed')
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
  const stageLabelByKey = useMemo(
    () => Object.fromEntries(stageOptions.map((s) => [s.key, s.label])),
    [stageOptions],
  )

  const rosterColumns = useMemo(
    () => [
      {
        field: 'select',
        headerName: '',
        width: 50,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => {
          const l = row.lead || {}
          return (
            <input
              type="checkbox"
              checked={selected.has(l.id)}
              onChange={() => toggleSelect(l.id)}
              onClick={(e) => e.stopPropagation()}
              className="rounded border-neutral-300 text-brand-700 focus:ring-brand-500"
              aria-label={`Select ${(l.contactName || l.title || 'Untitled').trim()}`}
            />
          )
        },
      },
      {
        field: 'contact',
        headerName: 'Contact',
        flex: 1,
        minWidth: 160,
        renderCell: ({ row }) => {
          const l = row.lead || {}
          const name = (l.contactName || l.title || 'Untitled').trim()
          return (
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-50 text-xs font-bold text-brand-800 ring-1 ring-brand-200/60">
                {initials(name)}
              </span>
              <Link to={`/leads/${l.id}`} className="font-semibold text-neutral-900 hover:text-brand-700" onClick={(e) => e.stopPropagation()}>
                {name}
              </Link>
            </div>
          )
        },
      },
      {
        field: 'email',
        headerName: 'Email',
        width: 140,
        valueGetter: (_v, row) => row.lead?.email || '—',
      },
      {
        field: 'phone',
        headerName: 'Phone',
        width: 120,
        valueGetter: (_v, row) => row.lead?.phone || '—',
      },
      {
        field: 'pipeline',
        headerName: 'Pipeline',
        width: 130,
        renderCell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-700">
            <Briefcase className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
            <span className="max-w-[9rem] truncate">{row.lead?.opportunityStage || '—'}</span>
          </span>
        ),
      },
      {
        field: 'stageKey',
        headerName: 'Campaign stage',
        width: 190,
        sortable: false,
        renderCell: ({ row }) => {
          const leadId = row.lead?.id
          const leadName = (row.lead?.contactName || row.lead?.title || '').trim() || 'Lead'
          return (
            <div className="flex items-center gap-1.5">
              <Select
                value={row.stageKey}
                disabled={patching}
                onChange={(e) => onStageChange(leadId, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="max-w-[9.5rem] cursor-pointer text-xs font-semibold"
              >
                {stageOptions.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </Select>
              <button
                type="button"
                title="Stage history"
                onClick={(e) => { e.stopPropagation(); setStageHistory({ leadId, leadName }) }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <History className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        },
      },
      {
        field: 'owner',
        headerName: 'Owner',
        width: 120,
        valueGetter: (_v, row) => row.campaignAssignee?.name || row.campaignAssignee?.email || '—',
      },
      {
        field: 'paymentTotal',
        headerName: `Payments (${campaignCurrency})`,
        width: 160,
        sortable: false,
        renderCell: ({ row }) => {
          const leadId = row.lead?.id
          const leadName = (row.lead?.contactName || row.lead?.title || '').trim() || 'Lead'
          const total = Number(row.paymentTotal) || 0
          return (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setPaymentsDrawer({ leadId, leadName }) }}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition"
            >
              <DollarSign className="h-3 w-3 shrink-0 text-emerald-500" />
              {total > 0 ? formatAmount(total) : 'Add payments'}
            </button>
          )
        },
      },
      ...(canManage ? [{
        field: 'actions',
        headerName: '',
        width: 56,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => {
          const leadId = row.lead?.id
          const isConfirming = removeConfirmId === leadId
          return (
            <div className="flex items-center gap-1">
              {isConfirming ? (
                <>
                  <button
                    type="button"
                    title="Confirm remove"
                    className="h-7 rounded-lg bg-red-600 px-2 text-[11px] font-semibold text-white hover:bg-red-700"
                    disabled={removing}
                    onClick={(e) => { e.stopPropagation(); onRemoveLead(leadId) }}
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    title="Cancel"
                    className="h-7 rounded-lg border border-surface-border px-2 text-[11px] font-semibold text-ink-muted hover:bg-surface-subtle"
                    onClick={(e) => { e.stopPropagation(); setRemoveConfirmId(null) }}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  title="Remove from campaign"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-border text-ink-muted hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  onClick={(e) => { e.stopPropagation(); setRemoveConfirmId(leadId) }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )
        },
      }] : []),
    ],
    [selected, stageOptions, patching, campaignCurrency, formatAmount, canManage, removeConfirmId, removing],
  )

  const rosterRows = useMemo(
    () => rows.map((row) => ({ ...row, id: row.campaignLeadId ?? row.id })),
    [rows],
  )

  return (
    <PageShell fullWidth mainClassName="border-t border-surface-border px-4 pb-10 pt-3 sm:px-6">
      <div className="mx-auto w-full max-w-[1600px]">
        {campLoading ? (
          <div className="mt-4"><SkeletonDetail /></div>
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
                {endDateLabel ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-900">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    End date: {endDateLabel}
                  </p>
                ) : null}

                {/* Filter pills */}
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
                  {!isSalesRole && (
                    <PillSelect
                      value={assignedUserId}
                      onChange={setAssignedUserId}
                      options={[
                        { value: '', label: 'All owners' },
                        ...teamMembers.map((u) => ({ value: u.id, label: u.name || u.email || u.id })),
                      ]}
                    />
                  )}
                </div>
              </header>

              {/* KPI strip */}
              <div className="w-full shrink-0 overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-sm md:mt-0 md:w-auto md:max-w-[min(100%,34rem)] lg:max-w-[min(100%,38rem)]">
                <div className="grid grid-cols-2 divide-x divide-y divide-neutral-100 sm:grid-cols-4 sm:divide-y-0 md:grid-cols-2 md:divide-y lg:grid-cols-4 lg:divide-y-0">
                  {kpiStrip.map(({ label, value, sub, Icon }, i) => (
                    <div
                      key={label}
                      className={cn(
                        'flex flex-col gap-0.5 px-2.5 py-2.5 sm:px-3 sm:py-3',
                        i === 0 ? 'bg-gradient-to-br from-white to-brand-50/40' : 'bg-white',
                      )}
                    >
                      <div className="flex items-center gap-1 text-neutral-500">
                        <Icon className="h-3 w-3 shrink-0 text-brand-600 sm:h-3.5 sm:w-3.5" strokeWidth={2} aria-hidden />
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

            {/* Action buttons — admins/managers only */}
            {canManage && (
              <div className="mt-3 flex w-full flex-nowrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  onClick={() => setAddLeadsOpen(true)}
                >
                  <Users className="h-3.5 w-3.5" />
                  Add leads
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setAddMembersOpen(true)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add members
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  disabled={distributing}
                  onClick={onDistribute}
                  title="Distribute all unassigned leads round-robin to team members"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  {distributing ? 'Distributing…' : 'Distribute unassigned'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setStageEditorOpen(true)}
                >
                  <ListOrdered className="h-3.5 w-3.5" />
                  Edit stages
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  disabled={exportingLeads}
                  onClick={onExportLeads}
                >
                  <Download className="h-3.5 w-3.5" />
                  {exportingLeads ? 'Exporting…' : 'Export leads'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  disabled={exportingPayments}
                  onClick={onExportPayments}
                >
                  <Download className="h-3.5 w-3.5" />
                  {exportingPayments ? 'Exporting…' : 'Export payments'}
                </Button>
                <Link
                  to={`/campaigns/${id}/report`}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700 shadow-sm hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition"
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  View report
                </Link>
              </div>
            )}

            <CampaignFunnelChart stages={displayFunnel} activeStageKey={stageKey} onStageClick={onFunnelClick} />

            {/* Team members section */}
            {teamMembers.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-ink-muted">Team:</span>
                {teamMembers.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-white px-2.5 py-1 text-xs font-medium text-ink"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
                      {initials(u.name)}
                    </span>
                    {u.name || u.email}
                  </span>
                ))}
              </div>
            )}

            {/* Roster */}
            {(
            <div className="mt-6 rounded-2xl border border-neutral-200/90 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <h2 className="text-sm font-bold text-neutral-900">Campaign roster</h2>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name, email, company…"
                  className="w-full max-w-md rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:bg-white"
                />
              </div>

              <DataGrid
                gridColumns
                columns={rosterColumns}
                data={rosterRows}
                loading={leadsLoading}
                searchable={false}
                showColumnToggle={false}
                showExportCsv={false}
                hideFooter={rosterRows.length <= 25}
                getRowClassName={(params) => {
                  const l = params.row.lead || {}
                  return selected.has(l.id) ? '!bg-brand-50/60' : ''
                }}
                emptyTitle="No leads match these filters"
                maxHeightClass="max-h-[min(60vh,560px)]"
                className="rounded-none border-0 shadow-none"
              />
            </div>
            )}
          </>
        )}
      </div>

      {/* Drawers */}
      <AddLeadsDrawer
        open={addLeadsOpen}
        onClose={() => setAddLeadsOpen(false)}
        campaignId={id}
        existingLeadIds={existingLeadIds}
      />
      <AddMembersDrawer
        open={addMembersOpen}
        onClose={() => setAddMembersOpen(false)}
        campaignId={id}
        existingMemberIds={teamMembers.map((u) => u.id)}
      />
      <CampaignPaymentsDrawer
        open={!!paymentsDrawer}
        onClose={() => setPaymentsDrawer(null)}
        campaignId={id}
        leadId={paymentsDrawer?.leadId}
        leadName={paymentsDrawer?.leadName}
        currency={campaignCurrency}
        campaignName={campaign?.name}
      />
      <CampaignStageEditorDrawer
        open={stageEditorOpen}
        onClose={() => setStageEditorOpen(false)}
        campaignId={id}
        stages={stageOptions}
      />
      <CampaignStageHistoryDrawer
        open={!!stageHistory}
        onClose={() => setStageHistory(null)}
        campaignId={id}
        leadId={stageHistory?.leadId}
        leadName={stageHistory?.leadName}
        stageLabelByKey={stageLabelByKey}
      />
    </PageShell>
  )
}
