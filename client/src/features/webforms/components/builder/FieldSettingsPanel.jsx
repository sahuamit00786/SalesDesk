const LEAD_CRM_FIELDS = [
  { value: 'lead.contactName', label: 'Lead Name', placeholder: 'Enter full name' },
  { value: 'lead.email', label: 'Email', placeholder: 'Enter email address' },
  { value: 'lead.phone', label: 'Phone', placeholder: 'Enter phone number' },
  { value: 'lead.company', label: 'Company', placeholder: 'Enter company name' },
  { value: 'lead.designation', label: 'Designation', placeholder: 'Enter job title' },
  { value: 'lead.city', label: 'City', placeholder: 'Enter city' },
  { value: 'lead.state', label: 'State', placeholder: 'Enter state' },
  { value: 'lead.country', label: 'Country', placeholder: 'Enter country' },
  { value: 'lead.postalCode', label: 'Postal Code', placeholder: 'Enter postal code' },
  { value: 'lead.status', label: 'Lead Status', placeholder: '' },
  { value: 'lead.source', label: 'Lead Source', placeholder: '' },
  { value: 'lead.value', label: 'Lead Value', placeholder: 'Enter lead value' },
  { value: 'lead.notes', label: 'Notes', placeholder: 'Add notes' },
  { value: 'lead.requirement', label: 'Requirement', placeholder: 'Add requirement' },
]

export function FieldSettingsPanel({ field, onChange }) {
  if (!field) return null
  const mappedLeadField = LEAD_CRM_FIELDS.find((item) => item.value === field.crmField)

  function handleLeadMappingChange(value) {
    const selected = LEAD_CRM_FIELDS.find((item) => item.value === value)
    if (!selected) {
      onChange({ crmField: '' })
      return
    }
    onChange({
      crmField: selected.value,
      label: field.label?.trim() ? field.label : selected.label,
      placeholder: field.placeholder?.trim() ? field.placeholder : selected.placeholder,
    })
  }

  return (
    <div className="space-y-3 rounded-2xl border border-surface-border bg-white p-4">
      <h3 className="text-sm font-semibold text-ink">Field settings</h3>
      <label className="block text-xs text-ink-muted">
        Label
        <input className="mt-1 h-10 w-full rounded-xl border border-surface-border px-3 text-sm" value={field.label || ''} onChange={(e) => onChange({ label: e.target.value })} />
      </label>
      <label className="block text-xs text-ink-muted">
        Placeholder
        <input className="mt-1 h-10 w-full rounded-xl border border-surface-border px-3 text-sm" value={field.placeholder || ''} onChange={(e) => onChange({ placeholder: e.target.value })} />
      </label>
      <label className="flex items-center gap-2 text-xs text-ink-muted">
        <input type="checkbox" checked={Boolean(field.isRequired)} onChange={(e) => onChange({ isRequired: e.target.checked })} />
        Required field
      </label>
      <label className="block text-xs text-ink-muted">
        CRM mapping (Lead fields)
        <select
          className="mt-1 h-10 w-full rounded-xl border border-surface-border px-3 text-sm"
          value={mappedLeadField ? mappedLeadField.value : ''}
          onChange={(e) => handleLeadMappingChange(e.target.value)}
        >
          <option value="">Select lead field</option>
          {LEAD_CRM_FIELDS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-ink-muted">
        Custom CRM key (optional)
        <input
          className="mt-1 h-10 w-full rounded-xl border border-surface-border px-3 text-sm"
          value={field.crmField || ''}
          placeholder="custom.budget_range"
          onChange={(e) => onChange({ crmField: e.target.value })}
        />
      </label>
    </div>
  )
}
