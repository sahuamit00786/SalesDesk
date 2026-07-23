import { Download, Mail, Pencil, Trash2, UserCog } from '@/components/ui/icons'
import { usePermission } from '@/hooks/usePermission'

export function BulkActionsBar({
  count,
  onBulkEmail,
  onAssign,
  onEdit,
  onExport,
  onDelete,
  onClear,
  pageCount = 0,
  total = 0,
  onSelectAll,
  selectingAll = false,
  entityLabel = 'records',
  menu = 'main.leads',
}) {
  const canCreate = usePermission(menu, 'create')
  const canUpdate = usePermission(menu, 'update')
  const canView = usePermission(menu, 'view')
  const canDelete = usePermission(menu, 'delete')

  if (!count) return null
  const canSelectAll = onSelectAll && count === pageCount && total > pageCount
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-3">
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-white shadow-2xl">
        <span className="text-sm font-medium">{count} selected</span>
        {canSelectAll ? (
          <button
            type="button"
            onClick={onSelectAll}
            disabled={selectingAll}
            className="inline-flex h-8 items-center gap-1 rounded-xl bg-white/10 px-3 text-xs font-semibold text-brand-200 hover:bg-white/15 disabled:opacity-60"
          >
            {selectingAll ? 'Selecting…' : `Select all ${total} ${entityLabel}`}
          </button>
        ) : null}
        {canCreate ? (
          <button
            type="button"
            onClick={onBulkEmail}
            className="inline-flex h-8 items-center gap-1 rounded-xl bg-[var(--brand-primary)] px-3 text-xs font-semibold cx-icon-inherit text-white hover:bg-[var(--brand-primary-dark)]"
          >
            <Mail className="h-3.5 w-3.5" />
            Bulk email
          </button>
        ) : null}
        {canUpdate ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-8 items-center gap-1 rounded-xl bg-white/10 px-3 text-xs hover:bg-white/15"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        ) : null}
        {canUpdate ? (
          <button
            type="button"
            onClick={onAssign}
            className="inline-flex h-8 items-center gap-1 rounded-xl bg-white/10 px-3 text-xs hover:bg-white/15"
          >
            <UserCog className="h-3.5 w-3.5" />
            Assign
          </button>
        ) : null}
        {canView ? (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex h-8 items-center gap-1 rounded-xl bg-white/10 px-3 text-xs hover:bg-white/15"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-8 items-center gap-1 rounded-xl bg-red-500/20 px-3 text-xs text-red-200 hover:bg-red-500/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        ) : null}
        <button type="button" onClick={onClear} className="h-8 rounded-xl bg-white/10 px-3 text-xs hover:bg-white/15">
          Clear
        </button>
      </div>
    </div>
  )
}
