/** Canonical merge fields for CRM email templates (UI + preview). */
export const LEAD_MERGE_FIELDS = [
  'first_name',
  'last_name',
  'contact_name',
  'name',
  'company',
  'designation',
  'email',
  'phone',
  'value',
  'source',
  'status',
  'city',
  'state',
  'country',
  'street',
  'postal_code',
  'title',
  'sender_name',
]

export const SAMPLE_PREVIEW_VALUES = {
  first_name: 'Amit',
  last_name: 'Sahu',
  contact_name: 'Amit Sahu',
  name: 'Amit Sahu',
  company: 'Connexify Labs',
  designation: 'Founder',
  email: 'amit@connexify.io',
  phone: '+91 98765 43210',
  value: '₹12,000',
  source: 'cold_email',
  status: 'qualified',
  city: 'Bengaluru',
  state: 'Karnataka',
  country: 'India',
  street: 'MG Road',
  postal_code: '560001',
  title: 'Enterprise SaaS lead',
  sender_name: 'Sales Team',
}

const FIELD_SET = new Set(LEAD_MERGE_FIELDS)

/** Token inserted when user picks a variable (@ style). */
export function mergeTagToken(field) {
  return `@${field}`
}

/**
 * Replace @field and {{field}} placeholders (known fields only for @).
 */
export function fillMergeTags(input, values = {}) {
  let out = String(input || '')
  out = out.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) =>
    values[key] != null ? String(values[key]) : '',
  )
  out = out.replace(/@([a-z][a-z0-9_]*)/gi, (match, key) => {
    const k = String(key || '').toLowerCase()
    if (!FIELD_SET.has(k)) return match
    return values[k] != null ? String(values[k]) : ''
  })
  return out
}
