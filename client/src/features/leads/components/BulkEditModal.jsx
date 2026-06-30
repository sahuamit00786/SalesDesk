import { useMemo, useState } from 'react'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { STATUS_OPTIONS } from '@/features/leads/constants'

function capitalize(s) {
  return String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}


function getFieldDefs(isOpportunities) {
  const shared = [
    { key: 'sourceId', label: 'Source', type: 'source' },
    { key: 'value', label: 'Deal value', type: 'number' },
    { key: 'country', label: 'Country', type: 'text' },
    { key: 'city', label: 'City', type: 'text' },
    { key: 'state', label: 'State / region', type: 'text' },
  ]
  if (isOpportunities) {
    return [
      { key: 'opportunityStatus', label: 'Opportunity status', type: 'oppStatus' },
      ...shared,
    ]
  }
  return [
    { key: 'status', label: 'Lead status', type: 'select' },
    ...shared,
    { key: 'isOpportunity', label: 'Convert to opportunity', type: 'convert' },
  ]
}

export function BulkEditModal({ open, onClose, count, sources, opportunityStatuses, onSubmit, submitting, isOpportunities }) {
  const [enabled, setEnabled] = useState({})
  const [values, setValues] = useState({})
  const fields = useMemo(() => getFieldDefs(isOpportunities), [isOpportunities])
  const entitySingle = isOpportunities ? 'opportunity' : 'lead'
  const entityPlural = isOpportunities ? 'opportunities' : 'leads'

  function toggle(key) {
    setEnabled((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      if (!next[key]) setValues((v) => { const c = { ...v }; delete c[key]; return c })
      return next
    })
  }
  function set(key, val) { setValues((prev) => ({ ...prev, [key]: val })) }

  function handleSubmit() {
    const patch = {}
    for (const key of Object.keys(enabled)) {
      if (!enabled[key]) continue
      if (key === 'isOpportunity') {
        patch.isOpportunity = true
      } else if (values[key] !== undefined && values[key] !== '') {
        patch[key] = key === 'value' ? Number(values[key]) : values[key]
      }
    }
    if (!Object.keys(patch).length) return
    onSubmit(patch)
  }

  function handleClose() { setEnabled({}); setValues({}); onClose() }

  const hasSelection = Object.values(enabled).some(Boolean)
  const selectCls = 'w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none'
  const inputCls = selectCls

  return (
    <RightDrawer
      open={open}
      onClose={handleClose}
      title={`Bulk edit ${count} ${count === 1 ? entitySingle : entityPlural}`}
      description="Check the fields you want to update. Unchecked fields are left unchanged."
      footer={
        <div className="flex w-full justify-end gap-2">
          <button type="button" onClick={handleClose} className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink-muted hover:bg-surface-subtle">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={!hasSelection || submitting} className="h-10 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-primary-dark)] disabled:opacity-50">
            {submitting ? 'Saving...' : `Update ${count} ${count === 1 ? entitySingle : entityPlural}`}
          </button>
        </div>
      }
    >
      <div className="space-y-3 pb-2">
        {fields.map((field) => (
          <div key={field.key} className={`rounded-xl border p-3 transition-colors ${enabled[field.key] ? 'border-brand-300 bg-brand-50/40' : 'border-surface-border bg-white'}`}>
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300 accent-[var(--brand-primary)]" checked={Boolean(enabled[field.key])} onChange={() => toggle(field.key)} />
              <span className="text-sm font-medium text-ink">{field.label}</span>
            </label>
            {enabled[field.key] ? (
              <div className="mt-2.5 pl-7">
                {field.type === 'select' && (
                  <select className={selectCls} value={values[field.key] || ''} onChange={(e) => set(field.key, e.target.value)}>
                    <option value="">-- choose status --</option>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
                  </select>
                )}
                {field.type === 'oppStatus' && (
                  <select className={selectCls} value={values[field.key] || ''} onChange={(e) => set(field.key, e.target.value)}>
                    <option value="">-- choose opportunity status --</option>
                    {(opportunityStatuses || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
                {field.type === 'source' && (
                  <select className={selectCls} value={values[field.key] || ''} onChange={(e) => set(field.key, e.target.value)}>
                    <option value="">-- choose source --</option>
                    {(sources || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
                {field.type === 'number' && (
                  <input type="number" min={0} step="0.01" placeholder="e.g. 50000" className={inputCls} value={values[field.key] || ''} onChange={(e) => set(field.key, e.target.value)} />
                )}
                {field.type === 'text' && (
                  <input type="text" placeholder={`Enter ${field.label.toLowerCase()}`} className={inputCls} value={values[field.key] || ''} onChange={(e) => set(field.key, e.target.value)} />
                )}
                {field.type === 'convert' && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                    All {count} selected lead{count === 1 ? '' : 's'} will be marked as opportunities. This cannot be undone in bulk.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </RightDrawer>
  )
}
