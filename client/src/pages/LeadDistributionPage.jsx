import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Phone,
  Search,
  Shuffle,
  Users,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { PageStack } from '@/components/layout/PageStack'
import { PageFilterBar } from '@/components/layout/PageFilterBar'
import { PageContentPanel } from '@/components/layout/PageContentPanel'
import { DataGrid } from '@/components/shared/DataGrid'
import { cn } from '@/utils/cn'
import { STATUS_STYLES } from '@/features/leads/constants'
import { LeadStatusBadge } from '@/features/leads/components/LeadStatusBadge'
import {
  useDistributeLeadsRoundRobinMutation,
  useGetLeadFormMetaQuery,
  useGetLeadsQuery,
  useLazyGetLeadsQuery,
} from '@/features/leads/leadsApi'

const DISTRIBUTE_MAX_LEADS = 500
const SELECT_ALL_PAGE_SIZE = 100

const STATUS_OPTIONS = Object.keys(STATUS_STYLES).map((id) => ({
  id,
  label: id.charAt(0).toUpperCase() + id.slice(1),
}))

function statusLabel(id) {
  return STATUS_OPTIONS.find((o) => o.id === id)?.label ?? id
}

function formatStatusFilterSummary(ids) {
  if (!ids.length || ids.length >= STATUS_OPTIONS.length) return 'All statuses'
  if (ids.length === 1) return statusLabel(ids[0])
  if (ids.length === 2) return `${statusLabel(ids[0])}, ${statusLabel(ids[1])}`
  return `${ids.length} selected`
}

const RECORD_TABS = [
  { id: 'all', label: 'All records' },
  { id: 'leads', label: 'Leads' },
  { id: 'opps', label: 'Opportunities' },
]

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function FilterTab({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition sm:px-3 sm:py-1.5 sm:text-xs',
        active
          ? 'border-brand-300 bg-brand-50 text-brand-900 shadow-sm'
          : 'border-surface-border bg-white text-ink-muted hover:border-brand-200 hover:bg-brand-50/40 hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

export function LeadDistributionPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [recordType, setRecordType] = useState('all')
  const [statusFilter, setStatusFilter] = useState(() => [])
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const statusDropdownRef = useRef(null)
  const [stageFilter, setStageFilter] = useState('')
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false)
  const stageDropdownRef = useRef(null)
  const [selectedLeadIds, setSelectedLeadIds] = useState(() => new Set())
  const [selectingAll, setSelectingAll] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [callerOrder, setCallerOrder] = useState([])
  const { data: formMeta } = useGetLeadFormMetaQuery()
  const users = formMeta?.data?.users || []
  const opportunityStatuses = formMeta?.data?.opportunityStatuses || []

  const listFilterParams = useMemo(() => {
    const p = {
      search: debouncedSearch || undefined,
      unassignedOnly: 'true',
      sort: 'createdAt',
      order: 'asc',
    }
    if (recordType === 'leads') p.isOpportunity = 'false'
    if (recordType === 'opps') p.isOpportunity = 'true'
    if (statusFilter.length > 0) {
      p.status = [...statusFilter].sort().join(',')
    }
    if (recordType !== 'leads' && stageFilter) p.stage = stageFilter
    return p
  }, [debouncedSearch, recordType, statusFilter, stageFilter])

  const listParams = useMemo(
    () => ({ ...listFilterParams, page, limit }),
    [listFilterParams, page, limit],
  )

  const { data, isLoading, isFetching, refetch } = useGetLeadsQuery(listParams)
  const [fetchLeadsPage] = useLazyGetLeadsQuery()
  const [distribute, { isLoading: distributing }] = useDistributeLeadsRoundRobinMutation()

  const rows = data?.data || []
  const total = data?.meta?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const selectionCount = selectedLeadIds.size

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(id)
  }, [search])

  const statusFilterKey = statusFilter.slice().sort().join(',')

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, recordType, statusFilterKey, stageFilter])

  useEffect(() => {
    if (recordType === 'leads') setStageFilter('')
  }, [recordType])

  useEffect(() => {
    if (!statusDropdownOpen) return
    function onDocMouseDown(e) {
      const el = statusDropdownRef.current
      if (el && !el.contains(e.target)) setStatusDropdownOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [statusDropdownOpen])

  useEffect(() => {
    if (!statusDropdownOpen) return
    function onKey(e) {
      if (e.key === 'Escape') setStatusDropdownOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [statusDropdownOpen])

  useEffect(() => {
    if (!stageDropdownOpen) return
    function onDocMouseDown(e) {
      const el = stageDropdownRef.current
      if (el && !el.contains(e.target)) setStageDropdownOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [stageDropdownOpen])

  useEffect(() => {
    if (!stageDropdownOpen) return
    function onKey(e) {
      if (e.key === 'Escape') setStageDropdownOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stageDropdownOpen])

  function toggleStatusOption(id) {
    setStatusFilter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function clearStatusFilter() {
    setStatusFilter([])
  }

  function selectAllStatuses() {
    setStatusFilter(STATUS_OPTIONS.map((o) => o.id))
  }

  useEffect(() => {
    if (!assignModalOpen) return
    setCallerOrder([])
  }, [assignModalOpen])

  useEffect(() => {
    if (!assignModalOpen) return
    function onKey(e) {
      if (e.key === 'Escape') setAssignModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [assignModalOpen])

  function selectAllOnPage() {
    if (!rows.length) return
    setSelectedLeadIds((prev) => {
      const next = new Set(prev)
      rows.forEach((r) => next.add(r.id))
      return next
    })
    toast.success(`Selected ${rows.length} lead${rows.length === 1 ? '' : 's'} on this page`)
  }

  async function selectAllMatching() {
    const cap = Math.min(total, DISTRIBUTE_MAX_LEADS)
    if (!cap) {
      toast.error('No leads match these filters')
      return
    }
    setSelectingAll(true)
    try {
      const ids = new Set()
      const pages = Math.ceil(cap / SELECT_ALL_PAGE_SIZE)
      for (let p = 1; p <= pages; p += 1) {
        const res = await fetchLeadsPage({
          ...listFilterParams,
          page: p,
          limit: SELECT_ALL_PAGE_SIZE,
        }).unwrap()
        for (const row of res?.data || []) {
          ids.add(row.id)
          if (ids.size >= cap) break
        }
        if (ids.size >= cap) break
      }
      setSelectedLeadIds(ids)
      const added = Math.min(ids.size, cap)
      toast.success(
        added === cap && total > cap
          ? `Selected ${added} leads (max ${DISTRIBUTE_MAX_LEADS} per assignment)`
          : `Selected ${added} lead${added === 1 ? '' : 's'}`,
      )
    } catch (e) {
      toast.error(e?.data?.error?.message || e?.error || 'Could not select all leads')
    } finally {
      setSelectingAll(false)
    }
  }

  function clearSelection() {
    setSelectedLeadIds(new Set())
  }

  function toggleCaller(user) {
    const id = user.id
    setCallerOrder((prev) => {
      const i = prev.findIndex((x) => x.id === id)
      if (i >= 0) return prev.filter((x) => x.id !== id)
      return [...prev, { id, name: user.name, email: user.email }]
    })
  }

  function moveCaller(index, dir) {
    setCallerOrder((prev) => {
      const next = [...prev]
      const j = index + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })
  }

  const preview = useMemo(() => {
    const n = selectionCount
    const m = callerOrder.length
    if (!n || !m) return null
    const base = Math.floor(n / m)
    const rem = n % m
    return { base, rem, perCaller: callerOrder.map((_, i) => base + (i < rem ? 1 : 0)) }
  }, [selectionCount, callerOrder])

  async function runDistribute() {
    if (!callerOrder.length) {
      toast.error('Select at least one caller')
      return
    }
    if (!selectionCount) {
      toast.error('Select at least one lead')
      return
    }
    const leadIds = [...selectedLeadIds]
    const userIds = callerOrder.map((c) => c.id)
    try {
      const res = await distribute({ leadIds, userIds }).unwrap()
      const assigned = res?.data?.assigned ?? 0
      const skipped = res?.data?.skipped ?? 0
      toast.success(`Assigned ${assigned} lead${assigned === 1 ? '' : 's'}${skipped ? ` (${skipped} skipped)` : ''}`)
      clearSelection()
      setAssignModalOpen(false)
      setPage(1)
      refetch()
    } catch (e) {
      toast.error(e?.data?.error?.message || e?.error || 'Distribution failed')
    }
  }

  const assignDisabled = selectionCount === 0
  const selectAllCap = Math.min(total, DISTRIBUTE_MAX_LEADS)
  const stageFilterLabel = stageFilter
    ? opportunityStatuses.find((s) => s.id === stageFilter)?.name || stageFilter
    : 'All stages'
  const showStageFilter = recordType !== 'leads' && opportunityStatuses.length > 0

  const leadDistColumns = useMemo(
    () => [
      {
        field: 'title',
        headerName: 'Lead',
        flex: 1,
        minWidth: 160,
        renderCell: ({ row }) => {
          const detailPath = row.isOpportunity ? `/opportunities/${row.id}` : `/leads/${row.id}`
          return (
            <button
              type="button"
              onClick={() => navigate(detailPath)}
              className="block min-w-0 max-w-full truncate text-left font-semibold text-ink hover:text-brand-700"
            >
              {row.title}
            </button>
          )
        },
      },
      {
        field: 'type',
        headerName: 'Type',
        width: 110,
        renderCell: ({ row }) =>
          row.isOpportunity ? (
            <span className="inline-flex rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
              Opportunity
            </span>
          ) : (
            <span className="text-xs text-ink-muted">Lead</span>
          ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: ({ row }) => <LeadStatusBadge status={row.status} />,
      },
      {
        field: 'stage',
        headerName: 'Stage',
        width: 120,
        valueGetter: (_v, row) =>
          row.isOpportunity ? row.oppStatus?.name || '—' : '—',
      },
      {
        field: 'company',
        headerName: 'Company',
        flex: 1,
        minWidth: 120,
        valueGetter: (_v, row) => row.company || '—',
      },
      {
        field: 'email',
        headerName: 'Email',
        width: 160,
        valueGetter: (_v, row) => row.email || '—',
      },
      {
        field: 'createdAt',
        headerName: 'Created',
        width: 110,
        valueGetter: (_v, row) =>
          row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—',
      },
    ],
    [navigate],
  )

  const pageRowSelection = useMemo(
    () => rows.filter((r) => selectedLeadIds.has(r.id)).map((r) => r.id),
    [rows, selectedLeadIds],
  )

  function handleLeadDistSelectionChange(model) {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev)
      const pageIds = rows.map((r) => r.id)
      for (const id of pageIds) next.delete(id)
      for (const id of model) next.add(String(id))
      return next
    })
  }

  return (
    <PageShell fullWidth>
      <PageStack>
        <PageFilterBar className="overflow-x-auto">
          <div className="flex w-full min-w-0 items-center gap-2 sm:gap-3">
            <div className="scrollbar-subtle flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto sm:gap-2">
            <span className="shrink-0 pl-1 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Type</span>
            {RECORD_TABS.map((t) => (
              <FilterTab key={t.id} active={recordType === t.id} onClick={() => setRecordType(t.id)}>
                {t.label}
              </FilterTab>
            ))}
            <span className="mx-0.5 h-5 w-px shrink-0 bg-surface-border" aria-hidden />
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Status</span>
            <div className="relative shrink-0" ref={statusDropdownRef}>
              <button
                type="button"
                id="lead-dist-status-trigger"
                aria-haspopup="listbox"
                aria-expanded={statusDropdownOpen}
                aria-controls="lead-dist-status-listbox"
                onClick={() => setStatusDropdownOpen((o) => !o)}
                className={cn(
                  'inline-flex h-8 max-w-[11rem] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-left text-[11px] font-semibold transition sm:h-9 sm:max-w-[14rem] sm:px-3 sm:text-xs',
                  statusFilter.length > 0
                    ? 'border-brand-300 bg-brand-50 text-brand-900'
                    : 'border-surface-border bg-white text-ink-muted hover:border-brand-200 hover:bg-brand-50/40 hover:text-ink',
                )}
              >
                <span className="min-w-0 flex-1 truncate">{formatStatusFilterSummary(statusFilter)}</span>
                <ChevronDown
                  className={cn('h-3.5 w-3.5 shrink-0 opacity-60 transition', statusDropdownOpen && 'rotate-180')}
                  aria-hidden
                />
              </button>
              {statusDropdownOpen ? (
                <div
                  id="lead-dist-status-listbox"
                  role="listbox"
                  aria-labelledby="lead-dist-status-trigger"
                  aria-multiselectable="true"
                  className="absolute left-0 top-[calc(100%+4px)] z-50 w-[min(calc(100vw-2rem),16rem)] rounded-xl border border-surface-border bg-white py-1 shadow-lg ring-1 ring-black/5"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-surface-border px-2 py-1.5">
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-brand-700 hover:underline"
                      onClick={selectAllStatuses}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-ink-muted hover:text-ink"
                      onClick={clearStatusFilter}
                    >
                      Clear
                    </button>
                  </div>
                  <ul className="max-h-56 overflow-y-auto py-1">
                    {STATUS_OPTIONS.map((opt) => {
                      const checked = statusFilter.includes(opt.id)
                      return (
                        <li key={opt.id} role="option" aria-selected={checked}>
                          <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-surface-subtle">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleStatusOption(opt.id)}
                              className="h-3.5 w-3.5 rounded border-surface-border text-brand-600 focus:ring-brand-500"
                            />
                            <span className="text-ink">{opt.label}</span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
            {showStageFilter ? (
              <>
                <span className="mx-0.5 h-5 w-px shrink-0 bg-surface-border" aria-hidden />
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Stage</span>
                <div className="relative shrink-0" ref={stageDropdownRef}>
                  <button
                    type="button"
                    id="lead-dist-stage-trigger"
                    aria-haspopup="listbox"
                    aria-expanded={stageDropdownOpen}
                    aria-controls="lead-dist-stage-listbox"
                    onClick={() => setStageDropdownOpen((o) => !o)}
                    className={cn(
                      'inline-flex h-8 max-w-[11rem] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-left text-[11px] font-semibold transition sm:h-9 sm:max-w-[14rem] sm:px-3 sm:text-xs',
                      stageFilter
                        ? 'border-brand-300 bg-brand-50 text-brand-900'
                        : 'border-surface-border bg-white text-ink-muted hover:border-brand-200 hover:bg-brand-50/40 hover:text-ink',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{stageFilterLabel}</span>
                    <ChevronDown
                      className={cn('h-3.5 w-3.5 shrink-0 opacity-60 transition', stageDropdownOpen && 'rotate-180')}
                      aria-hidden
                    />
                  </button>
                  {stageDropdownOpen ? (
                    <div
                      id="lead-dist-stage-listbox"
                      role="listbox"
                      aria-labelledby="lead-dist-stage-trigger"
                      className="absolute left-0 top-[calc(100%+4px)] z-50 w-[min(calc(100vw-2rem),16rem)] rounded-xl border border-surface-border bg-white py-1 shadow-lg ring-1 ring-black/5"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <ul className="max-h-56 overflow-y-auto py-1">
                        <li role="option" aria-selected={!stageFilter}>
                          <button
                            type="button"
                            className={cn(
                              'flex w-full px-3 py-2 text-left text-sm hover:bg-surface-subtle',
                              !stageFilter && 'bg-brand-50/60 font-semibold text-brand-900',
                            )}
                            onClick={() => {
                              setStageFilter('')
                              setStageDropdownOpen(false)
                            }}
                          >
                            All stages
                          </button>
                        </li>
                        {opportunityStatuses.map((s) => {
                          const active = stageFilter === s.id
                          return (
                            <li key={s.id} role="option" aria-selected={active}>
                              <button
                                type="button"
                                className={cn(
                                  'flex w-full px-3 py-2 text-left text-sm hover:bg-surface-subtle',
                                  active && 'bg-brand-50/60 font-semibold text-brand-900',
                                )}
                                onClick={() => {
                                  setStageFilter(s.id)
                                  setStageDropdownOpen(false)
                                }}
                              >
                                {s.name || s.id}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
            <span className="mx-0.5 h-5 w-px shrink-0 bg-surface-border" aria-hidden />
            <p className="shrink-0 whitespace-nowrap pl-0.5 text-[11px] text-ink-muted sm:text-xs">
              <span className="font-semibold text-ink">{isLoading ? '—' : total}</span> unassigned
              {isFetching && !isLoading ? <span className="ml-1.5 text-brand-600">…</span> : null}
            </p>
            </div>
            <div className="relative w-[min(100%,12rem)] shrink-0 sm:min-w-[14rem] sm:w-56 lg:min-w-[18rem] lg:w-72 xl:w-80">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted sm:left-2.5" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, company, email…"
                className="h-8 w-full rounded-lg border border-surface-border bg-surface-subtle py-1 pl-7 pr-2 text-[11px] outline-none ring-brand-500/20 focus:border-brand-300 focus:bg-white focus:ring-2 sm:h-9 sm:pl-8 sm:text-xs"
              />
            </div>
          </div>
        </PageFilterBar>

        <PageContentPanel flush>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-ink-muted">
                {selectionCount ? (
                  <span className="font-semibold text-ink">{selectionCount} selected</span>
                ) : (
                  'None selected'
                )}
              </span>
              {total > 0 ? (
                <button
                  type="button"
                  onClick={selectAllMatching}
                  disabled={selectingAll || !selectAllCap}
                  className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-900 hover:bg-brand-100 disabled:opacity-40"
                >
                  {selectingAll
                    ? 'Selecting…'
                    : `Select all ${selectAllCap.toLocaleString()} lead${selectAllCap === 1 ? '' : 's'}`}
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={assignDisabled}
                onClick={() => setAssignModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--brand-primary-dark)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Users className="h-3.5 w-3.5" />
                Assign leads
              </button>
              <button
                type="button"
                onClick={selectAllOnPage}
                disabled={!rows.length}
                className="rounded-lg border border-surface-border bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-subtle disabled:opacity-40"
              >
                Select page
              </button>
              <button
                type="button"
                onClick={clearSelection}
                disabled={!selectionCount}
                className="rounded-lg border border-transparent px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-subtle disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          </div>

          <DataGrid
            gridColumns
            columns={leadDistColumns}
            data={rows}
            loading={isLoading}
            searchable={false}
            showColumnToggle={false}
            showExportCsv={false}
            checkboxSelection
            rowSelectionModel={pageRowSelection}
            onRowSelectionModelChange={handleLeadDistSelectionChange}
            paginationMode="server"
            rowCount={total}
            paginationModel={{ page: page - 1, pageSize: limit }}
            onPaginationModelChange={(model) => setPage(model.page + 1)}
            getRowClassName={(params) =>
              selectedLeadIds.has(params.row.id) ? '!bg-brand-50/60' : ''
            }
            emptyTitle="You're all caught up"
            emptyDescription="No unassigned leads match these filters."
            maxHeightClass="max-h-[min(60vh,520px)]"
            className="rounded-none border-0 shadow-none"
          />
        </PageContentPanel>
      </PageStack>

      {assignModalOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px]"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setAssignModalOpen(false)
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="assign-modal-title"
                className="max-h-[min(90vh,640px)] w-full max-w-lg overflow-hidden rounded-2xl border border-surface-border bg-white shadow-xl"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 border-b border-surface-border px-5 py-4">
                  <div>
                    <h3 id="assign-modal-title" className="text-base font-bold text-ink">
                      Assign to callers
                    </h3>
                    <p className="mt-1 text-xs text-ink-muted">
                      Round-robin in the order you select. {selectionCount} lead{selectionCount === 1 ? '' : 's'} selected.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-ink-muted hover:bg-surface-subtle hover:text-ink"
                    aria-label="Close"
                    onClick={() => setAssignModalOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="max-h-[min(52vh,380px)] space-y-2 overflow-y-auto px-5 py-4">
                  {users.length === 0 ? (
                    <p className="text-xs text-ink-muted">No team members found.</p>
                  ) : (
                    users.map((u) => {
                      const on = callerOrder.some((c) => c.id === u.id)
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleCaller(u)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                            on
                              ? 'border-brand-300 bg-brand-50/90 shadow-sm'
                              : 'border-surface-border bg-surface-subtle/50 hover:border-brand-200 hover:bg-white',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                              on ? 'bg-[var(--brand-primary)] text-white' : 'bg-surface-muted text-ink-muted',
                            )}
                          >
                            {initials(u.name || u.email)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">{u.name || u.email}</span>
                            {u.name ? <span className="block truncate text-[11px] text-ink-muted">{u.email}</span> : null}
                          </span>
                          {on ? <Check className="h-4 w-4 shrink-0 text-brand-600" /> : null}
                        </button>
                      )
                    })
                  )}
                </div>

                {callerOrder.length > 0 ? (
                  <div className="border-t border-surface-border px-5 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Rotation order</p>
                    <ol className="mt-2 max-h-32 space-y-1.5 overflow-y-auto">
                      {callerOrder.map((c, idx) => (
                        <li key={c.id} className="flex items-center gap-2 text-xs text-ink">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-subtle text-[11px] font-bold text-brand-800 ring-1 ring-brand-100">
                            {idx + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-medium">{c.name || c.email}</span>
                          <span className="flex shrink-0 gap-0.5">
                            <button
                              type="button"
                              className="rounded p-1 text-ink-muted hover:bg-white hover:text-ink"
                              onClick={() => moveCaller(idx, -1)}
                              aria-label="Move up"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              className="rounded p-1 text-ink-muted hover:bg-white hover:text-ink"
                              onClick={() => moveCaller(idx, 1)}
                              aria-label="Move down"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {preview ? (
                  <div className="border-t border-surface-border px-5 py-3 text-xs text-emerald-900">
                    <p className="font-semibold">Split preview</p>
                    <p className="mt-1 text-emerald-800/90">
                      {selectionCount} leads across {callerOrder.length} callers —{' '}
                      {preview.perCaller.map((n, i) => (
                        <span key={callerOrder[i].id}>
                          {callerOrder[i].name?.split(' ')[0] || 'User'}: <strong>{n}</strong>
                          {i < preview.perCaller.length - 1 ? ' · ' : ''}
                        </span>
                      ))}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2 border-t border-surface-border bg-surface-subtle/50 px-5 py-4">
                  <button
                    type="button"
                    className="rounded-lg border border-surface-border bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-subtle"
                    onClick={() => setAssignModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={distributing || !callerOrder.length || !selectionCount}
                    onClick={runDistribute}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[var(--brand-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Shuffle className="h-4 w-4" />
                    {distributing ? 'Assigning…' : 'Confirm assignment'}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </PageShell>
  )
}

export default LeadDistributionPage
