import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  Download,
  LayoutGrid,
  List,
  Check,
  Search,
  X,
  Plus,
  Activity,
  BriefcaseBusiness,
  Sparkles,
  TrendingUp,
  UserMinus,
} from '@/components/ui/icons'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { OpportunitiesKanban, formatStageLabel } from '@/features/opportunities/components/OpportunitiesKanban'
import { usePatchPipelineStatusMutation } from '@/features/opportunities/opportunitiesApi'
import { AddDealDrawer } from '@/features/deals/components/AddDealDrawer'
import { useGetLeadFormMetaQuery, useGetLeadsQuery } from '@/features/leads/leadsApi'
import { cn } from '@/utils/cn'
import { TablePaginationBar } from '@/components/ui/TablePaginationBar'
import { Select } from '@/components/ui/Select'
import { DataGrid } from '@/components/shared/DataGrid'
import { formatDealMoney } from '@/features/deals/dealCurrencies'
import { MixedMoneyValue } from '@/components/shared/MixedMoneyValue'
import { usePermission } from '@/hooks/usePermission'

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

function formatRelativeDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Map GET /leads rows (isOpportunity) to the pipeline card shape. */
function pipelineRowFromLead(lead) {
  const phoneNumber = [lead.phoneCountryCode, lead.phone].filter(Boolean).join(' ').trim() || null
  const assignee = lead.assignee
  return {
    id: lead.id,
    companyId: lead.companyId,
    workspaceId: lead.workspaceId,
    leadId: lead.id,
    ownerUserId: lead.assignedTo || lead.ownerUserId,
    fullName: (lead.contactName || '').trim() || 'Lead',
    dealName: (lead.title || '').trim() || null,
    email: lead.email || null,
    phoneNumber,
    jobTitle: lead.designation || null,
    companyName: (lead.company || '').trim() || 'Unknown company',
    dealValue: lead.value,
    dealCurrency: lead.valueCurrency || lead.value_currency || 'USD',
    currentStage: lead.pipelineStatusInfo?.name || '',
    leadScore: lead.score,
    tags: (lead.tags || []).map((t) => String(t.name || t).trim().toLowerCase()).filter(Boolean),
    lastActivityType: null,
    lastActivityText: null,
    lastActivityAt: lead.updatedAt || null,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    owner: assignee ? { id: assignee.id, name: assignee.name, email: assignee.email || null } : null,
  }
}

const PIPELINE_SORT_MAP = {
  updatedAt: 'updatedAt',
  dealValue: 'value',
  fullName: 'contactName',
  companyName: 'company',
  leadScore: 'score',
  createdAt: 'createdAt',
}

export function PipelinePage() {
  const navigate = useNavigate()

  const [mode, setMode] = useState('kanban')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedStages, setSelectedStages] = useState([])
  const [selectedAssignees, setSelectedAssignees] = useState([])
  const [openStageDropdown, setOpenStageDropdown] = useState(false)
  const [openAssigneeDropdown, setOpenAssigneeDropdown] = useState(false)
  const [sortValue, setSortValue] = useState('updatedAt:desc')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const { sort, order } = parseSort(sortValue)

  const listQuery = useMemo(() => {
    const apiSort = PIPELINE_SORT_MAP[sort] || 'updatedAt'
    const q = {
      page,
      limit: mode === 'kanban' ? Math.min(400, Math.max(limit, 100)) : limit,
      search: debouncedSearch || undefined,
      isOpportunity: true,
      stage: selectedStages.length ? selectedStages.join(',') : undefined,
      assignedTo: selectedAssignees.length ? selectedAssignees.join(',') : undefined,
      sort: apiSort,
      order,
    }
    return Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== ''))
  }, [page, limit, mode, debouncedSearch, selectedStages, selectedAssignees, sort, order])

  const canViewLeads = usePermission('main.leads', 'view')
  const canUpdateOpportunities = usePermission('main.opportunities', 'update')
  const canCreateDeals = usePermission('main.deals', 'create')

  const { data, isLoading, isFetching } = useGetLeadsQuery(listQuery, { skip: !canViewLeads })
  const { data: formMetaData } = useGetLeadFormMetaQuery()
  const [patchPipelineStatus, { isLoading: updatingStage }] = usePatchPipelineStatusMutation()
  const [addDealRow, setAddDealRow] = useState(null)

  const rows = useMemo(() => (data?.data || []).map(pipelineRowFromLead), [data?.data])
  const total = data?.meta?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / (mode === 'kanban' ? listQuery.limit : limit)))
  const users = formMetaData?.data?.users || []
  const pipelineStatuses = formMetaData?.data?.pipelineStatuses || []

  const stageFilterOptions = useMemo(
    () => pipelineStatuses.map((s) => s.name).filter(Boolean),
    [pipelineStatuses],
  )

  useEffect(() => {
    const allowed = new Set(stageFilterOptions)
    setSelectedStages((prev) => prev.filter((x) => allowed.has(x)))
  }, [stageFilterOptions])

  useEffect(() => {
    const allowedUsers = new Set(users.map((u) => u.id))
    setSelectedAssignees((prev) => prev.filter((x) => allowedUsers.has(x)))
  }, [users])

  useEffect(() => {
    setPage(1)
  }, [mode, debouncedSearch, selectedStages, selectedAssignees, sortValue, limit])

  const highScoreCount = useMemo(() => rows.filter((r) => Number(r.leadScore || 0) >= 80).length, [rows])
  const unassignedCount = useMemo(() => rows.filter((r) => !r.owner?.id).length, [rows])
  const staleCount = useMemo(() => {
    const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 14
    return rows.filter((r) => !r.lastActivityAt || new Date(r.lastActivityAt).getTime() < cutoff).length
  }, [rows])
  const stageBreakdown = useMemo(() => {
    const counts = rows.reduce((acc, row) => {
      const key = row.currentStage || 'Unstaged'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [rows])

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (debouncedSearch) n += 1
    if (selectedStages.length) n += 1
    if (selectedAssignees.length) n += 1
    if (sortValue !== 'updatedAt:desc') n += 1
    return n
  }, [debouncedSearch, selectedStages, selectedAssignees, sortValue])

  function resetFilters() {
    setSelectedStages([])
    setSelectedAssignees([])
    setSearchInput('')
    setDebouncedSearch('')
    setSortValue('updatedAt:desc')
    setPage(1)
  }

  function toggleStage(name) {
    setSelectedStages((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]))
    setPage(1)
  }

  function toggleAssignee(id) {
    setSelectedAssignees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    setPage(1)
  }

  const exportVisibleRows = () => {
    if (!rows.length) {
      toast.error('Nothing to export on this page')
      return
    }
    const exportRows = rows.map((row) => ({
      DealName: row.dealName || '',
      Name: row.fullName || '',
      Company: row.companyName || '',
      JobTitle: row.jobTitle || '',
      Email: row.email || '',
      Phone: row.phoneNumber || '',
      Status: row.currentStage || '',
      DealValue: row.dealValue ?? 0,
      Currency: row.dealCurrency || 'USD',
      LeadScore: row.leadScore ?? 0,
      Owner: row.owner?.name || row.owner?.email || '',
      LastActivityType: row.lastActivityType || '',
      LastActivityAt: row.lastActivityAt ? new Date(row.lastActivityAt).toISOString() : '',
    }))
    const keys = Object.keys(exportRows[0])
    const csv = [keys.join(','), ...exportRows.map((r) => keys.map((k) => `"${String(r[k] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pipeline-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported current page')
  }

  function addOpportunityToDealsPipeline(row) {
    setAddDealRow(row)
  }

  function handleCreateDeal(row, event) {
    event.stopPropagation()
    addOpportunityToDealsPipeline(row)
  }

  async function handleStageChange(row, nextStageName) {
    if (!nextStageName || nextStageName === row.currentStage) return
    const status = pipelineStatuses.find((s) => s.name === nextStageName)
    if (!status) return
    try {
      await patchPipelineStatus({ id: row.id, pipelineStatusId: status.id }).unwrap()
      toast.success(`Status updated to ${formatStageLabel(nextStageName)}`)
    } catch (err) {
      toast.error(err?.data?.error?.message || err?.error || 'Could not update status')
    }
  }

  const displayLimit = mode === 'kanban' ? listQuery.limit : limit

  const pipelineColumns = useMemo(
    () => [
      {
        field: 'opportunity',
        headerName: 'Opportunity',
        flex: 1,
        minWidth: 150,
        renderCell: ({ row }) => (
          <div>
            <p className="text-sm font-semibold text-ink">{(row.dealName || '').trim() || row.fullName}</p>
            <p className="text-[11px] text-ink-muted">
              {(row.dealName || '').trim() ? row.companyName || '—' : row.location || '—'}
            </p>
          </div>
        ),
      },
      {
        field: 'contact',
        headerName: 'Contact',
        flex: 1,
        minWidth: 130,
        renderCell: ({ row }) => (
          <div>
            <p className="text-xs text-ink">{row.email || '—'}</p>
            <p className="text-[11px] text-ink-muted">{row.phoneNumber || row.directPhone || '—'}</p>
          </div>
        ),
      },
      {
        field: 'currentStage',
        headerName: 'Status',
        width: 200,
        sortable: false,
        renderCell: ({ row }) => (
          <div className="relative max-w-[190px]" onClick={(e) => e.stopPropagation()}>
            <Select
              className="h-8 w-full appearance-none pr-7 text-[11px] font-semibold"
              value={row.currentStage || ''}
              disabled={updatingStage || !canUpdateOpportunities}
              onChange={(event) => handleStageChange(row, event.target.value)}
              aria-label={`Pipeline status for ${row.fullName || 'opportunity'}`}
            >
              {!row.currentStage ? <option value="">Select status</option> : null}
              {pipelineStatuses
                .filter((s) => s?.name)
                .map((s) => (
                  <option key={`${row.id}-${s.name}`} value={s.name}>
                    {formatStageLabel(s.name)}
                  </option>
                ))}
            </Select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
          </div>
        ),
      },
      {
        field: 'dealValue',
        headerName: 'Value',
        width: 100,
        renderCell: ({ row }) => (
          <span className="text-sm font-semibold text-ink">
            {formatDealMoney(row.dealValue, row.dealCurrency)}
          </span>
        ),
      },
      {
        field: 'owner',
        headerName: 'Owner',
        flex: 1,
        minWidth: 130,
        renderCell: ({ row }) => (
          <div className="inline-flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-brand-800">
              {initials(row.owner?.name || row.owner?.email)}
            </span>
            <span className="text-xs font-medium text-ink">{row.owner?.name || row.owner?.email || 'Unassigned'}</span>
          </div>
        ),
      },
      {
        field: 'actions',
        headerName: 'Action',
        width: 180,
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }) => (
          <div className="inline-flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => navigate(`/opportunities/${row.id}`)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-surface-border bg-white px-2.5 text-[11px] font-semibold text-ink hover:bg-surface-subtle"
            >
              Open
            </button>
            {canCreateDeals ? (
              <button
                type="button"
                onClick={(event) => handleCreateDeal(row, event)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100/90"
              >
                <Plus className="h-3.5 w-3.5" />
                Add deal
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [pipelineStatuses, updatingStage, navigate, canUpdateOpportunities, canCreateDeals, handleStageChange, handleCreateDeal],
  )

  const onPipelineRowClick = useCallback(
    (params) => {
      if (!params.row?._isGroupHeader) navigate(`/opportunities/${params.row.id}`)
    },
    [navigate],
  )

  return (
    <PageShell fullWidth>
      <div className="flex min-h-[calc(100dvh-4.5rem)] flex-col gap-3 px-2 py-2">
        <div className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-gradient-to-br from-white via-slate-50 to-slate-50 px-4 py-4 sm:px-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-sm">
              <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                <Activity className="h-3 w-3" />
                Total (filtered)
              </p>
              <p className="text-lg font-bold text-ink">{total.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-sm">
              <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                <TrendingUp className="h-3 w-3" />
                Value (this page)
              </p>
              <p className="text-lg font-bold text-ink">
                <MixedMoneyValue rows={rows} mode="sum" className="text-lg font-bold text-ink" />
              </p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-sm">
              <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                <BriefcaseBusiness className="h-3 w-3" />
                Avg value
              </p>
              <p className="text-lg font-bold text-ink">
                <MixedMoneyValue rows={rows} mode="avg" className="text-lg font-bold text-ink" />
              </p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-sm">
              <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                <Sparkles className="h-3 w-3" />
                High score (80+)
              </p>
              <p className="text-lg font-bold text-ink">{highScoreCount.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-sm">
              <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                <UserMinus className="h-3 w-3" />
                Need attention
              </p>
              <p className="text-lg font-bold text-ink">{(unassignedCount + staleCount).toLocaleString()}</p>
              <p className="text-[10px] text-ink-muted">
                {unassignedCount} unassigned, {staleCount} stale
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-surface-border/60 pt-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[18rem] flex-1 sm:flex-1 sm:max-w-[28rem]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                  <input
                    className="h-9 w-full rounded-xl border border-surface-border bg-white pl-10 pr-3 text-sm outline-none ring-brand-500/30 focus:border-brand-400 focus:ring-2"
                    placeholder="Search name, company, email, job title, phone…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    aria-label="Search pipeline"
                  />
                  {isFetching ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-ink-muted">Updating…</span>
                  ) : null}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenStageDropdown((v) => !v)
                      setOpenAssigneeDropdown(false)
                    }}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-surface-border bg-white px-3 text-xs font-semibold text-ink shadow-sm"
                  >
                    Status
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-brand-700">
                      {selectedStages.length || 'All'}
                    </span>
                  </button>
                  {openStageDropdown ? (
                    <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-surface-border bg-white p-2 shadow-lg">
                      <div className="mb-1 flex items-center justify-between px-1">
                        <p className="text-[11px] font-semibold text-ink-muted">Select statuses</p>
                        <button
                          type="button"
                          className="text-[11px] text-brand-700"
                          onClick={() => {
                            setSelectedStages([])
                            setPage(1)
                          }}
                        >
                          Clear
                        </button>
                      </div>
                      <div className="max-h-64 space-y-1 overflow-y-auto">
                        {stageFilterOptions.map((s) => {
                          const checked = selectedStages.includes(s)
                          return (
                            <label key={s} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 hover:bg-surface-subtle">
                              <span className="text-xs text-ink">{formatStageLabel(s)}</span>
                              <span className={cn('inline-flex h-4 w-4 items-center justify-center rounded border', checked ? 'border-brand-600 bg-[var(--brand-primary)] cx-icon-inherit text-white' : 'border-surface-border')}>
                                {checked ? <Check className="h-3 w-3" /> : null}
                              </span>
                              <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleStage(s)} />
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenAssigneeDropdown((v) => !v)
                      setOpenStageDropdown(false)
                    }}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-surface-border bg-white px-3 text-xs font-semibold text-ink shadow-sm"
                  >
                    Assigned to
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-brand-700">
                      {selectedAssignees.length || 'All'}
                    </span>
                  </button>
                  {openAssigneeDropdown ? (
                    <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-surface-border bg-white p-2 shadow-lg">
                      <div className="mb-1 flex items-center justify-between px-1">
                        <p className="text-[11px] font-semibold text-ink-muted">Select users</p>
                        <button
                          type="button"
                          className="text-[11px] text-brand-700"
                          onClick={() => {
                            setSelectedAssignees([])
                            setPage(1)
                          }}
                        >
                          Clear
                        </button>
                      </div>
                      <div className="max-h-64 space-y-1 overflow-y-auto">
                        {users.map((u) => {
                          const checked = selectedAssignees.includes(u.id)
                          return (
                            <label key={u.id} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 hover:bg-surface-subtle">
                              <span className="truncate text-xs text-ink">{u.name || u.email || 'User'}</span>
                              <span className={cn('inline-flex h-4 w-4 items-center justify-center rounded border', checked ? 'border-brand-600 bg-[var(--brand-primary)] cx-icon-inherit text-white' : 'border-surface-border')}>
                                {checked ? <Check className="h-3 w-3" /> : null}
                              </span>
                              <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleAssignee(u.id)} />
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                <select
                  id="pipeline-sort"
                  className="h-9 rounded-xl border border-surface-border bg-white px-3 text-xs font-semibold text-ink shadow-sm"
                  value={sortValue}
                  onChange={(e) => setSortValue(e.target.value)}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {mode === 'list' ? (
                  <select
                    className="h-9 rounded-xl border border-surface-border bg-white px-3 text-xs font-semibold text-ink shadow-sm"
                    value={String(limit)}
                    onChange={(e) => setLimit(Number(e.target.value))}
                  >
                    {[10, 25, 50].map((n) => (
                      <option key={n} value={n}>
                        {n} / page
                      </option>
                    ))}
                  </select>
                ) : null}
                {activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex h-9 items-center gap-1 rounded-xl border border-surface-border bg-white px-3 text-xs font-semibold text-ink-muted shadow-sm hover:bg-surface-subtle"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reset
                  </button>
                ) : null}

                <span className="hidden h-6 w-px bg-surface-border lg:block" aria-hidden />

                <div className="inline-flex rounded-xl border border-surface-border bg-white p-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setMode('list')}
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold',
                      mode === 'list' ? 'bg-[var(--brand-primary)] text-white' : 'text-ink-muted hover:bg-surface-subtle',
                    )}
                  >
                    <List className="h-3.5 w-3.5" />
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('kanban')}
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold',
                      mode === 'kanban' ? 'bg-[var(--brand-primary)] cx-icon-inherit text-white' : 'text-ink-muted hover:bg-surface-subtle',
                    )}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Board
                  </button>
                </div>
                {canViewLeads ? (
                  <button
                    type="button"
                    onClick={exportVisibleRows}
                    aria-label="Export"
                    title="Export"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border bg-white text-ink-muted shadow-sm hover:bg-surface-subtle hover:text-ink"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                ) : null}
            </div>
            {activeFilterCount > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-surface-border/80 pt-2 text-[11px]">
                <span className="font-semibold text-ink-muted">Active filters:</span>
                {debouncedSearch ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-brand-700">Search: {debouncedSearch}</span> : null}
                {selectedStages.map((stage) => (
                  <span key={stage} className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                    Status: {formatStageLabel(stage)}
                  </span>
                ))}
                {selectedAssignees.map((id) => {
                  const user = users.find((u) => u.id === id)
                  return (
                    <span key={id} className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                      Owner: {user?.name || user?.email || 'User'}
                    </span>
                  )
                })}
                {sortValue !== 'updatedAt:desc' ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                    Sort: {SORT_OPTIONS.find((o) => o.value === sortValue)?.label || sortValue}
                  </span>
                ) : null}
                {mode === 'kanban' ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                    Board loads up to {listQuery.limit} matches
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <section
          className={cn(
            'rounded-xl border border-surface-border bg-white shadow-sm',
            mode === 'kanban' ? 'h-[160vh] overflow-hidden' : 'overflow-visible',
          )}
        >
          {mode === 'kanban' ? (
            <div className="flex h-full min-h-0 flex-col p-3 sm:p-4">
              <div className="min-h-0 flex-1">
                <OpportunitiesKanban
                  opportunities={rows}
                  pipelineStatuses={pipelineStatuses}
                  isLoading={isLoading}
                  onCreateDeal={(row) => addOpportunityToDealsPipeline(row)}
                />
              </div>
              <p className="mt-3 shrink-0 text-center text-[11px] text-ink-muted">
                Drag cards by the handle to change pipeline status. Showing {rows.length} of {total} matching records.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border px-3 py-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-ink-muted">
                    <span className="text-ink">{total.toLocaleString()}</span> in pipeline
                  </p>
                </div>
              </div>
              <DataGrid
                gridColumns
                columns={pipelineColumns}
                data={rows}
                loading={isLoading || isFetching}
                searchable={false}
                showColumnToggle={false}
                showExportCsv={false}
                hideFooter
                onRowClick={onPipelineRowClick}
                defaultPageSize={limit}
                emptyTitle="No records match your filters"
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
                      Showing {(page - 1) * displayLimit + 1}–{Math.min(page * displayLimit, total)} of{' '}
                      {total.toLocaleString()}
                    </>
                  }
                />
              </div>
            </>
          )}
        </section>
      </div>

      <AddDealDrawer
        open={Boolean(addDealRow)}
        onClose={() => setAddDealRow(null)}
        users={users}
        fixedOpportunityLeadId={addDealRow?.leadId || addDealRow?.id || null}
        onCreated={() => navigate('/deals')}
      />

    </PageShell>
  )
}
