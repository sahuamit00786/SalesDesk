import { cn } from '@/utils/cn'

/**
 * Same table chrome as LeadsTable: purple cx-data-grid header, text-xs rows, sticky head.
 */
export function LeadSetupTable({
  columns = [],
  rows = [],
  sort,
  onSort,
  renderActions,
  emptyTitle = 'No items found',
  emptyDescription = 'Add one using the button above.',
  minWidthClass = 'min-w-[640px]',
}) {
  const colCount = columns.length + (renderActions ? 1 : 0)

  return (
    <div className="overflow-hidden rounded-none border-0 bg-white">
      <div className="overflow-x-auto">
        <table className={cn('cx-table cx-data-grid text-xs', minWidthClass)}>
          <thead className="cx-table-sticky-head">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'align-middle',
                    col.headerAlign === 'right' && 'text-right',
                    col.headerAlign === 'center' && 'text-center',
                  )}
                >
                  {!col.sortable || !onSort ? (
                    <span className="inline-flex items-center gap-1">{col.label}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSort(col.sortField || col.key)}
                      className="inline-flex items-center gap-1 text-left text-inherit hover:text-brand-100"
                    >
                      {col.label}{' '}
                      <span className="opacity-40">
                        {sort?.field === (col.sortField || col.key)
                          ? sort.order === 'asc'
                            ? '↑'
                            : '↓'
                          : '↕'}
                      </span>
                    </button>
                  )}
                </th>
              ))}
              {renderActions ? (
                <th className="cx-table-cell-actions text-right align-middle">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="py-10 text-center align-middle">
                  <p className="text-sm font-medium text-ink">{emptyTitle}</p>
                  <p className="mt-1 text-xs text-ink-muted">{emptyDescription}</p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="group">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                      )}
                    >
                      {col.renderCell ? col.renderCell(row) : col.accessor ? col.accessor(row) : row[col.key]}
                    </td>
                  ))}
                  {renderActions ? (
                    <td className="cx-table-cell-actions align-middle text-right">{renderActions(row)}</td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
