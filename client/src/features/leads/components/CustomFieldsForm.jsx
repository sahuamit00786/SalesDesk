import { Input } from '@/components/ui/Input'

export function CustomFieldsForm({ fields = [], value = {}, onChange }) {
  return (
    <div className="space-y-3 rounded-2xl border border-surface-border p-4">
      <p className="text-sm font-semibold text-ink">Additional Info</p>
      {fields.length === 0 ? <p className="text-xs text-ink-faint">No custom fields configured.</p> : null}
      {fields.map((field) => {
        const fieldValue = value[field.key] ?? ''
        return (
          <div key={field.id} className="space-y-1">
            <label className="text-xs font-semibold text-ink-muted">{field.label}</label>
            {field.type === 'dropdown' ? (
              <select className="h-10 w-full rounded-xl border border-surface-border px-3.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none" value={fieldValue} onChange={(e) => onChange?.({ ...value, [field.key]: e.target.value })}>
                <option value="">Select</option>
                {(field.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : field.type === 'checkbox' ? (
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(fieldValue)} onChange={(e) => onChange?.({ ...value, [field.key]: e.target.checked })} /> Yes</label>
            ) : (
              <Input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={fieldValue} onChange={(e) => onChange?.({ ...value, [field.key]: e.target.value })} />
            )}
          </div>
        )
      })}
    </div>
  )
}
