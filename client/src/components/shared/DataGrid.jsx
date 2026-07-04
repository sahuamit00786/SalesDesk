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

/**
 * Normalise a MUI-DataGrid-style column def to a TanStack Table column def.
 * Supports: field → accessorKey/id, headerName → header, renderCell → cell,
 * valueGetter → accessorFn, width/minWidth → size/minSize.
 * If the column already uses TanStack format (has accessorKey/accessorFn/id)
 * it is returned unchanged.
 */
function normalizeMuiColumn(col) {
  if (col == null || typeof col !== 'object') return null
  // Already TanStack format
  if ('accessorKey' in col || 'accessorFn' in col) return col
  // Has an explicit TanStack id but no MUI field → treat as display column
  if ('id' in col && !('field' in col)) return col
  // MUI format — must have field
  if (!('field' in col)) return col
  const { field, headerName, renderCell, valueGetter, width, minWidth, flex: _flex, ...rest } = col
  const normalized = {
    id: String(field),
    header: headerName ?? String(field),
    ...(width != null && { size: width }),
    ...(minWidth != null && { minSize: minWidth }),
  }
  if (valueGetter) {
    normalized.accessorFn = (row) => valueGetter(row[field], row)
  } else {
    normalized.accessorKey = String(field)
  }
  if (renderCell) {
    normalized.cell = ({ row, getValue }) =>
      renderCell({ value: getValue(), row: row.original, field })
  }
  // Spread remaining known TanStack props; ignore MUI-only ones already destructured
  return { ...normalized, ...rest }
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
 * Accepts both TanStack Table column defs (accessorKey/accessorFn) and legacy
 * MUI DataGrid column defs (field/headerName/renderCell/valueGetter) — the latter
 * are automatically normalised to TanStack format.
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
 * @param {string} [maxHeightClass] Max height + inner scroll (only when autoHeight=false)
 * @param {boolean} [autoHeight=true] Grow with all rows on the page; footer sits below the table
 * @param {string} [minHeightClass] Minimum grid height when autoHeight (default min-h-[280px])
 * @param {string} [emptyTitle]
 * @param {string} [emptyDescription]
 * @param {import('lucide-react').LucideIcon} [emptyIcon]
 * @param {(rows: any[]) => void} [onSelectionChange]
 * @param {(row: any) => string} [getRowId]
 * @param {boolean} [striped=false]
 * @param {boolean} [compact=false]
 * @param {React.ReactNode} [toolbarRight]
 * @param {React.ReactNode} [toolbarLeft]
 * @param {string} [csvFilename='export.csv']
 */
export function DataGrid({
  columns,
  data = [],
  className,
  loading = false,
  searchable = true,
  selectable = false,
  checkboxSelection: checkboxSelectionProp,
  showColumnToggle = true,
  showExportCsv = true,
  pageSizeOptions = [10, 20, 50, 100],
  defaultPageSize = 10,
  maxHeightClass = 'max-h-[min(70vh,560px)]',
  autoHeight = true,
  minHeightClass = 'min-h-[280px]',
  emptyTitle = 'No data',
  emptyDescription = 'There is nothing to display yet.',
  emptyIcon: EmptyIcon = Inbox,
  onSelectionChange,
  rowSelectionModel: controlledRowSelection,
  onRowSelectionModelChange,
  getRowId,
  striped = false,
  compact = false,
  density,
  toolbarRight,
  toolbarLeft,
  csvFilename = 'export.csv',
  gridColumns: _gridColumns,
  hideFooter = false,
  paginationMode = 'client',
  rowCount,
  paginationModel: controlledPaginationModel,
  onPaginationModelChange,
  onRowClick,
  getRowClassName,
  disableRowSelectionOnClick,
  sortingMode = 'client',
  sortModel: controlledSortModel,
  onSortModelChange,
}) {
  const checkboxSelection = checkboxSelectionProp ?? selectable
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
    pageIndex: controlledPaginationModel?.page ?? 0,
    pageSize: controlledPaginationModel?.pageSize ?? defaultPageSize,
  })

  useEffect(() => {
    if (!controlledPaginationModel) return
    setPagination({
      pageIndex: controlledPaginationModel.page ?? 0,
      pageSize: controlledPaginationModel.pageSize ?? defaultPageSize,
    })
  }, [controlledPaginationModel])

  useEffect(() => {
    if (!controlledRowSelection) return
    const sel = {}
    for (const id of controlledRowSelection) sel[String(id)] = true
    setRowSelection(sel)
  }, [controlledRowSelection])

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

  // Normalise columns: convert MUI-format defs → TanStack format, strip nullish entries.
  const tableColumns = useMemo(() => {
    const cols = (columns ?? [])
      .map(normalizeMuiColumn)
      .filter((c) => c != null && typeof c === 'object')
    if (!checkboxSelection) return cols
    return [selectionColumn, ...cols]
  }, [columns, checkboxSelection, selectionColumn])

  // TanStack Table: stable at runtime; React Compiler skips memo here (expected).
  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable
  const handlePaginationChange = useCallback(
    (updater) => {
      setPagination((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        onPaginationModelChange?.({ page: next.pageIndex, pageSize: next.pageSize })
        return next
      })
    },
    [onPaginationModelChange],
  )

  const handleSortingChange = useCallback(
    (updater) => {
      setSorting((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        onSortModelChange?.(next)
        return next
      })
    },
    [onSortModelChange],
  )

  const activeSorting = controlledSortModel ?? sorting

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting: activeSorting,
      globalFilter,
      columnVisibility,
      rowSelection,
      pagination,
    },
    onSortingChange: onSortModelChange ? handleSortingChange : setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      setRowSelection((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        const ids = Object.keys(next).filter((k) => next[k])
        onRowSelectionModelChange?.(ids)
        return next
      })
    },
    onPaginationChange: onPaginationModelChange ? handlePaginationChange : setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: sortingMode === 'client' ? getSortedRowModel() : undefined,
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: paginationMode === 'client' ? getPaginationRowModel() : undefined,
    manualPagination: paginationMode === 'server',
    manualSorting: sortingMode === 'server',
    pageCount:
      paginationMode === 'server' && rowCount != null
        ? Math.max(1, Math.ceil(rowCount / pagination.pageSize))
        : undefined,
    globalFilterFn: defaultGlobalFilterFn,
    getRowId: getRowId ?? ((row, i) => (row?.id != null ? String(row.id) : String(i))),
    enableSortingRemoval: true,
    enableRowSelection: checkboxSelection,
    defaultColumn: {
      minSize: 48,
      size: 160,
    },
  })

  const tableRef = useRef(table)
  tableRef.current = table

  // Whether the table instance has been fully initialised with real columns.
  const tableReady = tableColumns.length > 0

  useEffect(() => {
    if (!onSelectionChange || !tableReady) return
    const rows = tableRef.current.getSelectedRowModel().flatRows.map((r) => r.original)
    onSelectionChange(rows)
  }, [rowSelection, onSelectionChange, tableReady])

  const exportCsv = useCallback(() => {
    if (!tableReady) return
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
  }, [csvFilename, table, tableReady])

  // Derive pagination counts only when table is ready to avoid calling table methods
  // with an uninitialized column set.
  const filteredCount =
    paginationMode === 'server' && rowCount != null
      ? rowCount
      : tableReady
        ? (table.getFilteredRowModel()?.rows?.length ?? 0)
        : 0
  const pageRows = tableReady ? (table.getRowModel()?.rows ?? []) : []
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const from = filteredCount ? pageIndex * pageSize + 1 : 0
  const to = Math.min((pageIndex + 1) * pageSize, filteredCount)

  const showToolbar = searchable || showColumnToggle || showExportCsv || toolbarRight || toolbarLeft
  const hasRows = data.length > 0
  const noResults = hasRows && filteredCount === 0
  const isCompact = compact || density === 'compact'
  const rowCountOnPage = pageRows.length

  const scrollRegionClass = autoHeight
    ? cn(
        'relative w-full overflow-x-auto',
        rowCountOnPage === 0 && cn('flex items-center justify-center', minHeightClass),
      )
    : cn('relative min-h-[280px] overflow-auto scrollbar-subtle', maxHeightClass)

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
    // Table-shaped skeleton: header band + shimmering rows, so the layout doesn't jump on load.
    const widths = [
      ['w-1/4', 'w-1/6', 'w-1/5', 'w-16'],
      ['w-1/5', 'w-1/4', 'w-1/6', 'w-20'],
      ['w-1/3', 'w-1/6', 'w-1/6', 'w-14'],
      ['w-1/4', 'w-1/5', 'w-1/4', 'w-16'],
      ['w-1/5', 'w-1/6', 'w-1/5', 'w-20'],
      ['w-1/4', 'w-1/4', 'w-1/6', 'w-14'],
    ]
    return (
      <div
        className={cn(
          'overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm',
          className,
        )}
        role="status"
        aria-label="Loading data"
      >
        <div
          className="h-11 animate-pulse"
          style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 80%, white)' }}
        />
        {widths.map((row, i) => (
          <div
            key={i}
            className="flex items-center gap-6 border-b border-surface-border/60 px-4 py-4 last:border-b-0"
          >
            {row.map((w, j) => (
              <div
                key={j}
                className={cn(
                  'h-3.5 animate-pulse rounded-full bg-slate-200/80',
                  w,
                  j === row.length - 1 && 'ml-auto',
                )}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border border-surface-border bg-white shadow-sm',
        !autoHeight && 'overflow-hidden',
        className,
      )}
    >
      {showToolbar ? (
        <div className="cx-data-grid-toolbar flex flex-wrap items-center gap-2 px-4 py-3">
          {toolbarLeft ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">{toolbarLeft}</div>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2 ml-auto">
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
                {columnMenuOpen && tableReady ? (
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
            {searchable ? (
              <div className="flex items-center gap-2">
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
                <div className="relative w-full min-w-[200px] max-w-[280px] sm:w-72">
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
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={scrollRegionClass}>
        {loading ? (
          <div
            className={cn(
              'flex items-center justify-center bg-white/75 backdrop-blur-[1px]',
              autoHeight ? 'py-12' : 'absolute inset-0 z-10 py-16',
            )}
          >
            <Loader label="Loading data…" />
          </div>
        ) : null}

        {!tableReady ? (
          <div className={cn('flex items-center justify-center p-8', !autoHeight && 'min-h-[200px]')}>
            <Loader label="Loading…" />
          </div>
        ) : noResults ? (
          <div className={cn('flex items-center justify-center p-8', !autoHeight && 'min-h-[200px]')}>
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
            className={cn(
              'cx-table cx-data-grid min-w-[720px]',
              isCompact && 'cx-table--dense',
              !showToolbar && 'cx-data-grid--flush',
            )}
            role="grid"
          >
            <thead className={cn(!autoHeight && 'cx-table-sticky-head')}>
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
                              'group inline-flex items-center gap-1.5 rounded-lg text-left text-white outline-none transition-colors',
                              'hover:text-brand-100 focus-visible:ring-2 focus-visible:ring-white/30',
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 shrink-0 text-white" aria-hidden />
                            ) : sorted === 'desc' ? (
                              <ArrowDown className="h-3.5 w-3.5 shrink-0 text-white" aria-hidden />
                            ) : (
                              <ArrowUpDown
                                className="h-3.5 w-3.5 shrink-0 text-white/40 group-hover:text-white/90"
                                aria-hidden
                              />
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
                    row.getIsSelected() && 'cx-row-selected',
                    getRowClassName?.({ row: row.original, id: row.id }),
                    onRowClick && 'cursor-pointer',
                  )}
                  onClick={
                    onRowClick
                      ? (e) => {
                          if (e.target.closest('button, a, input, label')) return
                          onRowClick({ row: row.original, id: row.id })
                        }
                      : undefined
                  }
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

      {!hideFooter && !noResults && hasRows ? (
        <div className="cx-data-grid-footer shrink-0 px-3 py-1.5">
          <TablePaginationBar
            compact
            variant="brand"
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
                  {checkboxSelection && Object.keys(rowSelection).length > 0 ? (
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
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
                <span className="hidden sm:inline">Rows per page</span>
                <Select
                  className="h-[1.6875rem] w-[4rem] rounded-md px-1.5 text-[11px]"
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
