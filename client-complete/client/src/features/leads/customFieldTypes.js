export const CUSTOM_FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'radio', label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
]

export const OPTION_FIELD_TYPES = new Set(['dropdown', 'multiselect', 'radio'])

export function formatCustomFieldTypeLabel(type) {
  return CUSTOM_FIELD_TYPE_OPTIONS.find((x) => x.value === type)?.label || type
}

export function parseCustomFieldClientValue(type, raw) {
  if (raw === null || raw === undefined || raw === '') {
    if (type === 'checkbox') return false
    if (type === 'multiselect') return []
    return ''
  }
  if (type === 'checkbox') return Boolean(raw)
  if (type === 'multiselect') {
    if (Array.isArray(raw)) return raw
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return String(raw)
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
    }
  }
  if (type === 'number') return Number(raw)
  return raw
}

export function mapCustomFieldValuesFromLead(lead) {
  if (lead?.customFields && typeof lead.customFields === 'object' && !Array.isArray(lead.customFields)) {
    const out = {}
    for (const field of lead.customFieldValues || []) {
      const key = field?.customField?.key
      if (key && Object.prototype.hasOwnProperty.call(lead.customFields, key)) {
        out[key] = parseCustomFieldClientValue(field.customField.type, lead.customFields[key])
      }
    }
    for (const [key, val] of Object.entries(lead.customFields)) {
      if (!Object.prototype.hasOwnProperty.call(out, key)) out[key] = val
    }
    return out
  }
  const out = {}
  for (const row of lead?.customFieldValues || []) {
    const def = row.customField
    if (!def?.key) continue
    out[def.key] = parseCustomFieldClientValue(def.type, row.value)
  }
  return out
}

export function formatCustomFieldDisplayValue(type, value) {
  if (value === null || value === undefined || value === '') return '-'
  if (type === 'checkbox') return value ? 'Yes' : 'No'
  if (type === 'multiselect') {
    const arr = Array.isArray(value) ? value : []
    return arr.length ? arr.join(', ') : '-'
  }
  return String(value)
}

export function validateCustomFieldsForm(fields, values) {
  const errors = {}
  for (const field of fields) {
    if (!field.isRequired) continue
    const raw = values[field.key]
    if (field.type === 'checkbox') continue
    if (field.type === 'multiselect') {
      if (!Array.isArray(raw) || raw.length === 0) errors[field.key] = `${field.label} is required`
      continue
    }
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      errors[field.key] = `${field.label} is required`
    }
  }
  return errors
}
