import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeDollarSign, CheckCircle2, Clock, Filter, X, XCircle } from '@/components/ui/icons'
import { PageShell } from '@/components/layout/PageShell'
import { PageStack } from '@/components/layout/PageStack'
import { DataGrid } from '@/components/shared/DataGrid'
import { SkeletonTable } from '@/components/shared/SkeletonLoader'
import { useListAllPaymentsQuery } from '@/features/deals/dealPaymentsApi'
import { useGetLeadFormMetaQuery } from '@/features/leads/leadsApi'
import { DealDetailPanel } from '@/features/deals/components/DealDetailPanel'
import { inputFieldClassName } from '@/components/ui/Input'
import { TablePaginationBar } from '@/components/ui/TablePaginationBar'
import { cn } from '@/utils/cn'

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200]

const STATUS_META = {
  received: { label: 'Received', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', Icon: CheckCircle2 },
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 ring-amber-200', Icon: Clock },
  failed: { label: 'Failed', cls: 'bg-rose-50 text-rose-700 ring-rose-200', Icon: XCircle },
  refunded: { label: 'Refunded', cls: 'bg-neutral-100 text-neutral-600 ring-neutral-200', Icon: XCircle },
}

const MODES = ['bank_transfer', 'cash', 'cheque', 'upi', 'card', 'crypto', 'other']
const STATUSES = ['received', 'pending', 'failed', 'refunded']

function fmtMoney(amount, currency = 'USD') {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '—'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n)
  } catch {
    return `${currency} ${n.toFixed(2)}`
  }
}

function fmtDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return d
  }
}

export function DealPaymentsPage() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(100)
  const [status, setStatus] = useState('')
  const [mode, setMode] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [createdByUserId, setCreatedByUserId] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState(null)

  const query = useMemo(() => {
    const q = { page, limit }
    if (status) q.status = status
    if (mode) q.mode = mode
    if (dateFrom) q.dateFrom = dateFrom
    if (dateTo) q.dateTo = dateTo
    if (createdByUserId) q.createdByUserId = createdByUserId
    return q
  }, [page, limit, status, mode, dateFrom, dateTo, createdByUserId])

  const { data, isLoading, isFetching, isError, refetch } = useListAllPaymentsQuery(query)
  const { data: formMetaData } = useGetLeadFormMetaQuery()
  const users = formMetaData?.data?.users || []
  const rawDealStatuses = formMetaData?.data?.dealStatuses || []
  const pipelineStatuses = formMetaData?.data?.pipelineStatuses || []
  const dealStatuses = rawDealStatuses.length
    ? [...rawDealStatuses].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    : pipelineStatuses

  const rows = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data?.data])
  const total = data?.meta?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1)

  const activeFilterCount = [status, mode, dateFrom, dateTo, createdByUserId].filter(Boolean).length

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  function clearFilters() {
    setStatus('')
    setMode('')
    setDateFrom('')
    setDateTo('')
    setCreatedByUserId('')
    setPage(1)
  }

  const pageReceivedTotal = useMemo(
    () => rows.filter((r) => r.status === 'received').reduce((a, r) => a + Number(r.amount || 0), 0),
    [rows],
  )

  const columns = useMemo(
    () => [
      {
        field: 'paymentDate',
        headerName: 'Date',
        width: 118,
        valueGetter: (_v, row) => fmtDate(row.paymentDate),
      },
      {
        field: 'deal',
        headerName: 'Deal',
        flex: 1,
        minWidth: 180,
        sortable: false,
        renderCell: ({ row }) =>
          row.deal ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                className="truncate text-sm font-semibold text-ink hover:text-brand-600 hover:underline"
                onClick={(e) => { e.stopPropagation(); setSelectedDeal({ ...row.deal, entityType: 'deal' }) }}
              >
                {row.deal.name}
              </button>
            </div>
          ) : (
            <span className="text-xs text-ink-muted">—</span>
          ),
      },
      {
        field: 'amount',
        headerName: 'Amount',
        width: 132,
        renderCell: ({ row }) => (
          <span className="text-sm font-bold tabular-nums text-ink">{fmtMoney(row.amount, row.currency)}</span>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 118,
        renderCell: ({ row }) => {
          const meta = STATUS_META[row.status] || STATUS_META.received
          const { Icon } = meta
          return (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
                meta.cls,
              )}
            >
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
          )
        },
      },
      {
        field: 'mode',
        headerName: 'Mode',
        width: 148,
        renderCell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-sm text-ink">
            {(row.mode || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            {row.invoicePaymentId ? (
              <span
                title="Synced from an invoice payment"
                className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-700 ring-1 ring-violet-100"
              >
                Invoice
              </span>
            ) : null}
          </span>
        ),
      },
      {
        field: 'reference',
        headerName: 'Reference',
        width: 130,
        valueGetter: (_v, row) => row.reference || '—',
      },
      {
        field: 'notes',
        headerName: 'Notes',
        flex: 1,
        minWidth: 140,
        sortable: false,
        renderCell: ({ row }) => (
          <span className="line-clamp-2 text-xs text-ink-muted" title={row.notes || ''}>
            {row.notes?.trim() || '—'}
          </span>
        ),
      },
      {
        field: 'createdBy',
        headerName: 'Recorded by',
        width: 140,
        sortable: false,
        renderCell: ({ row }) =>
          row.createdBy ? (
            <span className="truncate text-sm text-ink">{row.createdBy.name || row.createdBy.email}</span>
          ) : (
            <span className="text-xs text-ink-muted">—</span>
          ),
      },
    ],
    [],
  )

  const paymentsFilterBar = (
    <div className="relative" data-filter-dropdown>
      <button
        type="button"
        onClick={() => setFilterOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-surface-border bg-white px-3 text-xs font-semibold text-ink shadow-sm hover:bg-surface-subtle"
      >
        <Filter className="h-3.5 w-3.5 text-ink-muted" />
        Filters
        {activeFilterCount > 0 ? (
          <span className="rounded-full bg-[var(--brand-primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {activeFilterCount}
          </span>
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
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Status
              </span>
              <select
                className="h-9 w-full rounded-lg border border-surface-border px-2 text-sm"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Payment mode
              </span>
              <select
                className="h-9 w-full rounded-lg border border-surface-border px-2 text-sm"
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All modes</option>
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  Date from
                </span>
                <input
                  type="date"
                  className="h-9 w-full rounded-lg border border-surface-border px-2 text-sm"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    setPage(1)
                  }}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  Date to
                </span>
                <input
                  type="date"
                  className="h-9 w-full rounded-lg border border-surface-border px-2 text-sm"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    setPage(1)
                  }}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Recorded by
              </span>
              <select
                className="h-9 w-full rounded-lg border border-surface-border px-2 text-sm"
                value={createdByUserId}
                onChange={(e) => {
                  setCreatedByUserId(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
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

  const paymentsTotals = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
      <span>
        Total payments: <span className="font-semibold text-ink">{total.toLocaleString()}</span>
      </span>
      {rows.length > 0 ? (
        <span>
          Received on page:{' '}
          <span className="font-semibold text-emerald-700">{fmtMoney(pageReceivedTotal)}</span>
        </span>
      ) : null}
      {isFetching && !isLoading ? <span className="text-[10px]">Updating…</span> : null}
    </div>
  )

  const paymentsToolbarRow = (
    <div className="flex flex-wrap items-center gap-2 border-b border-brand-100 bg-brand-50/30 px-4 py-3">
      {paymentsTotals}
      <div className="ml-auto">{paymentsFilterBar}</div>
    </div>
  )

  return (
    <PageShell fullWidth mainClassName="pt-2 pb-4">
      <PageStack className="gap-3">
        <section className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-sm">
          {isLoading ? (
            <>
              {paymentsToolbarRow}
              <div className="p-4">
                <SkeletonTable cols={8} rows={10} />
              </div>
            </>
          ) : isError ? (
            <>
              {paymentsToolbarRow}
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <p className="text-sm font-medium text-rose-800">Could not load payments.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-3 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold cx-icon-inherit text-white"
                >
                  Retry
                </button>
              </div>
            </>
          ) : rows.length === 0 ? (
            <>
              {paymentsToolbarRow}
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BadgeDollarSign className="h-10 w-10 text-ink-faint" />
                <p className="mt-3 text-sm font-medium text-ink">No payments found</p>
                <p className="mt-1 max-w-sm text-xs text-ink-muted">
                  Record payments from a deal&apos;s Payments tab, or clear filters to see all records.
                </p>
                <Link to="/deals" className="mt-4 text-sm font-semibold text-brand-600 hover:underline">
                  Go to deals
                </Link>
              </div>
            </>
          ) : (
            <>
              <DataGrid
                gridColumns
                columns={columns}
                data={rows}
                loading={isFetching && !isLoading}
                searchable
                showExportCsv
                toolbarLeft={paymentsTotals}
                toolbarRight={paymentsFilterBar}
                csvFilename="deal-payments.csv"
                hideFooter
                getRowId={(row) => row.id}
                defaultPageSize={limit}
                autoHeight
                emptyTitle="No payments"
                className="rounded-none border-0 shadow-none"
                onRowClick={({ row }) => row.deal && setSelectedDeal({ ...row.deal, entityType: 'deal' })}
              />
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
                        Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of{' '}
                        {total.toLocaleString()}
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
            </>
          )}
        </section>
      </PageStack>

      <DealDetailPanel
        open={Boolean(selectedDeal)}
        onClose={() => setSelectedDeal(null)}
        opp={selectedDeal}
        pipelineStatuses={dealStatuses}
        defaultTab="payments"
      />
    </PageShell>
  )
}
