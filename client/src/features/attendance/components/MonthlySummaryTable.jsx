import { useMemo, useRef, useState } from 'react'
import { Download, Search, Users, X } from 'lucide-react'
import { DataGrid } from '@/components/shared/DataGrid'
import { HrCard } from '@/features/hr/components/HrCard'
import { HrEmptyState } from '@/features/hr/components/HrEmptyState'

function escapeCsv(val) {
  const s = val == null ? '' : String(val)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadCsv(rows) {
  const headers = ['Employee', 'Department', 'Present', 'Absent', 'Late', 'Half day', 'Total hours']
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((r) =>
      [
        r.name, r.department || '', r.daysPresent, r.daysAbsent,
        r.daysLate, r.daysHalfDay, Number(r.totalHours || 0).toFixed(1) + 'h',
      ].map(escapeCsv).join(','),
    ),
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'attendance-summary.csv'
  a.click()
  URL.revokeObjectURL(url)
}

const COLUMNS = [
  {
    accessorKey: 'name',
    header: 'Employee',
    size: 140,
    cell: ({ getValue }) => <span className="font-semibold">{getValue()}</span>,
  },
  {
    accessorKey: 'department',
    header: 'Department',
    size: 120,
    cell: ({ getValue }) => getValue() || '—',
  },
  { accessorKey: 'daysPresent', header: 'Present', size: 80 },
  { accessorKey: 'daysAbsent', header: 'Absent', size: 80 },
  { accessorKey: 'daysLate', header: 'Late', size: 70 },
  { accessorKey: 'daysHalfDay', header: 'Half day', size: 80 },
  {
    accessorKey: 'totalHours',
    header: 'Total hours',
    size: 100,
    cell: ({ getValue }) => `${Number(getValue() || 0).toFixed(1)}h`,
  },
]

export function MonthlySummaryTable({ summary = [], onUserSelect }) {
  const [search, setSearch] = useState('')
  const inputRef = useRef(null)

  const rows = useMemo(
    () => summary.map((r) => ({ ...r, id: String(r.userId ?? r.id) })),
    [summary],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        String(r.name || '').toLowerCase().includes(q) ||
        String(r.department || '').toLowerCase().includes(q),
    )
  }, [rows, search])

  const headerAction = (
    <div className="flex items-center gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="h-7 rounded-lg border border-surface-border bg-white pl-7 pr-2 text-[11px] text-ink outline-none placeholder:text-ink-faint focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30"
          style={{ width: search ? '11rem' : '8rem', transition: 'width 0.2s' }}
          aria-label="Search employees"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-faint hover:text-ink"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Export */}
      <button
        type="button"
        onClick={() => downloadCsv(filtered)}
        disabled={filtered.length === 0}
        className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-surface-border bg-white px-2.5 text-[11px] font-medium text-ink transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        title="Export filtered rows as CSV"
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        Export
      </button>
    </div>
  )

  return (
    <HrCard
      title="Monthly summary"
      description="Attendance totals per team member for the selected period"
      icon={Users}
      action={headerAction}
      flush
      bodyClassName="p-0"
    >
      {!rows.length ? (
        <HrEmptyState
          icon={Users}
          title="No results"
          description="There is no team attendance data for this month yet."
          className="m-5 border-0 bg-transparent"
        />
      ) : (
        <div className="cx-summary-table">
          <DataGrid
            columns={COLUMNS}
            data={filtered}
            searchable={false}
            showColumnToggle={false}
            showExportCsv={false}
            defaultPageSize={15}
            onRowClick={onUserSelect ? (params) => onUserSelect(params.row.userId) : undefined}
            getRowId={(row) => String(row.userId ?? row.id)}
            emptyTitle={search ? 'No matches' : 'No results'}
            emptyDescription={search ? 'Try a different name or department.' : undefined}
            className="border-0 shadow-none"
          />
        </div>
      )}
    </HrCard>
  )
}
