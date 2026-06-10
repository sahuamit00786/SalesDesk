import { FileText, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatSize, getDocCardPreviewMeta, getFileUrl } from '@/features/documents/documentUtils'

const DOC_CARD_GRID =
  'grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7'

function previewKeyOpen(e, open) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    open()
  }
}

export function DocumentCard({ row, selected, onToggleSelect, onOpen, onEdit, onDelete, showCheckbox = true }) {
  const meta = getDocCardPreviewMeta(row)
  const open = () => onOpen(row)

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border bg-white/95 shadow-sm transition hover:shadow-md sm:rounded-2xl',
        selected ? 'border-sky-200 ring-2 ring-sky-50' : 'border-zinc-100',
      )}
    >
      {showCheckbox ? (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(row.id)}
          className="absolute right-1.5 top-1.5 z-10 h-3.5 w-3.5 rounded border-zinc-200 bg-white/90 shadow-sm sm:right-2 sm:top-2 sm:h-4 sm:w-4"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${row.name}`}
        />
      ) : null}

      <div className="relative w-full shrink-0 overflow-hidden bg-zinc-50">
        <div
          role="button"
          tabIndex={0}
          onClick={open}
          onKeyDown={(e) => previewKeyOpen(e, open)}
          className="aspect-[4/3] w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400/80"
        >
          {meta.mode === 'image' ? (
            <img src={getFileUrl(row.filePath)} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className={cn('flex h-full w-full flex-col items-center justify-center gap-0.5 px-2', meta.blockClass)}>
              <FileText className="h-6 w-6 shrink-0 opacity-70 sm:h-7 sm:w-7" strokeWidth={1.5} />
              <span className="text-[9px] font-semibold uppercase tracking-wide text-zinc-700 sm:text-[10px]">{meta.label}</span>
            </div>
          )}
        </div>

        {/* action buttons row — always visible */}
        <div className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1 sm:bottom-2 sm:right-2">
          {onDelete ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(row) }}
              className="nodrag flex h-5 w-5 items-center justify-center rounded-md border border-red-200 bg-white/95 text-red-500 shadow-sm hover:bg-red-50 sm:h-6 sm:w-6"
              title="Delete"
            >
              <Trash2 size={10} strokeWidth={2} className="sm:h-3 sm:w-3" />
            </button>
          ) : null}
          {onEdit ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(row) }}
              className="nodrag rounded-md border border-surface-border bg-white/95 px-1.5 py-0.5 text-[9px] font-semibold text-ink shadow-sm hover:bg-surface-muted sm:px-2 sm:py-1 sm:text-[10px]"
            >
              Edit
            </button>
          ) : null}
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => previewKeyOpen(e, open)}
        className="flex h-[90px] cursor-pointer flex-col justify-start overflow-hidden px-2 pb-2 pt-1.5 text-left outline-none focus-visible:bg-slate-50/80 sm:px-2.5 sm:pb-2 sm:pt-2"
      >
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-zinc-800">{row.name}</p>
        <p className="mt-0.5 line-clamp-1 text-[10px] text-zinc-400 sm:text-xs">
          {formatSize(row.fileSize)}
          {row.uploader?.name || row.uploader?.email ? ` · ${row.uploader?.name || row.uploader?.email}` : ''}
        </p>
        {row.fileType ? (
          <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-zinc-500 sm:text-[10px]">{row.fileType}</p>
        ) : null}
      </div>
    </div>
  )
}

export { DOC_CARD_GRID }
