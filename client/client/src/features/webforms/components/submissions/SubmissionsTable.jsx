export function SubmissionsTable({ rows = [] }) {
  return (
    <div className="rounded-2xl border border-surface-border bg-white p-4">
      <p className="mb-2 text-sm font-semibold text-ink">Submissions</p>
      {rows.length ? rows.map((row) => <div key={row.id} className="border-b border-surface-border py-2 text-xs text-ink-muted">{row.id}</div>) : <p className="text-xs text-ink-muted">No submissions yet.</p>}
    </div>
  )
}
