/** Client-side lead merge map (mirrors server emailTemplateService.leadTokenMap). */

function splitName(contactName) {
  const parts = String(contactName || '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  }
}

function formatLeadValue(lead) {
  if (lead?.value == null || lead?.value === '') return ''
  const num = Number(lead.value)
  if (Number.isNaN(num)) return String(lead.value)
  const currency = String(lead.valueCurrency || lead.value_currency || 'INR').toUpperCase()
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(num)
  } catch {
    return String(num)
  }
}

function formatPhone(lead) {
  const code = String(lead.phoneCountryCode || lead.phone_country_code || '').trim()
  const phone = String(lead.phone || '').trim()
  if (!phone) return ''
  if (code && !phone.startsWith('+')) return `${code} ${phone}`.trim()
  return phone
}

function humanizeEnum(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

export function buildLeadMergeValues(lead = {}, senderName = '') {
  const split = splitName(lead.contactName || lead.name || lead.title || '')
  const contactName =
    String(lead.contactName || lead.contact_name || '').trim() ||
    (split.firstName ? `${split.firstName}${split.lastName ? ` ${split.lastName}` : ''}`.trim() : '')

  const formattedValue = formatLeadValue(lead)

  return {
    first_name: split.firstName || 'there',
    last_name: split.lastName || '',
    contact_name: contactName || 'there',
    name: contactName || split.firstName || 'there',
    company: String(lead.company || '').trim(),
    designation: String(lead.designation || '').trim(),
    email: String(lead.email || '').trim(),
    phone: formatPhone(lead),
    value: formattedValue,
    deal_value: formattedValue,
    source: humanizeEnum(lead.source?.name || lead.sourceName || lead.source || ''),
    status: humanizeEnum(lead.status || ''),
    city: String(lead.city || '').trim(),
    state: String(lead.state || '').trim(),
    country: String(lead.country || '').trim(),
    street: String(lead.street || '').trim(),
    postal_code: String(lead.postalCode || lead.postal_code || '').trim(),
    title: String(lead.title || '').trim(),
    requirement: String(lead.requirement || '').trim(),
    sender_name: String(senderName || '').trim(),
  }
}

const CURLY = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g
const AT = /@([a-z][a-z0-9_]*)/gi
const KNOWN = new Set([
  'first_name', 'last_name', 'contact_name', 'name', 'company', 'designation', 'email', 'phone',
  'value', 'deal_value', 'source', 'status', 'city', 'state', 'country', 'street', 'postal_code',
  'title', 'sender_name', 'requirement',
])
export const FALLBACK_MERGE_KEYS = new Set(['first_name', 'last_name', 'contact_name', 'name', 'sender_name'])
const FALLBACK = FALLBACK_MERGE_KEYS

const FIELD_LABELS = {
  first_name: 'First name',
  last_name: 'Last name',
  contact_name: 'Contact name',
  name: 'Name',
  company: 'Company',
  designation: 'Designation',
  email: 'Email',
  phone: 'Phone',
  value: 'Value',
  deal_value: 'Deal value',
  source: 'Source',
  status: 'Status',
  city: 'City',
  state: 'State',
  country: 'Country',
  street: 'Street',
  postal_code: 'Postal code',
  title: 'Title',
  requirement: 'Requirement',
  sender_name: 'Sender name',
}

export function extractMergeKeysFromTemplate(subject, bodyHtml) {
  const keys = new Set()
  const scan = (text) => {
    const s = String(text || '')
    for (const m of s.matchAll(CURLY)) {
      const k = String(m[1] || '').trim().toLowerCase()
      if (KNOWN.has(k)) keys.add(k)
    }
    for (const m of s.matchAll(AT)) {
      const k = String(m[1] || '').trim().toLowerCase()
      if (KNOWN.has(k)) keys.add(k)
    }
  }
  scan(subject)
  scan(bodyHtml)
  return [...keys]
}

export function missingMergeKeysForLead(template, lead, senderName = '') {
  if (!template) return []
  const values = buildLeadMergeValues(lead, senderName)
  return extractMergeKeysFromTemplate(template.subject, template.bodyHtml).filter((key) => {
    if (FALLBACK.has(key)) return false
    const v = values[key]
    return v == null || !String(v).trim()
  })
}

export function mergeFieldLabel(key) {
  return FIELD_LABELS[key] || key.replace(/_/g, ' ')
}

export function leadDisplayName(lead) {
  return lead.contactName || lead.title || lead.company || lead.email || 'Unnamed lead'
}
