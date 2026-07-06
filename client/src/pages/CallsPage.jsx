import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Filter, Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, UserPlus, X } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { PageStack } from '@/components/layout/PageStack'
import { DataGrid } from '@/components/shared/DataGrid'
import { SkeletonTable } from '@/components/shared/SkeletonLoader'
import { inputFieldClassName } from '@/components/ui/Input'
import { TablePaginationBar } from '@/components/ui/TablePaginationBar'
import { cn } from '@/utils/cn'
import { useGetCallsQuery, CALL_OUTCOMES } from '@/features/calls/callsApi'
import { ConvertCallModal } from '@/features/calls/components/ConvertCallModal'

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200]

const OUTCOME_META = {
  connected: { label: 'Connected', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  no_answer: { label: 'No answer', cls: 'bg-neutral-100 text-neutral-600 ring-neutral-200' },
  voicemail: { label: 'Voicemail', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  followup_needed: { label: 'Follow-up needed', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
}

const HAS_LEAD_OPTIONS = [
  { value: '', label: 'All calls' },
  { value: 'true', label: 'With lead' },
  { value: 'false', label: 'No lead' },
]

function fmtDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** incoming | outgoing | missed — missed is an unanswered inbound call. */
function callKind(row) {
  if (row.callType === 'outbound') return 'outgoing'
  if (row.outcome === 'no_answer' || row.outcome === 'voicemail') return 'missed'
  return 'incoming'
}

const KIND_META = {
  incoming: { label: 'Incoming', Icon: PhoneIncoming, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  outgoing: { label: 'Outgoing', Icon: PhoneOutgoing, cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  missed: { label: 'Missed', Icon: PhoneMissed, cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
}

/** Always-granular hh:mm:ss breakdown, not a rounded "5m" — exact call length. */
function fmtDurationExact(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`
  if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`
  return `${sec}s`
}

export function CallsPage() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [hasLead, setHasLead] = useState('')
  const [outcome, setOutcome] = useState('')
  const [callType, setCallType] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [groupByLead, setGroupByLead] = useState(false)
  const [convertTarget, setConvertTarget] = useState(null)

  const query = useMemo(() => {
    const q = { page, limit }
    if (hasLead) q.hasLead = hasLead
    if (callType === 'missed') {
      // Missed = unanswered inbound; server has no "missed" type, so filter by both fields.
      q.callType = 'inbound'
      q.outcome = 'no_answer'
    } else {
      if (outcome) q.outcome = outcome
      if (callType) q.callType = callType
    }
    return q
  }, [page, limit, hasLead, outcome, callType])

  const { data, isLoading, isFetching, isError, refetch } = useGetCallsQuery(query)

  const rows = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data?.data])
  const total = data?.meta?.total ?? rows.length
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1)

  const activeFilterCount = [hasLead, outcome, callType].filter(Boolean).length

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  function clearFilters() {
    setHasLead('')
    setOutcome('')
    setCallType('')
    setPage(1)
  }

  const columns = useMemo(
    () => [
      {
        field: 'createdAt',
        headerName: 'Date & time',
        width: 200,
        renderCell: ({ row }) => (
          <span className="inline-block origin-left scale-75 text-sm text-ink">
            {fmtDateTime(row.createdAt)}
          </span>
        ),
      },
      {
        field: 'caller',
        headerName: 'Caller',
        flex: 1,
        minWidth: 200,
        sortable: false,
        renderCell: ({ row }) => {
          const { Icon } = KIND_META[callKind(row)]
          const name = row.lead?.contactName || row.lead?.title || row.callerName || row.phoneNumber || 'Unknown'
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Icon className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
              {row.leadId ? (
                <Link to={`/leads/${row.leadId}`} className="truncate text-sm font-semibold text-ink hover:text-brand-600 hover:underline">
                  {name}
                </Link>
              ) : (
                <span className="truncate text-sm font-medium text-ink">{name}</span>
              )}
            </div>
          )
        },
      },
      {
        field: 'kind',
        headerName: 'Type',
        width: 120,
        sortable: false,
        renderCell: ({ row }) => {
          const { label, Icon, cls } = KIND_META[callKind(row)]
          return (
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1', cls)}>
              <Icon className="h-3 w-3" />
              {label}
            </span>
          )
        },
      },
      {
        field: 'phoneNumber',
        headerName: 'Number',
        width: 150,
        valueGetter: (_v, row) => row.phoneNumber || '—',
      },
      {
        field: 'duration',
        headerName: 'Duration',
        width: 120,
        renderCell: ({ row }) => <span className="tabular-nums text-sm text-ink">{fmtDurationExact(row.duration)}</span>,
      },
      {
        field: 'outcome',
        headerName: 'Outcome',
        width: 150,
        renderCell: ({ row }) => {
          const meta = OUTCOME_META[row.outcome]
          if (!meta) return <span className="text-xs text-ink-muted">—</span>
          return (
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1', meta.cls)}>
              {meta.label}
            </span>
          )
        },
      },
      {
        field: 'lead',
        headerName: 'Lead',
        width: 160,
        sortable: false,
        renderCell: ({ row }) =>
          row.leadId ? (
            <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 ring-1 ring-brand-100">
              Linked
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setConvertTarget(row)
              }}
              className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 ring-1 ring-neutral-200 hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-200"
            >
              <UserPlus className="h-3 w-3" />
              Convert
            </button>
          ),
      },
      {
        field: 'source',
        headerName: 'Logged by',
        width: 170,
        sortable: false,
        renderCell: ({ row }) => (
          <span className="truncate text-xs text-ink-muted">
            {row.owner?.name || row.owner?.email || '—'}
          </span>
        ),
      },
    ],
    [],
  )

  const groupedRows = useMemo(() => {
    if (!groupByLead) return null
    const map = new Map()
    for (const row of rows) {
      const key = row.leadId || '__none'
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: row.leadId ? row.lead?.contactName || row.lead?.title || 'Lead' : 'No lead',
          leadId: row.leadId || null,
          items: [],
        })
      }
      map.get(key).items.push(row)
    }
    const groups = Array.from(map.values())
    // Named lead groups alphabetical, "No lead" bucket last.
    groups.sort((a, b) => {
      if (!a.leadId && b.leadId) return 1
      if (a.leadId && !b.leadId) return -1
      return a.label.localeCompare(b.label)
    })
    return groups
  }, [groupByLead, rows])

  const callsFilterBar = (
    <div className="relative flex items-center gap-2" data-filter-dropdown>
      <button
        type="button"
        onClick={() => setGroupByLead((v) => !v)}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold shadow-sm',
          groupByLead
            ? 'border-brand-200 bg-brand-50 text-brand-700'
            : 'border-surface-border bg-white text-ink hover:bg-surface-subtle',
        )}
      >
        Group by lead
      </button>
      <button
        type="button"
        onClick={() => setFilterOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-surface-border bg-white px-3 text-xs font-semibold text-ink shadow-sm hover:bg-surface-subtle"
      >
        <Filter className="h-3.5 w-3.5 text-ink-muted" />
        Filters
        {activeFilterCount > 0 ? (
          <span className="rounded-full bg-[var(--brand-primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">{activeFilterCount}</span>
        ) : null}
      </button>

      {filterOpen ? (
        <div className="absolute right-0 top-11 z-30 w-80 rounded-xl border border-surface-border bg-white p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-ink">Filters</p>
            <button type="button" onClick={() => setFilterOpen(false)} className="text-ink-muted hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Lead</span>
              <select
                className="h-9 w-full rounded-lg border border-surface-border px-2 text-sm"
                value={hasLead}
                onChange={(e) => {
                  setHasLead(e.target.value)
                  setPage(1)
                }}
              >
                {HAS_LEAD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Call type</span>
              <select
                className="h-9 w-full rounded-lg border border-surface-border px-2 text-sm"
                value={callType}
                onChange={(e) => {
                  setCallType(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All types</option>
                <option value="inbound">Incoming</option>
                <option value="outbound">Outgoing</option>
                <option value="missed">Missed</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Outcome</span>
              <select
                className="h-9 w-full rounded-lg border border-surface-border px-2 text-sm disabled:bg-neutral-50 disabled:text-ink-faint"
                value={callType === 'missed' ? 'no_answer' : outcome}
                disabled={callType === 'missed'}
                onChange={(e) => {
                  setOutcome(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All outcomes</option>
                {CALL_OUTCOMES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  clearFilters()
                  setFilterOpen(false)
                }}
                className="w-full rounded-lg border border-rose-200 bg-white py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
              >
                Clear all filters
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )

  const paginationFooter = (
    <div className="cx-data-grid-footer border-t border-surface-border px-3 py-1.5 sm:px-4">
      <TablePaginationBar
        compact
        variant="brand"
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        subLabel={
          total > 0 ? (
            <>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()}
            </>
          ) : null
        }
        beforeNav={
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
            <span className="hidden sm:inline">Rows per page</span>
            <select
              className={cn(inputFieldClassName, 'h-[1.6875rem] w-[4.25rem] rounded-md px-1.5 text-[11px]')}
              value={String(limit)}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setPage(1)
              }}
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        }
      />
    </div>
  )

  const callsToolbarRow = (
    <div className="flex flex-wrap items-center gap-2 border-b border-brand-100 bg-brand-50/30 px-4 py-3">
      <span className="text-xs text-ink-muted">
        Total calls: <span className="font-semibold text-ink">{total.toLocaleString()}</span>
      </span>
      {isFetching && !isLoading ? <span className="text-[10px] text-ink-muted">Updating…</span> : null}
      <div className="ml-auto">{callsFilterBar}</div>
    </div>
  )

  return (
    <PageShell fullWidth mainClassName="pt-2 pb-4">
      <PageStack className="gap-3">
        <section className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-sm">
          {isLoading ? (
            <>
              {callsToolbarRow}
              <div className="p-4">
                <SkeletonTable cols={7} rows={10} />
              </div>
            </>
          ) : isError ? (
            <>
              {callsToolbarRow}
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <p className="text-sm font-medium text-rose-800">Could not load calls.</p>
                <button type="button" onClick={() => refetch()} className="mt-3 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white">
                  Retry
                </button>
              </div>
            </>
          ) : rows.length === 0 ? (
            <>
              {callsToolbarRow}
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Phone className="h-10 w-10 text-ink-faint" />
                <p className="mt-3 text-sm font-medium text-ink">No calls found</p>
                <p className="mt-1 max-w-sm text-xs text-ink-muted">
                  Calls logged from a lead, or synced from the mobile app's call log, show up here.
                </p>
              </div>
            </>
          ) : groupByLead ? (
            <>
              {callsToolbarRow}
              <div className="space-y-4 p-4">
                {groupedRows.map((group) => (
                  <div key={group.key} className="overflow-hidden rounded-lg border border-surface-border">
                    <div className="flex items-center gap-2 border-b border-surface-border bg-surface-subtle px-3 py-2">
                      {group.leadId ? (
                        <Link to={`/leads/${group.leadId}`} className="text-xs font-semibold text-ink hover:text-brand-600 hover:underline">
                          {group.label}
                        </Link>
                      ) : (
                        <span className="text-xs font-semibold text-ink-muted">{group.label}</span>
                      )}
                      <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600">
                        {group.items.length}
                      </span>
                    </div>
                    <DataGrid
                      gridColumns
                      columns={columns}
                      data={group.items}
                      searchable={false}
                      showColumnToggle={false}
                      showExportCsv={false}
                      hideFooter
                      getRowId={(row) => row.id}
                      defaultPageSize={200}
                      autoHeight
                      minHeightClass=""
                      className="rounded-none border-0 shadow-none"
                    />
                  </div>
                ))}
              </div>
              {paginationFooter}
            </>
          ) : (
            <>
              <DataGrid
                gridColumns
                columns={columns}
                data={rows}
                loading={isFetching && !isLoading}
                searchable
                showColumnToggle={false}
                toolbarLeft={
                  <span className="text-xs text-ink-muted">
                    Total calls: <span className="font-semibold text-ink">{total.toLocaleString()}</span>
                  </span>
                }
                toolbarRight={callsFilterBar}
                hideFooter
                getRowId={(row) => row.id}
                defaultPageSize={limit}
                autoHeight
                emptyTitle="No calls"
                className="rounded-none border-0 shadow-none"
              />
              {paginationFooter}
            </>
          )}
        </section>
      </PageStack>

      <ConvertCallModal call={convertTarget} onClose={() => setConvertTarget(null)} />
    </PageShell>
  )
}
