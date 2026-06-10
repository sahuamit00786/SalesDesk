import { useState } from 'react'
import { RightDrawer } from '@/components/ui/RightDrawer'

export function ImportWizard({ open, onClose, onImport }) {
  const [rowsText, setRowsText] = useState('')
  const [busy, setBusy] = useState(false)
  const rows = rowsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [contactName, company, email, phone, value] = line.split(',').map((v) => v?.trim())
      return { title: contactName || email || 'Imported lead', contactName, company, email, phone, value: Number(value || 0), source: 'csv_import' }
    })

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title="Import Leads"
      description="Paste CSV rows: name, company, email, phone, value"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-surface-border px-5">Close</button>
          <button
            type="button"
            className="h-10 rounded-xl bg-[var(--brand-primary)] px-5 text-white"
            disabled={busy || !rows.length}
            onClick={async () => {
              setBusy(true)
              await onImport?.(rows)
              setBusy(false)
              onClose?.()
            }}
          >
            {busy ? 'Importing...' : `Import ${rows.length} Leads`}
          </button>
        </div>
      }
    >
      <textarea className="min-h-[320px] w-full rounded-xl border border-surface-border p-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" value={rowsText} onChange={(e) => setRowsText(e.target.value)} />
    </RightDrawer>
  )
}
