export function SavedViewsPanel({ views = [], activeId, onSelect, onCreate }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-surface-border bg-white p-2">
      <button type="button" onClick={() => onSelect(null)} className={`h-8 shrink-0 rounded-lg px-3 text-xs ${!activeId ? 'bg-[var(--brand-primary)] text-white' : 'bg-surface-subtle text-ink-muted'}`}>All</button>
      {views.map((view) => (
        <button key={view.id} type="button" onClick={() => onSelect(view.id)} className={`h-8 shrink-0 rounded-lg px-3 text-xs ${activeId === view.id ? 'bg-[var(--brand-primary)] text-white' : 'bg-surface-subtle text-ink-muted'}`}>
          {view.name}
        </button>
      ))}
      <button type="button" onClick={onCreate} className="h-8 shrink-0 rounded-lg border border-brand-200 bg-white px-3 text-xs text-brand-700">+ New View</button>
    </div>
  )
}
