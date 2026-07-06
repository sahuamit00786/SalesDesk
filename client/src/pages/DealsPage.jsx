import { useEffect, useMemo, useRef, useState } from 'react'
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
import { TablePaginationBar } from '@/components/ui/TablePaginationBar'
import { inputFieldClassName } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { DataGrid } from '@/components/shared/DataGrid'
import { formatAggregatedDealAmount, formatDealMoney } from '@/features/deals/dealCurrencies'

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
  const opportunityStatuses = useMemo(
    () => [...(formMetaData?.data?.opportunityStatuses || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [formMetaData?.data?.opportunityStatuses],
  )
  const dealStatuses = useMemo(
    () => [...(formMetaData?.data?.dealStatuses || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [formMetaData?.data?.dealStatuses],
  )

  const stageFilterOptions = useMemo(() => {
    if (dealStatuses.length) return dealStatuses.map((s) => s.name).filter(Boolean)
    return opportunityStatuses.map((s) => s.name).filter(Boolean)
  }, [dealStatuses, opportunityStatuses])

  const dealStageName = useMemo(
    () => dealStatuses.find((s) => s.isDealCompleteStatus)?.name || '',
    [dealStatuses],
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

  const dealsGridRows = useMemo(() => {
    if (!groupByOpportunity || !groupedForList) return rows
    const out = []
    for (const [parentId, list] of groupedForList.byParent.entries()) {
      out.push({ id: `__group__op-${parentId}`, _isGroupHeader: true, _groupParentId: parentId })
      out.push(...list)
    }
    if (groupedForList.direct.length) {
      out.push({
        id: '__group__direct',
        _isGroupHeader: true,
        _groupLabel: 'Direct deals (no opportunity)',
      })
      out.push(...groupedForList.direct)
    }
    return out
  }, [rows, groupByOpportunity, groupedForList])

  const displayDealsRows = groupByOpportunity && groupedForList ? dealsGridRows : rows

  const dealsColumns = useMemo(
    () => [
      {
        field: 'opportunity',
        headerName: 'Opportunity',
        flex: 1,
        minWidth: 140,
        sortable: false,
        renderCell: ({ row }) => {
          if (row._isGroupHeader) {
            return (
              <span
                className={cn(
                  'text-xs font-bold',
                  row._groupParentId ? 'text-emerald-900' : 'text-ink',
                )}
              >
                {row._groupParentId ? (
                  <>
                    Opportunity: <ParentOpportunityLabel id={row._groupParentId} />
                  </>
                ) : (
                  row._groupLabel
                )}
              </span>
            )
          }
          return row.parentOpportunityLeadId ? (
            <ParentOpportunityLabel id={row.parentOpportunityLeadId} />
          ) : (
            <span className="text-xs text-ink-muted">—</span>
          )
        },
      },
      {
        field: 'deal',
        headerName: 'Deal',
        flex: 1,
        minWidth: 160,
        sortable: false,
        renderCell: ({ row }) => {
          if (row._isGroupHeader) return null
          return (
            <div className="flex items-start gap-2">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => setEditingOpp(rows.find((r) => r.id === row.id) ?? { id: row.id })}
              >
                <span className="text-sm font-bold text-ink hover:text-brand-600">
                  {row.dealName || row.companyName}
                </span>
                <span className="mt-0.5 block truncate text-xs text-ink-muted">{row.companyName}</span>
              </button>
              <button
                type="button"
                title="Open full page"
                className="shrink-0 rounded p-1 text-ink-muted hover:bg-surface-subtle hover:text-ink"
                onClick={() => navigate(`/deals/${row.id}`)}
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          )
        },
      },
      {
        field: 'currentStage',
        headerName: 'Stage',
        width: 200,
        sortable: false,
        renderCell: ({ row }) => {
          if (row._isGroupHeader) return null
          return (
            <div className="relative max-w-[200px]" onClick={(e) => e.stopPropagation()}>
              <Select
                className="h-8 w-full appearance-none pr-8 text-xs font-semibold"
                value={row.currentStage || ''}
                disabled={updatingStage}
                onChange={(e) => handleStageChange(row, e.target.value)}
                aria-label="Stage"
              >
                {!row.currentStage ? <option value="">Select stage</option> : null}
                {stageFilterOptions.length === 0 && row.currentStage ? (
                  <option value={row.currentStage}>{row.currentStage}</option>
                ) : null}
                {row.currentStage &&
                stageFilterOptions.length > 0 &&
                !stageFilterOptions.includes(row.currentStage) ? (
                  <option value={row.currentStage}>{row.currentStage}</option>
                ) : null}
                {stageFilterOptions.map((name) => (
                  <option key={`${row.id}-${name}`} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            </div>
          )
        },
      },
      {
        field: 'dealValue',
        headerName: 'Value',
        width: 110,
        renderCell: ({ row }) =>
          row._isGroupHeader ? null : (
            <span className="text-sm font-bold text-ink">
              {formatDealMoney(row.dealValue, row.dealCurrency)}
            </span>
          ),
      },
      {
        field: 'fullName',
        headerName: 'Contact',
        width: 120,
        renderCell: ({ row }) =>
          row._isGroupHeader ? null : <span className="text-xs text-ink-muted">{row.fullName}</span>,
      },
      {
        field: 'owner',
        headerName: 'Owner',
        flex: 1,
        minWidth: 130,
        sortable: false,
        renderCell: ({ row }) => {
          if (row._isGroupHeader) return null
          return (
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-brand-800">
                {initials(row.owner?.name || row.owner?.email)}
              </span>
              <span className="text-xs font-medium text-ink">
                {row.owner?.name || row.owner?.email || '—'}
              </span>
            </div>
          )
        },
      },
      {
        field: 'updatedAt',
        headerName: 'Updated',
        width: 110,
        valueGetter: (_v, row) => (row._isGroupHeader ? '' : shortUpdated(row.updatedAt)),
      },
    ],
    [stageFilterOptions, updatingStage, rows, navigate],
  )

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
    <PageShell fullWidth>
      <div className="flex min-h-[calc(100dvh-4.5rem)] flex-col gap-3 px-2 py-2">
        <div className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-gradient-to-br from-white via-slate-50 to-slate-50 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 border-b border-surface-border/60 pb-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                <div className="inline-flex rounded-xl border border-surface-border bg-white p-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setMode('pipeline')}
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold',
                      mode === 'pipeline' ? 'bg-[var(--brand-primary)] text-white' : 'text-ink-muted hover:bg-surface-subtle',
                    )}
                    aria-pressed={mode === 'pipeline'}
                  >
                    <Kanban className="h-3.5 w-3.5" />
                    Board
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('list')}
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold',
                      mode === 'list' ? 'bg-[var(--brand-primary)] text-white' : 'text-ink-muted hover:bg-surface-subtle',
                    )}
                    aria-pressed={mode === 'list'}
                  >
                    <List className="h-3.5 w-3.5" />
                    List
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                  <span>
                    Deals: <span className="font-semibold text-ink">{total.toLocaleString()}</span>
                  </span>
                  <span>
                    Revenue:{' '}
                    <span className="font-semibold text-ink">{formatAggregatedDealAmount(rows, revenueSum)}</span>
                  </span>
                  {isFetching ? <span className="text-[10px] font-medium">Updating…</span> : null}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative min-w-0 lg:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                className="h-9 w-full rounded-xl border border-surface-border bg-white pl-10 pr-3 text-sm outline-none ring-brand-500/30 focus:border-brand-400 focus:ring-2"
                placeholder="Search deals…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search deals"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative" data-deals-dropdown>
                <button
                  type="button"
                  title="Filter by stage"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenSort(false)
                    setOpenFilter((v) => !v)
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-surface-border bg-white px-2.5 text-xs font-semibold text-ink shadow-sm hover:bg-surface-subtle"
                >
                  <Filter className="h-4 w-4 text-ink-muted" />
                  {selectedStages.length > 0 ? (
                    <span className="rounded-full bg-[var(--brand-primary)]/20 px-1.5 text-xs font-semibold text-brand-800">{selectedStages.length}</span>
                  ) : null}
                </button>
                {openFilter ? (
                  <div
                    className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-surface-border bg-white p-2 shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    role="presentation"
                  >
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span className="text-xs font-semibold text-neutral-500">Stage</span>
                      <button type="button" className="text-xs font-medium text-brand-700 hover:underline" onClick={() => setSelectedStages([])}>
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
                                checked ? 'border-brand-600 bg-[var(--brand-primary)] text-white' : 'border-neutral-300',
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
                  title="Sort"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenFilter(false)
                    setOpenSort((v) => !v)
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-surface-border bg-white px-2.5 text-xs font-semibold text-ink shadow-sm hover:bg-surface-subtle"
                >
                  <ArrowDownUp className="h-4 w-4 text-ink-muted" />
                </button>
                {openSort ? (
                  <div
                    className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-surface-border bg-white py-1 shadow-lg"
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
                        {sortValue === o.value ? <Check className="h-4 w-4 text-brand-700" /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                title="Export CSV"
                onClick={exportVisibleRows}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-surface-border bg-white px-2.5 text-xs font-semibold text-ink shadow-sm hover:bg-surface-subtle"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={mode !== 'list'}
                onClick={() => setGroupByOpportunity((v) => !v)}
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold shadow-sm',
                  mode === 'list'
                    ? groupByOpportunity
                      ? 'border-brand-300 bg-brand-50 text-brand-900 hover:bg-brand-100'
                      : 'border-surface-border bg-white text-ink hover:bg-surface-subtle'
                    : 'cursor-not-allowed border-surface-border bg-surface-subtle text-ink-faint',
                )}
              >
                Group by opportunity
              </button>
              <button
                type="button"
                onClick={() => setOpenAddDealDrawer(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--brand-primary)] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[var(--brand-primary-dark)]"
              >
                <Plus className="h-3.5 w-3.5" />
                New deal
              </button>
            </div>
          </div>
        </div>

        <section
          className={cn(
            'rounded-xl border border-surface-border bg-white shadow-sm',
            mode === 'pipeline' ? 'h-[160vh] overflow-hidden' : 'overflow-visible',
          )}
        >
          {mode === 'pipeline' ? (
            <div className="flex h-full min-h-0 flex-col p-3 sm:p-4">
              <DealsPipelineKanban
                opportunities={rows}
                opportunityStatuses={dealStatuses.length ? dealStatuses : opportunityStatuses}
                isLoading={isLoading}
                dealStageName={dealStageName}
                onOpenDeal={(dealId) => setEditingOpp(rows.find((r) => r.id === dealId) ?? { id: dealId })}
                onEditOpportunity={(o) => setEditingOpp(o)}
              />
            </div>
          ) : (
            <>
              <div className="flex items-center border-b border-surface-border px-3 py-2">
                <p className="text-xs font-semibold text-ink-muted">
                  <span className="text-ink">{total.toLocaleString()}</span> deals
                </p>
              </div>
              <DataGrid
                gridColumns
                columns={dealsColumns}
                data={displayDealsRows}
                loading={isLoading || isFetching}
                searchable={false}
                showColumnToggle={false}
                showExportCsv={false}
                hideFooter
                getRowClassName={(params) => {
                  if (!params.row._isGroupHeader) return ''
                  return params.row._groupParentId ? '!bg-brand-50/80' : '!bg-surface-subtle'
                }}
                isRowSelectable={(params) => !params.row._isGroupHeader}
                defaultPageSize={limit}
                emptyTitle="No deals match your filters"
                className="rounded-none border-0 shadow-none"
              />
              <div className="cx-data-grid-footer px-3 py-1.5 sm:px-4">
                <TablePaginationBar
                  compact
                  variant="brand"
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  subLabel={
                    <>
                      Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of{' '}
                      {total.toLocaleString()}
                    </>
                  }
                  beforeNav={
                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
                      <span className="hidden sm:inline">Rows per page</span>
                      <select
                        className={cn(inputFieldClassName, 'h-[1.6875rem] w-[4rem] rounded-md px-1.5 text-[11px]')}
                        value={String(limit)}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        aria-label="Rows per page"
                      >
                        {[10, 25, 50].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                  }
                />
              </div>
            </>
          )}
        </section>
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
        opportunityStatuses={dealStatuses.length ? dealStatuses : opportunityStatuses}
      />
    </PageShell>
  )
}
