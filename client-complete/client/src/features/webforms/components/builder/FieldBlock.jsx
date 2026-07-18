import { Copy, Trash2 } from '@/components/ui/icons'
import { DragHandle } from './DragHandle'

export function FieldBlock({ field, selected, onSelect, onDelete, onDuplicate, dragListeners, dragAttributes }) {
  return (
    <div
      className={`group rounded-xl border bg-white p-3 ${selected ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-surface-border hover:border-brand-300'}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className="flex items-center gap-2">
        <DragHandle {...dragListeners} {...dragAttributes} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{field.label || `Untitled ${field.type}`}</p>
          <p className="truncate text-xs text-ink-muted">{field.type}</p>
        </div>
        <button type="button" className="hidden h-8 w-8 items-center justify-center rounded-lg border border-surface-border text-ink-muted group-hover:inline-flex" onClick={(e) => { e.stopPropagation(); onDuplicate() }}>
          <Copy className="h-4 w-4" />
        </button>
        <button type="button" className="hidden h-8 w-8 items-center justify-center rounded-lg border border-surface-border text-ink-muted group-hover:inline-flex" onClick={(e) => { e.stopPropagation(); onDelete() }}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
