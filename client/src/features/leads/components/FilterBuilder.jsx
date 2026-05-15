import { RightDrawer } from '@/components/ui/RightDrawer'
import { Input, inputFieldClassName } from '@/components/ui/Input'
import { cn } from '@/utils/cn'
import { SOURCE_OPTIONS, STATUS_OPTIONS } from '@/features/leads/constants'

/** @param {{ workspaceOptions?: { id: string, name: string }[] | null }} props */
export function FilterBuilder({ open, onClose, filters, onChange, onApply, onReset, workspaceOptions = null }) {
  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title="Filters"
      description="Refine your lead list."
      className="sm:max-w-[360px]"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="h-10 rounded-xl border border-surface-border px-5" onClick={onReset}>Reset</button>
          <button type="button" className="h-10 rounded-xl bg-brand-600 px-5 text-white" onClick={onApply}>Apply</button>
        </div>
      }
    >
      <div className="space-y-4">
        {workspaceOptions?.length ? (
          <div>
            <p className="mb-2 text-xs font-semibold text-ink-muted">Workspace</p>
            <select
              className={cn(inputFieldClassName, 'cursor-pointer')}
              value={filters.workspaceId || ''}
              onChange={(e) => onChange({ workspaceId: e.target.value })}
              aria-label="Filter by workspace"
            >
              <option value="">All workspaces</option>
              {workspaceOptions.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name || w.id}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <Input placeholder="Search leads..." value={filters.search || ''} onChange={(e) => onChange({ search: e.target.value })} />
        <div>
          <p className="mb-2 text-xs font-semibold text-ink-muted">Status</p>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((status) => (
              <label key={status} className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={(filters.status || []).includes(status)} onChange={(e) => onChange({ status: e.target.checked ? [...(filters.status || []), status] : (filters.status || []).filter((x) => x !== status) })} />
                <span className="capitalize">{status}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-ink-muted">Source</p>
          <div className="grid grid-cols-2 gap-2">
            {SOURCE_OPTIONS.map((source) => (
              <label key={source} className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={(filters.source || []).includes(source)} onChange={(e) => onChange({ source: e.target.checked ? [...(filters.source || []), source] : (filters.source || []).filter((x) => x !== source) })} />
                <span>{source}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </RightDrawer>
  )
}
