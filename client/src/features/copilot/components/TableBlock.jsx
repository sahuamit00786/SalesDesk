import { FileSpreadsheet } from '@/components/ui/icons'

function escapeCsvCell(val) {
  const s = val == null ? '' : String(val)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadTableCsv(filename, columns, rows) {
  const lines = [columns.map((c) => escapeCsvCell(c.label)).join(',')]
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCsvCell(row[c.key])).join(','))
  }
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Lightweight inline table for chat bubbles — DataGrid (search/pagination/CSV)
 * is built for full-page views and is too heavy for a compact chat response.
 * Still offers a one-click CSV export so a copilot answer can leave the chat.
 */
export function TableBlock({ block }) {
  const { title, columns, rows } = block
  const filename = `${(title || 'export').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'export'}.csv`

  return (
    <div className="overflow-hidden rounded-xl border border-surface-border bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-surface-border px-3 py-2">
        <span className="truncate text-xs font-semibold text-ink">{title}</span>
        <button
          type="button"
          onClick={() => downloadTableCsv(filename, columns, rows)}
          disabled={!rows.length}
          title="Export CSV"
          aria-label="Export CSV"
          className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:bg-surface-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden />
          CSV
        </button>
      </div>
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
