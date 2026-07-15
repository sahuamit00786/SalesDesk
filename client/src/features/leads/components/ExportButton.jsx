import { Download } from '@/components/ui/icons'

export function ExportButton({ onExportCurrent, onExportSelected, onExportAll, selectedCount = 0 }) {
  return (
    <div className="inline-flex min-w-max items-center gap-2">
      {onExportCurrent ? (
        <button type="button" onClick={onExportCurrent} className="inline-flex h-9 items-center gap-2 rounded-lg border border-surface-border bg-white px-4 text-sm">
          <Download className="h-3.5 w-3.5" /> Export current view
        </button>
      ) : null}
      {selectedCount > 0 ? <button type="button" onClick={onExportSelected} className="h-9 rounded-lg border border-surface-border bg-white px-4 text-sm">Export selected ({selectedCount})</button> : null}
      <button type="button" onClick={onExportAll} className="h-9 rounded-lg border border-surface-border bg-white px-4 text-sm">Export all</button>
    </div>
  )
}
