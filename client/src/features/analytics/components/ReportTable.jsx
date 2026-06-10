export function ReportTable({ columns, rows = [], loading = false, emptyText = 'No data', maxHeightClass }) {
  return (
    <div className={maxHeightClass ? `overflow-auto rounded-xl border border-surface-border ${maxHeightClass}` : 'overflow-x-auto rounded-xl border border-surface-border'}>
      <table className="min-w-full divide-y divide-surface-border text-sm">
        <thead className="bg-surface-subtle">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border bg-white">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-surface-subtle" />
                  </td>
                ))}
              </tr>
            ))
          ) : !rows.length ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-ink-muted">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id ?? i} className="hover:bg-surface-subtle/50">
                {columns.map((col) => (
                  <td key={col.key} className="whitespace-nowrap px-4 py-3 text-ink-muted">
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
