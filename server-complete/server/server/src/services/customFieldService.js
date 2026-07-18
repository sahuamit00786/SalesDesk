import Joi from 'joi'
import { CustomField, CustomFieldValue } from '../models/index.js'

export const CUSTOM_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'email',
  'phone',
  'url',
  'date',
  'dropdown',
  'multiselect',
  'radio',
  'checkbox',
]

const OPTION_TYPES = new Set(['dropdown', 'multiselect', 'radio'])

export function slugifyCustomFieldKey(label) {
  return String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 120)
}

export async function generateUniqueCustomFieldKey(workspaceId, label, excludeId = null) {
  const base = slugifyCustomFieldKey(label) || 'custom_field'
  let key = base
  let n = 2
  while (true) {
    const existing = await CustomField.findOne({ where: { workspaceId, key } })
    if (!existing || (excludeId && String(existing.id) === String(excludeId))) return key
    key = `${base}_${n}`
    n += 1
  }
}

const fieldDefinitionSchema = Joi.object({
  label: Joi.string().trim().min(1).max(120),
  type: Joi.string()
    .valid(...CUSTOM_FIELD_TYPES)
    .default('text'),
  options: Joi.array().items(Joi.string().trim().min(1).max(120)).allow(null),
  isRequired: Joi.boolean().default(false),
  order: Joi.number().integer().min(0).default(0),
}).custom((value, helpers) => {
  if (OPTION_TYPES.has(value.type)) {
    const opts = Array.isArray(value.options) ? value.options.filter(Boolean) : []
    if (!opts.length) {
      return helpers.error('any.custom', { message: 'Options are required for dropdown, multiselect, and radio fields' })
    }
    value.options = opts
  } else {
    value.options = null
  }
  return value
})

const fieldDefinitionPatchSchema = Joi.object({
  label: Joi.string().trim().min(1).max(120),
  type: Joi.string().valid(...CUSTOM_FIELD_TYPES),
  options: Joi.array().items(Joi.string().trim().min(1).max(120)).allow(null),
  isRequired: Joi.boolean(),
  order: Joi.number().integer().min(0),
})
  .min(1)
  .custom((value, helpers) => {
    if (value.type && OPTION_TYPES.has(value.type)) {
      const opts = Array.isArray(value.options) ? value.options.filter(Boolean) : []
      if (!opts.length) {
        return helpers.error('any.custom', { message: 'Options are required for dropdown, multiselect, and radio fields' })
      }
      value.options = opts
    }
    if (value.type && !OPTION_TYPES.has(value.type) && value.options !== undefined) {
      value.options = null
    }
    return value
  })

export function validateFieldDefinition(body, { isPatch = false } = {}) {
  const schema = isPatch ? fieldDefinitionPatchSchema : fieldDefinitionSchema
  return schema.validate(body || {}, { abortEarly: false, stripUnknown: true })
}

function isEmptyValue(type, raw) {
  if (type === 'checkbox') return raw === undefined || raw === null || raw === ''
  if (type === 'multiselect') {
    if (Array.isArray(raw)) return raw.length === 0
    if (raw === undefined || raw === null || raw === '') return true
    return false
  }
  if (raw === undefined || raw === null) return true
  return String(raw).trim() === ''
}

function normalizeOptions(options) {
  if (!options) return []
  if (Array.isArray(options)) return options.map((x) => String(x).trim()).filter(Boolean)
  return []
}

export function coerceValueForStorage(type, raw) {
  if (isEmptyValue(type, raw)) return null

  switch (type) {
    case 'checkbox': {
      if (typeof raw === 'boolean') return raw ? 'true' : 'false'
      const s = String(raw).trim().toLowerCase()
      return ['true', '1', 'yes', 'on'].includes(s) ? 'true' : 'false'
    }
    case 'number': {
      const n = Number(raw)
      if (Number.isNaN(n)) throw new Error('Invalid number value')
      return String(n)
    }
    case 'multiselect': {
      const arr = Array.isArray(raw)
        ? raw.map((x) => String(x).trim()).filter(Boolean)
        : String(raw)
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean)
      return JSON.stringify(arr)
    }
    case 'email': {
      const email = String(raw).trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email value')
      return email
    }
    case 'url': {
      let url = String(raw).trim()
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`
      try {
        // eslint-disable-next-line no-new
        new URL(url)
      } catch {
        throw new Error('Invalid URL value')
      }
      return url
    }
    case 'date': {
      const d = String(raw).trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error('Invalid date value')
      return d
    }
    default:
      return String(raw).trim()
  }
}

export function parseStoredValue(type, stored) {
  if (stored === null || stored === undefined || stored === '') {
    if (type === 'checkbox') return false
    if (type === 'multiselect') return []
    return ''
  }
  switch (type) {
    case 'checkbox':
      return String(stored).toLowerCase() === 'true'
    case 'number':
      return Number(stored)
    case 'multiselect':
      try {
        const parsed = JSON.parse(stored)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return String(stored)
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean)
      }
    default:
      return stored
  }
}

export function serializeLeadCustomFields(customFieldValues = []) {
  const out = {}
  for (const row of customFieldValues) {
    const def = row.customField || row.CustomField
    if (!def?.key) continue
    out[def.key] = parseStoredValue(def.type, row.value)
  }
  return out
}

export function enrichLeadPlainWithCustomFields(plain) {
  if (!plain || typeof plain !== 'object') return plain
  const values = plain.customFieldValues || []
  plain.customFields = serializeLeadCustomFields(values)
  return plain
}

function validateValueAgainstField(field, raw) {
  const type = field.type
  if (field.isRequired && isEmptyValue(type, raw)) {
    throw new Error(`${field.label} is required`)
  }
  if (isEmptyValue(type, raw)) return null

  const stored = coerceValueForStorage(type, raw)
  const options = normalizeOptions(field.options)

  if (type === 'dropdown' || type === 'radio') {
    if (!options.includes(String(raw).trim())) {
      throw new Error(`Invalid option for ${field.label}`)
    }
  }
  if (type === 'multiselect') {
    const arr = Array.isArray(raw)
      ? raw.map((x) => String(x).trim()).filter(Boolean)
      : JSON.parse(stored)
    for (const item of arr) {
      if (!options.includes(item)) throw new Error(`Invalid option for ${field.label}`)
    }
  }
  return stored
}

export async function upsertLeadCustomFields({
  leadId,
  workspaceId,
  companyId,
  customFields = {},
  transaction,
  validateRequired = true,
}) {
  if (!customFields || typeof customFields !== 'object') return

  const definitions = await CustomField.findAll({
    where: { workspaceId },
    order: [['order', 'ASC'], ['createdAt', 'ASC']],
    transaction,
  })
  if (!definitions.length) return

  const payload = customFields || {}
  const defByKey = new Map(definitions.map((d) => [d.key, d]))

  for (const field of definitions) {
    const hasKey = Object.prototype.hasOwnProperty.call(payload, field.key)
    const raw = hasKey ? payload[field.key] : undefined

    if (!hasKey && !validateRequired) continue
    if (!hasKey && !field.isRequired) continue

    let stored
    try {
      stored = validateValueAgainstField(field, raw)
    } catch (err) {
      const e = new Error(err.message || 'Invalid custom field value')
      e.status = 400
      e.code = 'VALIDATION'
      throw e
    }

    const existing = await CustomFieldValue.findOne({
      where: { customFieldId: field.id, leadId },
      transaction,
    })

    if (stored === null) {
      if (existing) await existing.destroy({ transaction })
      continue
    }

    if (existing) {
      await existing.update({ value: stored }, { transaction })
    } else {
      await CustomFieldValue.create(
        { customFieldId: field.id, leadId, value: stored },
        { transaction },
      )
    }
  }

}

export async function reorderCustomFields(workspaceId, companyId, ids) {
  const rows = await CustomField.findAll({
    where: { workspaceId, companyId },
    order: [['order', 'ASC'], ['createdAt', 'ASC']],
  })
  const byId = new Map(rows.map((r) => [String(r.id), r]))
  const ordered = ids.map((id) => byId.get(String(id))).filter(Boolean)
  for (const row of rows) {
    if (!ids.includes(String(row.id))) ordered.push(row)
  }
  for (let i = 0; i < ordered.length; i += 1) {
    await ordered[i].update({ order: i })
  }
  return ordered.length
}

export function mapWebFormTypeToCustomFieldType(formType) {
  if (formType === 'number') return 'number'
  if (formType === 'date') return 'date'
  if (formType === 'email') return 'email'
  if (formType === 'phone') return 'phone'
  if (formType === 'textarea') return 'textarea'
  if (formType === 'select' || formType === 'radio') return 'dropdown'
  if (formType === 'multiselect') return 'multiselect'
  if (formType === 'checkbox') return 'checkbox'
  return 'text'
}
