import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PhoneField } from '@/components/ui/PhoneField'
import { cn } from '@/utils/cn'
import { validateCustomFieldsForm } from '@/features/leads/customFieldTypes'

export { mapCustomFieldValuesFromLead, validateCustomFieldsForm } from '@/features/leads/customFieldTypes'

function FieldLabel({ field, error }) {
  return (
    <label className="text-xs font-semibold text-ink-muted">
      {field.label}
      {field.isRequired ? <span className="text-danger"> *</span> : null}
      {error ? <span className="mt-0.5 block text-[11px] font-normal text-danger">{error}</span> : null}
    </label>
  )
}

function MultiselectInput({ field, fieldValue, onChange }) {
  const selected = Array.isArray(fieldValue) ? fieldValue : []
  const options = field.options || []
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const checked = selected.includes(opt)
        return (
          <label
            key={opt}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs',
              checked ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-surface-border bg-white text-ink-muted',
            )}
          >
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-surface-border text-brand-600"
              checked={checked}
              onChange={(e) => {
                const next = e.target.checked ? [...selected, opt] : selected.filter((x) => x !== opt)
                onChange(next)
              }}
            />
            {opt}
          </label>
        )
      })}
    </div>
  )
}

function CustomFieldInput({ field, fieldValue, onChange, compact }) {
  const controlClass = compact ? 'h-8 text-xs' : 'h-10 text-sm'

  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          className={cn(
            'w-full rounded-xl border border-surface-border px-3.5 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none',
            compact ? 'min-h-20 text-xs' : 'min-h-24 text-sm',
          )}
          value={fieldValue ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'dropdown':
      return (
        <Select className={controlClass} value={fieldValue ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      )
    case 'radio':
      return (
        <div className="flex flex-wrap gap-3">
          {(field.options || []).map((opt) => (
            <label key={opt} className="inline-flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name={`cf-${field.id || field.key}`}
                checked={fieldValue === opt}
                onChange={() => onChange(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      )
    case 'multiselect':
      return <MultiselectInput field={field} fieldValue={fieldValue} onChange={onChange} />
    case 'checkbox':
      return (
        <label className="inline-flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-surface-border text-brand-600"
            checked={Boolean(fieldValue)}
            onChange={(e) => onChange(e.target.checked)}
          />
          Yes
        </label>
      )
    case 'number':
      return (
        <Input
          className={controlClass}
          type="number"
          value={fieldValue ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'email':
      return (
        <Input
          className={controlClass}
          type="email"
          value={fieldValue ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'url':
      return (
        <Input
          className={controlClass}
          type="url"
          placeholder="https://"
          value={fieldValue ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'date':
      return (
        <Input
          className={controlClass}
          type="date"
          value={fieldValue ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'phone':
      return (
        <PhoneField
          compact={compact}
          mode="e164"
          defaultCountry="IN"
          value={fieldValue || ''}
          onChange={(v) => onChange(v || '')}
        />
      )
    default:
      return (
        <Input
          className={controlClass}
          type="text"
          value={fieldValue ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

export function CustomFieldsForm({
  fields = [],
  value = {},
  onChange,
  errors = null,
  showErrors = false,
  title = 'Additional info',
  embedded = false,
  compact = false,
}) {
  if (!fields.length) return null

  const validationErrors = showErrors ? errors || validateCustomFieldsForm(fields, value) : errors || {}

  const content = (
    <div className={cn('space-y-3', !embedded && 'rounded-2xl border border-surface-border p-4')}>
      {title ? (
        <p className={cn('font-semibold text-ink', compact ? 'text-xs uppercase tracking-wide text-ink-faint' : 'text-sm')}>
          {title}
        </p>
      ) : null}
      {fields.map((field) => {
        const fieldValue = value[field.key]
        const error = validationErrors[field.key]
        return (
          <div key={field.id || field.key} className="space-y-1">
            <FieldLabel field={field} error={error} />
            <CustomFieldInput
              field={field}
              fieldValue={fieldValue}
              compact={compact}
              onChange={(next) => onChange?.({ ...value, [field.key]: next })}
            />
          </div>
        )
      })}
    </div>
  )

  return content
}
