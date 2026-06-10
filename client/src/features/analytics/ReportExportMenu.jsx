import { useState, useRef } from 'react'
import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react'
import { cn } from '@/utils/cn'

export function ReportExportMenu({ onExportXlsx, onExportPdf, label = 'Export' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  if (!onExportXlsx && !onExportPdf) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex h-10 items-center gap-2 rounded-xl border border-surface-border bg-white px-3 text-sm font-medium text-ink hover:bg-surface-subtle"
      >
        <Download className="h-4 w-4 text-ink-muted" />
        {label}
        <ChevronDown className="h-3.5 w-3.5 text-ink-muted" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-surface-border bg-white py-1 shadow-lg">
            {onExportXlsx && (
              <button
                type="button"
                onClick={() => { onExportXlsx(); setOpen(false) }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-surface-subtle"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Excel (.xlsx)
              </button>
            )}
            {onExportPdf && (
              <button
                type="button"
                onClick={() => { onExportPdf(); setOpen(false) }}
                className={cn('flex w-full items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-surface-subtle')}
              >
                <FileText className="h-4 w-4 text-rose-600" />
                PDF
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
