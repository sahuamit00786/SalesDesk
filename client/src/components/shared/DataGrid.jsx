import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Inbox,
  LayoutList,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { TablePaginationBar } from '@/components/ui/TablePaginationBar'
import { EmptyState } from '@/components/shared/EmptyState'
import { Loader } from '@/components/shared/Loader'
import { useOutsideClick } from '@/hooks/useOutsideClick'

function defaultGlobalFilterFn(row, _columnId, filterValue) {
  const q = String(filterValue ?? '').trim().toLowerCase()
  if (!q) return true
  return row.getAllCells().some((cell) => {
    const v = cell.getValue()
    if (v == null || typeof v === 'object') return false
    return String(v).toLowerCase().includes(q)
  })
}

function escapeCsvCell(val) {
  const s = val == null ? '' : String(val)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadCsv(filename, rows, headers) {
  const lines = [headers.map(escapeCsvCell).join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(','))
  }
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function headerLabel(column) {
  const h = column.columnDef.header
  if (typeof h === 'string') return h
  return column.columnDef.meta?.title ?? column.id
}

function SelectAllCheckbox({ table }) {
  const ref = useRef(null)
  const some = table.getIsSomePageRowsSelected()
  const all = table.getIsAllPageRowsSelected()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.indeterminate = some && !all
  }, [some, all])
  return (
    <input
      ref={ref}
      type="checkbox"
      className="h-4 w-4 rounded border-surface-border text-brand-600 focus:ring-brand-500/30"
      checked={all}
      onChange={table.getToggleAllPageRowsSelectedHandler()}
      aria-label="Select all rows on this page"
    />
  )
}

/**
 * Full-featured data grid: sort, search, paginate, row selection, column visibility, CSV export,
 * loading + empty states, sticky header, keyboard-friendly controls.
 *
 * @param {import('@tanstack/react-table').ColumnDef<any>[]} columns
 * @param {any[]} data
 * @param {string} [className]
 * @param {boolean} [loading]
 * @param {boolean} [searchable=true]
 * @param {boolean} [selectable=false]
 * @param {boolean} [showColumnToggle=true]
 * @param {boolean} [showExportCsv=true]
 * @param {number[]} [pageSizeOptions]
 * @param {number} [defaultPageSize=10]
 * @param {string} [maxHeightClass] Tailwind max-height for scroll region
 * @param {string} [emptyTitle]
 * @param {string} [emptyDescription]
 * @param {import('lucide-react').LucideIcon} [emptyIcon]
 * @param {(rows: any[]) => void} [onSelectionChange]
 * @param {(row: any) => string} [getRowId]
 * @param {boolean} [striped=false]
 * @param {boolean} [compact=false]
 * @param {React.ReactNode} [toolbarRight]
 * @param {string} [csvFilename='export.csv']
 */
export function DataGrid({
  columns,
  data = [],
  className,
  loading = false,
  searchable = true,
  selectable = false,
  showColumnToggle = true,
  showExportCsv = true,
  pageSizeOptions = [10, 20, 50, 100],
  defaultPageSize = 10,
  maxHeightClass = 'max-h-[min(70vh,560px)]',
  emptyTitle = 'No data',
  emptyDescription = 'There is nothing to display yet.',
  emptyIcon: EmptyIcon = Inbox,
  onSelectionChange,
  getRowId,
  striped = false,
  compact = false,
  toolbarRight,
  csvFilename = 'export.csv',
}) {
  const menuId = useId()
  const sizeChoices = useMemo(() => {
    const s = new Set(pageSizeOptions)
    s.add(defaultPageSize)
    return Array.from(s).sort((a, b) => a - b)
  }, [pageSizeOptions, defaultPageSize])

  const [sorting, setSorting] = useState([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnVisibility, setColumnVisibility] = useState({})
  const [rowSelection, setRowSelection] = useState({})
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: defaultPageSize,
  })

  const [columnMenuOpen, setColumnMenuOpen] = useState(false)
  const columnMenuRef = useRef(null)
  useOutsideClick(columnMenuRef, () => setColumnMenuOpen(false), columnMenuOpen)

  const selectionColumn = useMemo(
    () => ({
      id: '__select',
      size: 44,
      minSize: 44,
      maxSize: 44,
      header: ({ table }) => <SelectAllCheckbox table={table} />,
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-surface-border text-brand-600 focus:ring-brand-500/30"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          aria-label={`Select row ${row.index + 1}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      enableGlobalFilter: false,
    }),
    [],
  )

  const tableColumns = useMemo(() => {
    if (!selectable) return columns
    return [selectionColumn, ...columns]
  }, [columns, selectable, selectionColumn])

  // TanStack Table: stable at runtime; React Compiler skips memo here (expected).
  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable
  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, globalFilter, columnVisibility, rowSelection, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: defaultGlobalFilterFn,
    getRowId: getRowId ?? ((row, i) => (row?.id != null ? String(row.id) : String(i))),
    enableSortingRemoval: true,
    enableRowSelection: selectable,
    defaultColumn: {
      minSize: 48,
      size: 160,
    },
  })

  const tableRef = useRef(table)
  tableRef.current = table

  useEffect(() => {
    if (!onSelectionChange) return
    const rows = tableRef.current.getSelectedRowModel().flatRows.map((r) => r.original)
    onSelectionChange(rows)
  }, [rowSelection, onSelectionChange])

  const exportCsv = useCallback(() => {
    const leaf = table.getVisibleLeafColumns().filter((c) => {
      if (c.id === '__select') return false
      return c.columnDef.accessorKey != null || typeof c.accessorFn === 'function'
    })
    const headers = leaf.map((c) => headerLabel(c))
    const rows = table.getFilteredRowModel().rows.map((row) =>
      leaf.map((col) => {
        const v = row.getValue(col.id)
        if (v != null && typeof v === 'object') return JSON.stringify(v)
        return v
      }),
    )
    downloadCsv(csvFilename, rows, headers)
  }, [csvFilename, table])

  const filteredCount = table.getFilteredRowModel().rows.length
  const pageRows = table.getRowModel().rows
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const from = filteredCount ? pageIndex * pageSize + 1 : 0
  const to = Math.min((pageIndex + 1) * pageSize, filteredCount)

  const showToolbar = searchable || showColumnToggle || showExportCsv || toolbarRight
  const hasRows = data.length > 0
  const noResults = hasRows && filteredCount === 0

  if (!hasRows && !loading) {
    return (
      <EmptyState
        icon={EmptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        className={className}
      />
    )
  }

  if (!hasRows && loading) {
    return (
      <div
        className={cn(
          'flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-surface-border bg-white p-8',
          className,
        )}
      >
        <Loader label="Loading data…" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm',
        className,
      )}
    >
      {showToolbar ? (
        <div className="flex flex-col gap-3 border-b border-surface-border bg-surface-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            {searchable ? (
              <div className="relative min-w-0 max-w-md flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                  aria-hidden
                />
                <Input
                  value={globalFilter ?? ''}
                  onChange={(e) => {
                    setGlobalFilter(e.target.value)
                    table.setPageIndex(0)
                  }}
                  placeholder="Search all columns…"
                  className="h-10 pl-9"
                  aria-label="Search table"
                />
              </div>
            ) : null}
            {noResults ? (
              <Button
                type="button"
                variant="secondary"
                className="h-10 shrink-0 whitespace-nowrap px-4 text-sm"
                onClick={() => {
                  setGlobalFilter('')
                  table.setPageIndex(0)
                }}
              >
                Clear search
              </Button>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {toolbarRight}
            {showColumnToggle ? (
              <div className="relative" ref={columnMenuRef}>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 gap-2 px-4"
                  aria-expanded={columnMenuOpen}
                  aria-haspopup="true"
                  aria-controls={columnMenuOpen ? menuId : undefined}
                  onClick={() => setColumnMenuOpen((o) => !o)}
                >
                  <SlidersHorizontal className="h-4 w-4" aria-hidden />
                  Columns
                </Button>
                {columnMenuOpen ? (
                  <div
                    id={menuId}
                    role="menu"
                    className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-surface-border bg-white py-1 shadow-xl"
                  >
                    <p className="border-b border-surface-border px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                      Visible columns
                    </p>
                    <ul className="max-h-64 overflow-y-auto py-1 scrollbar-subtle">
                      {table.getAllLeafColumns().map((column) => {
                        if (!column.getCanHide()) return null
                        return (
                          <li key={column.id} className="px-1">
                            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-ink hover:bg-surface-muted">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-surface-border text-brand-600"
                                checked={column.getIsVisible()}
                                onChange={column.getToggleVisibilityHandler()}
                              />
                              <span className="min-w-0 truncate">{headerLabel(column)}</span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
            {showExportCsv ? (
              <Button
                type="button"
                variant="secondary"
                className="h-10 gap-2 px-4"
                onClick={exportCsv}
                disabled={!filteredCount}
              >
                <Download className="h-4 w-4" aria-hidden />
                Export CSV
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={cn('relative overflow-auto scrollbar-subtle', maxHeightClass)}>
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 backdrop-blur-[1px]">
            <Loader label="Loading data…" className="py-16" />
          </div>
        ) : null}

        {noResults ? (
          <div className="flex min-h-[240px] items-center justify-center p-8">
            <EmptyState
              icon={LayoutList}
              title="No matching rows"
              description="Try a different search term or clear the filter."
              action={
                <Button type="button" variant="secondary" className="mt-2" onClick={() => setGlobalFilter('')}>
                  Clear search
                </Button>
              }
            />
          </div>
        ) : (
          <table
            className={cn('cx-table min-w-[720px]', compact && 'cx-table--dense')}
            role="grid"
          >
            <thead className="cx-table-sticky-head">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} role="row">
                  {headerGroup.headers.map((header) => {
                    const sorted = header.column.getIsSorted()
                    const canSort = header.column.getCanSort()
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        role="columnheader"
                        aria-sort={
                          sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'
                        }
                        className={cn('whitespace-nowrap', header.column.columnDef.meta?.headerClassName)}
                        style={{ minWidth: header.getSize() }}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-lg text-left outline-none transition-colors',
                              'hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500/25',
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden />
                            ) : sorted === 'desc' ? (
                              <ArrowDown className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden />
                            ) : (
                              <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {pageRows.map((row, idx) => (
                <tr
                  key={row.id}
                  role="row"
                  aria-rowindex={pageIndex * pageSize + idx + 2}
                  className={cn(
                    striped && idx % 2 === 1 && 'bg-slate-50/60',
                    row.getIsSelected() && 'bg-brand-500/[0.08] hover:bg-brand-500/12',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      role="gridcell"
                      className={cn(cell.column.columnDef.meta?.cellClassName)}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!noResults && hasRows ? (
        <div className="flex flex-col gap-3 border-t border-surface-border bg-surface-muted/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <TablePaginationBar
            variant="surface"
            page={pageIndex + 1}
            totalPages={Math.max(1, table.getPageCount())}
            onPageChange={(p) => table.setPageIndex(p - 1)}
            className="w-full"
            subLabel={
              filteredCount ? (
                <>
                  Showing <span className="font-medium text-ink">{from}</span>–
                  <span className="font-medium text-ink">{to}</span> of{' '}
                  <span className="font-medium text-ink">{filteredCount}</span>
                  {selectable && Object.keys(rowSelection).length > 0 ? (
                    <span className="ml-1 text-brand-600">
                      ({Object.keys(rowSelection).length} selected)
                    </span>
                  ) : null}
                </>
              ) : (
                'No rows'
              )
            }
            beforeNav={
              <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
                <span className="hidden sm:inline">Rows per page</span>
                <Select
                  className="h-9 w-[4.5rem] rounded-lg text-xs"
                  value={String(pageSize)}
                  onChange={(e) => {
                    table.setPageSize(Number(e.target.value))
                    table.setPageIndex(0)
                  }}
                  aria-label="Rows per page"
                >
                  {sizeChoices.map((n) => (
                    <option key={n} value={String(n)}>
                      {n}
                    </option>
                  ))}
                </Select>
              </label>
            }
          />
        </div>
      ) : null}
    </div>
  )
}
