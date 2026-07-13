import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { ChevronDown, Download, FileSpreadsheet, FileText, Printer } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'

export function ReportExportMenu({ onExportXlsx, onExportPdf, onPrint, label = 'Export', disabled = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  if (!onExportXlsx && !onExportPdf && !onPrint) return null

  async function runExport(fn, successLabel) {
    setOpen(false)
    try {
      await fn()
      toast.success(`${successLabel} ready`)
    } catch {
      toast.error(`Could not export ${successLabel.toLowerCase()}`)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="secondary"
        className="h-10 gap-2 px-3"
        onClick={() => setOpen((p) => !p)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Download className="h-4 w-4 text-ink-muted" aria-hidden />
        {label}
        <ChevronDown className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-surface-border bg-white py-1 shadow-lg">
            {onExportXlsx && (
              <button
                type="button"
                onClick={() => runExport(onExportXlsx, 'Excel export')}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-surface-subtle"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" aria-hidden />
                Excel (.xlsx)
              </button>
            )}
            {onExportPdf && (
              <button
                type="button"
                onClick={() => runExport(onExportPdf, 'PDF export')}
                className={cn('flex w-full items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-surface-subtle')}
              >
                <FileText className="h-4 w-4 text-rose-600" aria-hidden />
                PDF
              </button>
            )}
            {onPrint && (
              <button
                type="button"
                onClick={() => { setOpen(false); onPrint() }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-surface-subtle"
              >
                <Printer className="h-4 w-4 text-brand-600" aria-hidden />
                Print
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
