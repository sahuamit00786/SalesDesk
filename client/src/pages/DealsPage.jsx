import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  Filter,
  Kanban,
  List,
  Plus,
  Search,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { AddDealDrawer } from '@/features/deals/components/AddDealDrawer'
import { DealsPipelineKanban } from '@/features/deals/components/DealsPipelineKanban'
import { DealDetailPanel } from '@/features/deals/components/DealDetailPanel'
import { formatStageLabel } from '@/features/opportunities/components/OpportunitiesKanban'
import { useGetDealsQuery, usePatchDealStageMutation, useCreateDealMutation } from '@/features/deals/dealsApi'
import { useGetLeadFormMetaQuery, useGetLeadQuery } from '@/features/leads/leadsApi'
import { cn } from '@/utils/cn'
import { formatAggregatedDealAmount, formatDealMoney } from '@/features/deals/dealCurrencies'

const STAGE_FILTER_FALLBACK = ['Lead Inbound', 'New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost']

const SORT_OPTIONS = [
  { value: 'updatedAt:desc', label: 'Recently updated' },
  { value: 'dealValue:desc', label: 'Deal value (high → low)' },
  { value: 'dealValue:asc', label: 'Deal value (low → high)' },
  { value: 'fullName:asc', label: 'Name (A → Z)' },
  { value: 'companyName:asc', label: 'Company (A → Z)' },
  { value: 'leadScore:desc', label: 'Lead score (high → low)' },
  { value: 'createdAt:desc', label: 'Newest first' },
]

function initials(name) {
  return String(name || 'NA')
    .split(' ')
    .map((x) => x[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function parseSort(v) {
  const [sort = 'updatedAt', order = 'desc'] = String(v || '').split(':')
  return { sort, order }
}

function shortUpdated(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function ParentOpportunityLabel({ id }) {
  const { data } = useGetLeadQuery(id, { skip: !id })
  const lead = data?.data
  const label = (lead?.title || lead?.contactName || '').trim() || 'Opportunity'
  return <span>{label}</span>
}

function DealsTableRow({ row, opportunityStages, updatingStage, onStageChange, onOpenSidebar, onOpenPage }) {
  return (
    <tr className="border-t border-neutral-100 hover:bg-neutral-50/80">
      <td className="px-4 py-3 text-xs text-neutral-700">
        {row.parentOpportunityLeadId ? <ParentOpportunityLabel id={row.parentOpportunityLeadId} /> : '—'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => onOpenSidebar(row.id)}
          >
            <span className="text-sm font-bold text-neutral-900 hover:text-orange-600">{row.dealName || row.companyName}</span>
            <span className="mt-0.5 block truncate text-xs text-neutral-500">{row.companyName}</span>
          </button>
          <button
            type="button"
            title="Open full page"
            className="shrink-0 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            onClick={() => onOpenPage(row.id)}
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="relative max-w-[200px]">
          <select
            className="h-8 w-full appearance-none rounded-md border border-neutral-300 bg-white pl-2 pr-8 text-xs font-semibold text-neutral-800"
            value={row.currentStage || ''}
            disabled={updatingStage}
            onChange={(e) => onStageChange(row, e.target.value)}
            aria-label="Stage"
          >
            {!row.currentStage ? <option value="">Select stage</option> : null}
            {opportunityStages.length === 0 && row.currentStage ? (
              <option value={row.currentStage}>{formatStageLabel(row.currentStage)}</option>
            ) : null}
            {row.currentStage && opportunityStages.length > 0 && !opportunityStages.some((s) => s.name === row.currentStage) ? (
              <option value={row.currentStage}>{formatStageLabel(row.currentStage)}</option>
            ) : null}
            {opportunityStages
              .filter((stage) => stage?.name)
              .map((stage) => (
                <option key={`${row.id}-${stage.name}`} value={stage.name}>
                  {formatStageLabel(stage.name)}
                </option>
              ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-bold text-neutral-900">
        {formatDealMoney(row.dealValue, row.dealCurrency)}
      </td>
      <td className="px-4 py-3 text-xs text-neutral-700">{row.fullName}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-700">
            {initials(row.owner?.name || row.owner?.email)}
          </span>
          <span className="text-xs font-medium text-neutral-800">{row.owner?.name || row.owner?.email || '—'}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-neutral-500">{shortUpdated(row.updatedAt)}</td>
    </tr>
  )
}

export function DealsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [mode, setMode] = useState('pipeline')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedStages, setSelectedStages] = useState([])
  const [openFilter, setOpenFilter] = useState(false)
  const [openSort, setOpenSort] = useState(false)
  const [sortValue, setSortValue] = useState('updatedAt:desc')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [openAddDealDrawer, setOpenAddDealDrawer] = useState(false)
  const [groupByOpportunity, setGroupByOpportunity] = useState(false)
  const [editingOpp, setEditingOpp] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const { sort, order } = parseSort(sortValue)

  const listQuery = useMemo(() => {
    const q = {
      page,
      limit: mode === 'pipeline' ? Math.min(400, Math.max(limit, 100)) : limit,
      search: debouncedSearch || undefined,
      stage: selectedStages.length ? selectedStages.join(',') : undefined,
      sort,
      order,
    }
    return Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== ''))
  }, [page, limit, mode, debouncedSearch, selectedStages, sort, order])

  const { data, isLoading, isFetching, refetch } = useGetDealsQuery(listQuery)
  const { data: formMetaData } = useGetLeadFormMetaQuery()
  const [patchStage, { isLoading: updatingStage }] = usePatchDealStageMutation()
  const [createDeal] = useCreateDealMutation()

  const rows = useMemo(() => data?.data || [], [data?.data])
  const groupedForList = useMemo(() => {
    if (!groupByOpportunity) return null
    const byParent = new Map()
    const direct = []
    for (const r of rows) {
      const pid = r.parentOpportunityLeadId
      if (!pid) direct.push(r)
      else {
        if (!byParent.has(pid)) byParent.set(pid, [])
        byParent.get(pid).push(r)
      }
    }
    return { byParent, direct }
  }, [rows, groupByOpportunity])

  const total = data?.meta?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / (mode === 'pipeline' ? listQuery.limit : limit)))
  const users = formMetaData?.data?.users || []
  const opportunityStages = formMetaData?.data?.opportunityStages || []

  const stageFilterOptions = useMemo(() => {
    const names = opportunityStages.map((s) => s.name).filter(Boolean)
    if (names.length) return names
    return STAGE_FILTER_FALLBACK
  }, [opportunityStages])

  const dealStageName = useMemo(
    () => opportunityStages.find((stage) => stage?.isDealStatus)?.name || '',
    [opportunityStages],
  )

  useEffect(() => {
    const allowed = new Set(stageFilterOptions)
    setSelectedStages((prev) => prev.filter((x) => allowed.has(x)))
  }, [stageFilterOptions])

  useEffect(() => {
    setPage(1)
  }, [mode, debouncedSearch, selectedStages, sortValue, limit])

  /** Deep-link: ?opportunityId= or ?leadId= creates a deal under that funnel opportunity once. */
  const linkOppId = searchParams.get('opportunityId') || searchParams.get('leadId') || ''
  const { data: linkLeadRes } = useGetLeadQuery(linkOppId, { skip: !linkOppId })
  const linkLead = linkLeadRes?.data
  const linkProcessed = useRef('')
  useEffect(() => {
    if (!linkOppId || !linkLead?.id) return
    if (linkProcessed.current === linkOppId) return
    let cancelled = false
    ;(async () => {
      try {
        await createDeal({
          opportunityLeadId: linkOppId,
          name: (linkLead.title || linkLead.contactName || 'Deal').trim(),
          description: null,
          value: Number(linkLead.value || 0),
          valueCurrency: String(linkLead.valueCurrency || linkLead.value_currency || 'USD')
            .trim()
            .toUpperCase()
            .slice(0, 3) || 'USD',
          ownerUserId: linkLead.assignedTo || null,
        }).unwrap()
        if (!cancelled) {
          linkProcessed.current = linkOppId
          toast.success('Deal added to pipeline')
        }
      } catch (e) {
        if (!cancelled) toast.error(e?.data?.error?.message || e?.error || 'Could not add deal to pipeline')
      } finally {
        if (!cancelled) {
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev)
              next.delete('opportunityId')
              next.delete('leadId')
              next.delete('from')
              return next
            },
            { replace: true },
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [linkOppId, linkLead?.id, linkLead, createDeal, setSearchParams])

  const revenueSum = useMemo(() => rows.reduce((acc, r) => acc + Number(r.dealValue || 0), 0), [rows])

  function toggleStage(name) {
    setSelectedStages((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]))
    setPage(1)
  }

  const exportVisibleRows = () => {
    if (!rows.length) {
      toast.error('Nothing to export')
      return
    }
    const exportRows = rows.map((row) => ({
      'Parent opportunity id': row.parentOpportunityLeadId || '',
      'Deal name': row.dealName || row.companyName || '',
      Company: row.companyName || '',
      Contact: row.fullName || '',
      Stage: row.currentStage || '',
      Value: row.dealValue ?? 0,
      Currency: row.dealCurrency || 'USD',
      Owner: row.owner?.name || row.owner?.email || '',
      Updated: row.updatedAt || '',
    }))
    const keys = Object.keys(exportRows[0])
    const csv = [keys.join(','), ...exportRows.map((r) => keys.map((k) => `"${String(r[k] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `deals-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported')
  }

  async function handleStageChange(row, nextStage) {
    if (!nextStage || nextStage === row.currentStage) return
    try {
      await patchStage({ id: row.id, currentStage: nextStage }).unwrap()
      toast.success(`Updated to ${formatStageLabel(nextStage)}`)
    } catch (err) {
      toast.error(err?.data?.error?.message || err?.error || 'Could not update')
    }
  }

  useEffect(() => {
    if (!openFilter && !openSort) return undefined
    let attached = false
    function onDocMouseDown(e) {
      if (e.target.closest?.('[data-deals-dropdown]')) return
      setOpenFilter(false)
      setOpenSort(false)
    }
    const t = window.setTimeout(() => {
      document.addEventListener('mousedown', onDocMouseDown)
      attached = true
    }, 0)
    return () => {
      window.clearTimeout(t)
      if (attached) document.removeEventListener('mousedown', onDocMouseDown)
    }
  }, [openFilter, openSort])

  return (
    <PageShell fullWidth flush mainClassName="bg-white">
      <div className="flex h-[calc(100dvh-65px)] min-h-0 flex-col">
        <div className="shrink-0 border-b border-neutral-200 bg-white px-5 py-3 sm:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
              <div className="inline-flex items-center rounded-md border border-neutral-300 bg-neutral-100 p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setMode('pipeline')}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-[5px] px-3 text-sm font-semibold transition',
                    mode === 'pipeline'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-neutral-600 hover:bg-white hover:text-neutral-900',
                  )}
                  aria-pressed={mode === 'pipeline'}
                >
                  <Kanban className="h-4 w-4" />
                  Kanban view
                </button>
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-[5px] px-3 text-sm font-semibold transition',
                    mode === 'list'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-neutral-600 hover:bg-white hover:text-neutral-900',
                  )}
                  aria-pressed={mode === 'list'}
                >
                  <List className="h-4 w-4" />
                  List
                </button>
              </div>
              <span className="hidden h-4 w-px bg-neutral-200 lg:block" />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500">
                <span>
                  Projected Deals: <span className="font-semibold text-neutral-800">{total.toLocaleString()}</span>
                </span>
                <span>
                  Projected Revenue:{' '}
                  <span className="font-semibold text-neutral-800">
                    {formatAggregatedDealAmount(rows, revenueSum)}
                  </span>
                </span>
                {isFetching ? <span className="text-xs text-neutral-400">Updating…</span> : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1 lg:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  className="h-9 w-full rounded-md border border-neutral-300 bg-white pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="Search deals..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Search deals"
                />
              </div>
              <div className="relative" data-deals-dropdown>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenSort(false)
                    setOpenFilter((v) => !v)
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  <Filter className="h-4 w-4 text-neutral-500" />
                  Filter
                  {selectedStages.length > 0 ? (
                    <span className="rounded-full bg-orange-500/20 px-1.5 text-xs font-semibold text-orange-800">{selectedStages.length}</span>
                  ) : null}
                </button>
                {openFilter ? (
                  <div
                    className="absolute right-0 z-30 mt-1 w-64 rounded-md border border-neutral-200 bg-white p-2 shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    role="presentation"
                  >
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span className="text-xs font-semibold text-neutral-500">Stage</span>
                      <button type="button" className="text-xs font-medium text-orange-600 hover:underline" onClick={() => setSelectedStages([])}>
                        Clear
                      </button>
                    </div>
                    <div className="max-h-56 space-y-0.5 overflow-y-auto">
                      {stageFilterOptions.map((s) => {
                        const checked = selectedStages.includes(s)
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => toggleStage(s)}
                            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-neutral-50"
                          >
                            <span className="truncate text-neutral-800">{formatStageLabel(s)}</span>
                            <span
                              className={cn(
                                'ml-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                                checked ? 'border-orange-500 bg-orange-500 text-white' : 'border-neutral-300',
                              )}
                            >
                              {checked ? <Check className="h-3 w-3" /> : null}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="relative" data-deals-dropdown>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenFilter(false)
                    setOpenSort((v) => !v)
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  <ArrowDownUp className="h-4 w-4 text-neutral-500" />
                  Sort
                  <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
                </button>
                {openSort ? (
                  <div
                    className="absolute right-0 z-30 mt-1 w-56 rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    role="presentation"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => {
                          setSortValue(o.value)
                          setOpenSort(false)
                        }}
                        className={cn(
                          'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50',
                          sortValue === o.value && 'bg-neutral-50 font-semibold',
                        )}
                      >
                        {o.label}
                        {sortValue === o.value ? <Check className="h-4 w-4 text-orange-600" /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={exportVisibleRows}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3.5 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50"
              >
                <Download className="h-4 w-4 text-neutral-600" />
                Export
              </button>
              <button
                type="button"
                disabled={mode !== 'list'}
                onClick={() => setGroupByOpportunity((v) => !v)}
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-md border px-3.5 text-sm font-medium shadow-sm',
                  mode === 'list'
                    ? groupByOpportunity
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                      : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50'
                    : 'cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400',
                )}
              >
                Group by opportunity
              </button>
              <button
                type="button"
                onClick={() => setOpenAddDealDrawer(true)}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-orange-500 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
              >
                <Plus className="h-4 w-4" />
                Add deal
              </button>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col bg-white px-5 sm:px-8">
          {mode === 'pipeline' ? (
            <div className="flex min-h-0 flex-1 flex-col py-4">
              <DealsPipelineKanban
                opportunities={rows}
                opportunityStages={opportunityStages}
                isLoading={isLoading}
                dealStageName={dealStageName}
                onOpenDeal={(dealId) => setEditingOpp(rows.find((r) => r.id === dealId) ?? { id: dealId })}
                onEditOpportunity={(o) => setEditingOpp(o)}
              />
            </div>
          ) : (
            <div className="my-5 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3">
                <p className="text-sm text-neutral-600">
                  <span className="font-semibold text-neutral-900">{total.toLocaleString()}</span> deals
                </p>
                <div className="flex items-center gap-2">
                  <select
                    className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-xs font-medium"
                    value={String(limit)}
                    onChange={(e) => setLimit(Number(e.target.value))}
                  >
                    {[10, 25, 50].map((n) => (
                      <option key={n} value={n}>
                        {n} / page
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[1020px] w-full border-collapse text-left">
                  <thead className="border-b border-neutral-100 bg-neutral-50/80 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-4 py-3">Opportunity</th>
                      <th className="px-4 py-3">Deal</th>
                      <th className="px-4 py-3">Stage</th>
                      <th className="px-4 py-3">Value</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Owner</th>
                      <th className="px-4 py-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-500">
                          Loading…
                        </td>
                      </tr>
                    ) : rows.length ? (
                      groupByOpportunity && groupedForList ? (
                        <>
                          {[...groupedForList.byParent.entries()].map(([parentId, list]) => (
                            <Fragment key={parentId}>
                              <tr className="bg-emerald-50/60">
                                <td colSpan={7} className="px-4 py-2 text-xs font-bold text-emerald-900">
                                  Opportunity: <ParentOpportunityLabel id={parentId} />
                                </td>
                              </tr>
                              {list.map((row) => (
                                <DealsTableRow
                                  key={row.id}
                                  row={row}
                                  opportunityStages={opportunityStages}
                                  updatingStage={updatingStage}
                                  onStageChange={handleStageChange}
                                  onOpenSidebar={(dealId) => setEditingOpp(rows.find((r) => r.id === dealId) ?? { id: dealId })}
                                  onOpenPage={(dealId) => navigate(`/deals/${dealId}`)}
                                />
                              ))}
                            </Fragment>
                          ))}
                          {groupedForList.direct.length ? (
                            <Fragment key="direct-deals">
                              <tr className="bg-neutral-100">
                                <td colSpan={7} className="px-4 py-2 text-xs font-bold text-neutral-700">
                                  Direct deals (no opportunity)
                                </td>
                              </tr>
                              {groupedForList.direct.map((row) => (
                                <DealsTableRow
                                  key={row.id}
                                  row={row}
                                  opportunityStages={opportunityStages}
                                  updatingStage={updatingStage}
                                  onStageChange={handleStageChange}
                                  onOpenSidebar={(dealId) => setEditingOpp(rows.find((r) => r.id === dealId) ?? { id: dealId })}
                                  onOpenPage={(dealId) => navigate(`/deals/${dealId}`)}
                                />
                              ))}
                            </Fragment>
                          ) : null}
                        </>
                      ) : (
                        rows.map((row) => (
                          <DealsTableRow
                            key={row.id}
                            row={row}
                            opportunityStages={opportunityStages}
                            updatingStage={updatingStage}
                            onStageChange={handleStageChange}
                            onOpenSidebar={(dealId) => setEditingOpp(rows.find((r) => r.id === dealId) ?? { id: dealId })}
                            onOpenPage={(dealId) => navigate(`/deals/${dealId}`)}
                          />
                        ))
                      )
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-14 text-center text-sm text-neutral-500">
                          <Filter className="mx-auto mb-2 h-8 w-8 opacity-25" />
                          No deals match your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2.5 text-xs text-neutral-500">
                <span>
                  Page {page} / {totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    className="rounded border border-neutral-200 px-2 py-1 hover:bg-neutral-50 disabled:opacity-40"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    className="rounded border border-neutral-200 px-2 py-1 hover:bg-neutral-50 disabled:opacity-40"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AddDealDrawer
        open={openAddDealDrawer}
        onClose={() => setOpenAddDealDrawer(false)}
        users={users}
        fixedOpportunityLeadId={null}
        onCreated={() => {
          refetch()
        }}
      />

      <DealDetailPanel
        open={Boolean(editingOpp)}
        onClose={() => setEditingOpp(null)}
        opp={editingOpp}
        opportunityStages={opportunityStages}
      />
    </PageShell>
  )
}
