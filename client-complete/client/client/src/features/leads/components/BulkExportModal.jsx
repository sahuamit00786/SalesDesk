import { Download } from '@/components/ui/icons'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { coerceToLeadArray, formatLeadAssignees, leadListLabel } from '@/features/leads/utils/leadAssignee'

export function BulkExportModal({ open, onClose, leads, onExport, exporting = false, entityLabel = 'leads' }) {
  const leadRows = coerceToLeadArray(leads)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Export ${entityLabel}`}
      description={`Download ${leadRows.length} selected record(s) as CSV. Owner shown for each row.`}
      maxWidthClassName="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={exporting}>
            Cancel
          </Button>
          <Button onClick={onExport} disabled={exporting || !leadRows.length}>
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'Exporting…' : 'Download CSV'}
          </Button>
        </>
      }
    >
      <div className="rounded-xl border border-surface-border bg-surface-subtle/60">
        <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-surface-border px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
          <span>{entityLabel === 'opportunities' ? 'Opportunity' : 'Lead'}</span>
          <span>Assigned to</span>
        </div>
        <ul className="max-h-52 overflow-y-auto px-2 py-2 scrollbar-subtle">
          {leadRows.map((lead) => (
            <li
              key={lead.id}
              className="grid grid-cols-[1fr_auto] gap-2 rounded-lg px-2 py-1.5 text-xs"
            >
              <span className="min-w-0 truncate font-medium text-ink">{leadListLabel(lead)}</span>
              <span className="shrink-0 text-right text-ink-muted">{formatLeadAssignees(lead)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}
