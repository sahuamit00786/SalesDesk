import { UserCog } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { coerceToLeadArray, formatLeadAssignees, leadListLabel } from '@/features/leads/utils/leadAssignee'

export function BulkAssignModal({
  open,
  onClose,
  leads,
  users = [],
  assignUserIds = [],
  onAssignUserIdsChange,
  onSubmit,
  submitting = false,
}) {
  const leadRows = coerceToLeadArray(leads)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign selected"
      description={`Choose teammates for ${leadRows.length} record(s). Current owners are shown below.`}
      maxWidthClassName="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={submitting || !assignUserIds.length}>
            {submitting ? 'Assigning…' : 'Assign'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-xl border border-surface-border bg-surface-subtle/60">
          <div className="flex items-center gap-2 border-b border-surface-border px-3 py-2">
            <UserCog className="h-4 w-4 text-brand-600" />
            <span className="text-xs font-semibold text-ink">Current assignment</span>
          </div>
          <ul className="max-h-40 overflow-y-auto px-2 py-2 scrollbar-subtle">
            {leadRows.map((lead) => (
              <li
                key={lead.id}
                className="flex items-start justify-between gap-3 rounded-lg px-2 py-1.5 text-xs"
              >
                <span className="min-w-0 truncate font-medium text-ink">{leadListLabel(lead)}</span>
                <span className="shrink-0 text-right text-ink-muted">{formatLeadAssignees(lead)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-ink">Assign to</p>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-surface-border p-2 scrollbar-subtle">
            {users.map((user) => {
              const checked = assignUserIds.includes(user.id)
              return (
                <label
                  key={user.id}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-slate-50"
                >
                  <span className="min-w-0">
                    <p className="truncate text-sm text-ink">{user.name || 'Unnamed user'}</p>
                    <p className="truncate text-xs text-ink-muted">{user.email}</p>
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      onAssignUserIdsChange((prev) =>
                        e.target.checked ? [...prev, user.id] : prev.filter((id) => id !== user.id),
                      )
                    }}
                  />
                </label>
              )
            })}
            {!users.length ? (
              <p className="px-2 py-3 text-xs text-ink-muted">No users available.</p>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  )
}
