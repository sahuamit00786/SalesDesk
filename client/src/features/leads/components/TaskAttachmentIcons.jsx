import { useMemo, useState } from 'react'
import { Paperclip } from 'lucide-react'
import { cn } from '@/utils/cn'
import { DocumentPreviewDialog } from '@/features/documents/components/DocumentPreviewDialog'
import { getDocCardPreviewMeta, getTaskPreviewDocuments } from '@/features/documents/documentUtils'

/**
 * Compact attachment affordances for task rows (mail-style chips). Click opens the same preview shell as Documents.
 * Clicks do not bubble — use inside clickable cards.
 */
export function TaskAttachmentIcons({ attachments, className, variant = 'default' }) {
  const docs = useMemo(() => getTaskPreviewDocuments({ attachments }), [attachments])
  const [preview, setPreview] = useState(null)

  if (!docs.length) return null

  const compact = variant === 'compact'

  return (
    <>
      <div
        className={cn('flex flex-wrap items-center gap-1', className)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        {docs.map((row) => {
          const meta = getDocCardPreviewMeta(row)
          return (
            <button
              key={row.id}
              type="button"
              title={row.name}
              aria-label={`Open attachment ${row.name}`}
              onClick={() => setPreview(row)}
              className={cn(
                'inline-flex max-w-[10rem] items-center gap-1 rounded-lg border border-slate-200 bg-white text-left shadow-sm transition hover:border-brand-300 hover:bg-slate-50',
                compact ? 'px-1 py-0.5' : 'px-1.5 py-0.5',
              )}
            >
              <span
                className={cn(
                  'shrink-0 rounded px-1 py-0.5 font-bold uppercase leading-none ring-1 ring-slate-200/80',
                  compact ? 'text-[8px]' : 'text-[9px]',
                  meta.mode === 'image' ? 'bg-sky-50 text-sky-800' : meta.blockClass || 'bg-zinc-100 text-zinc-700',
                )}
              >
                {meta.label}
              </span>
              <Paperclip className={cn('shrink-0 text-slate-400', compact ? 'h-2.5 w-2.5' : 'h-3 w-3')} aria-hidden />
              <span className={cn('min-w-0 truncate font-medium text-slate-700', compact ? 'text-[9px]' : 'text-[10px]')}>
                {row.name}
              </span>
            </button>
          )
        })}
      </div>
      <DocumentPreviewDialog document={preview} onClose={() => setPreview(null)} zOverlayClass="z-[140]" zPanelClass="z-[141]" />
    </>
  )
}
