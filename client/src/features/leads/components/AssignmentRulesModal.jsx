import { RightDrawer } from '@/components/ui/RightDrawer'
import { Input } from '@/components/ui/Input'

export function AssignmentRulesModal({ open, onClose, rules = [], draftRule, onDraftRuleChange, onSaveRule, onDeleteRule }) {
  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title="Assignment Rules"
      description="Auto-assign leads by priority and condition."
      footer={<button type="button" onClick={onClose} className="h-10 rounded-xl border border-surface-border px-5">Close</button>}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-surface-border p-4">
          <p className="text-sm font-semibold">Add Rule</p>
          <div className="mt-3 space-y-3">
            <Input placeholder="Rule name" value={draftRule.name} onChange={(e) => onDraftRuleChange({ ...draftRule, name: e.target.value })} />
            <select className="h-10 w-full rounded-xl border border-surface-border px-3.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" value={draftRule.type} onChange={(e) => onDraftRuleChange({ ...draftRule, type: e.target.value })}>
              <option value="round_robin">Round Robin</option>
              <option value="territory">By Territory</option>
              <option value="tag">By Tag</option>
              <option value="capacity">By Capacity</option>
            </select>
            <button type="button" onClick={onSaveRule} className="h-10 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold text-white">Save Rule</button>
          </div>
        </div>
        {rules.map((rule) => (
          <div key={rule.id} className="rounded-xl border border-surface-border p-3">
            <p className="text-sm font-semibold text-ink">{rule.name}</p>
            <p className="text-xs text-ink-muted">{rule.type} · Priority {rule.priority}</p>
            <button type="button" onClick={() => onDeleteRule(rule.id)} className="mt-2 text-xs text-danger">Delete</button>
          </div>
        ))}
      </div>
    </RightDrawer>
  )
}
