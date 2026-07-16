import { CheckCircle2 } from '@/components/ui/icons'
import { Button } from '@/components/ui/Button'

export function BulkApproveBar({ selectedCount, onApprove, busy }) {
  if (!selectedCount) return null
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200/70 bg-gradient-to-r from-brand-50 to-white px-4 py-3.5 shadow-sm ring-1 ring-brand-500/10">
      <p className="flex items-center gap-2 text-sm font-medium text-brand-900">
        <CheckCircle2 className="h-4 w-4 text-brand-600" aria-hidden />
        {selectedCount} request{selectedCount === 1 ? '' : 's'} selected
      </p>
      <Button type="button" className="!h-9 shrink-0" disabled={busy} onClick={onApprove}>
        {busy ? 'Approving…' : 'Bulk approve'}
      </Button>
    </div>
  )
}
