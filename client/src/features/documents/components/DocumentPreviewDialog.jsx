import { useEffect, useState } from 'react'
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { formatSize, getDocumentKind, getFileUrl } from '@/features/documents/documentUtils'

/**
 * Full-screen document preview (image zoom + iframe for PDF/other), same shell as Documents workspace.
 * `document` shape matches library rows: { name, filePath, fileSize?, uploader? }.
 */
export function DocumentPreviewDialog({ document: doc, onClose, zOverlayClass = 'z-[120]', zPanelClass = 'z-[121]' }) {
  const [imageZoom, setImageZoom] = useState(1)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset zoom when switching document
    setImageZoom(1)
  }, [doc?.id, doc?.filePath])

  if (!doc?.filePath) return null

  return (
    <div className={`fixed inset-0 ${zOverlayClass} flex items-center justify-center p-4`}>
      <button type="button" onClick={onClose} className="absolute inset-0 bg-ink/60 backdrop-blur-[2px]" aria-label="Close preview" />
      <div
        className={`relative ${zPanelClass} flex h-[90dvh] w-[min(96vw,1100px)] flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{doc.name}</p>
            <p className="text-xs text-ink-muted">
              {formatSize(doc.fileSize)} • {doc.uploader?.name || doc.uploader?.email || '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getDocumentKind(doc) === 'image' ? (
              <>
                <button
                  type="button"
                  onClick={() => setImageZoom((z) => Math.max(0.5, Number((z - 0.2).toFixed(2))))}
                  className="rounded-lg border border-surface-border p-2 hover:bg-surface-muted"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4 text-ink-muted" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageZoom(1)}
                  className="rounded-lg border border-surface-border p-2 hover:bg-surface-muted"
                  aria-label="Reset zoom"
                >
                  <RotateCcw className="h-4 w-4 text-ink-muted" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageZoom((z) => Math.min(4, Number((z + 0.2).toFixed(2))))}
                  className="rounded-lg border border-surface-border p-2 hover:bg-surface-muted"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4 text-ink-muted" />
                </button>
              </>
            ) : null}
            <a
              href={getFileUrl(doc.filePath)}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-surface-border px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-muted"
            >
              Open original
            </a>
            <button type="button" onClick={onClose} className="rounded-lg border border-surface-border p-2 hover:bg-surface-muted" aria-label="Close">
              <X className="h-4 w-4 text-ink-muted" />
            </button>
          </div>
        </div>
        <div className="scrollbar-subtle min-h-0 flex-1 overflow-auto bg-surface-muted p-4">
          {getDocumentKind(doc) === 'image' ? (
            <div className="flex min-h-full items-center justify-center">
              <img
                src={getFileUrl(doc.filePath)}
                alt={doc.name}
                className="max-h-none max-w-none rounded-lg border border-surface-border bg-white shadow-sm"
                style={{ transform: `scale(${imageZoom})`, transformOrigin: 'center center' }}
              />
            </div>
          ) : (
            <div className="h-full min-h-[70vh] overflow-auto rounded-lg border border-surface-border bg-white">
              <iframe src={getFileUrl(doc.filePath)} title={doc.name} className="h-full min-h-[70vh] w-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
