import { AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { LeadStatusBadge } from '@/features/leads/components/LeadStatusBadge'
import { LeadScorePill } from '@/features/leads/components/LeadScorePill'

function formatPhone(lead) {
  const code = lead?.phoneCountryCode || ''
  const phone = lead?.phone || ''
  return `${code ? `${code} ` : ''}${phone}`.trim() || '-'
}

export function DuplicateWarning({ open, duplicates = [], attemptedPhone = '', onCancel, onViewLead }) {
  const top = duplicates[0]
  const attempted = attemptedPhone || formatPhone(top)
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Duplicate Lead Found"
      footer={
        <>
          <button type="button" onClick={onCancel} className="h-10 rounded-xl border border-surface-border px-4 text-sm">Cancel</button>
          {top ? (
            <button type="button" onClick={() => onViewLead?.(top)} className="h-10 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white">
              View lead information
            </button>
          ) : null}
        </>
      }
    >
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          <span>
            A lead with {attempted} already exists. You cannot create a duplicate.
          </span>
        </div>
        <p className="text-xs text-ink-muted">
          If you want to add anything, you can add it in this existing lead.
        </p>
        {top ? (
          <div className="rounded-xl border border-surface-border p-3">
            <p className="text-sm font-semibold text-ink">{top.contactName || top.title} · {top.company || 'No company'}</p>
            <p className="mt-1 text-xs text-ink-muted">{top.email || '-'} · {formatPhone(top)}</p>
            <div className="mt-2 flex items-center gap-2"><LeadScorePill score={top.score || 0} /><LeadStatusBadge status={top.status} /></div>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
