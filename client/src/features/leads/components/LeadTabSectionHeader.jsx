/**
 * Shared heading row for lead / opportunity detail tabs (title + subtitle + optional actions).
 */
export function LeadTabSectionHeader({ title, description, action = null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description ? <p className="text-xs text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{action}</div> : null}
    </div>
  )
}

/** Dashed empty panel used when a tab has no rows yet (same shell everywhere). */
export function LeadTabEmptyState({ icon: Icon, title, description, action = null }) {
  return (
    <div className="rounded-2xl border border-dashed border-surface-border bg-slate-50/60 px-6 py-12 text-center">
      {Icon ? <Icon className="mx-auto h-10 w-10 text-brand-300" aria-hidden /> : null}
      <p className="mt-3 text-sm font-medium text-ink">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-md text-xs text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  )
}
