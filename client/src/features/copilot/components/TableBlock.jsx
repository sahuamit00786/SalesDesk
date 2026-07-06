/**
 * Lightweight inline table for chat bubbles — DataGrid (search/pagination/CSV)
 * is built for full-page views and is too heavy for a compact chat response.
 */
export function TableBlock({ block }) {
  const { title, columns, rows } = block

  return (
    <div className="overflow-hidden rounded-xl border border-surface-border bg-white">
      {title ? <div className="border-b border-surface-border px-3 py-2 text-xs font-semibold text-ink">{title}</div> : null}
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-surface-50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="whitespace-nowrap px-3 py-2 font-semibold text-ink-muted">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-surface-border/70">
                {columns.map((col) => (
                  <td key={col.key} className="whitespace-nowrap px-3 py-1.5 text-ink">
                    {String(row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
