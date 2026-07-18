/**
 * Validates custom field values against their defined types.
 * @param {Array} fieldDefs - Array of custom field definitions [{key, fieldType, options, label}]
 * @param {Object} values - Key-value map of custom field values
 * @returns {{ valid: boolean, errors: Object }}
 */
export function validateCustomFields(fieldDefs, values) {
  if (!fieldDefs || !values) return { valid: true, errors: {} }

  const errors = {}

  for (const def of fieldDefs) {
    const val = values[def.key]
    if (val === undefined || val === null || val === '') continue

    switch (def.fieldType || def.type) {
      case 'number': {
        if (isNaN(Number(val))) errors[def.key] = `${def.label || def.key} must be a number`
        break
      }
      case 'date': {
        if (isNaN(Date.parse(val))) errors[def.key] = `${def.label || def.key} must be a valid date`
        break
      }
      case 'boolean': {
        if (val !== true && val !== false && val !== 'true' && val !== 'false') {
          errors[def.key] = `${def.label || def.key} must be true or false`
        }
        break
      }
      case 'select': {
        const allowed = (def.options || []).map((o) => (typeof o === 'string' ? o : o.value))
        if (!allowed.includes(val)) errors[def.key] = `${def.label || def.key} must be one of: ${allowed.join(', ')}`
        break
      }
      case 'text':
      case 'textarea': {
        if (typeof val === 'string' && val.length > 2000) {
          errors[def.key] = `${def.label || def.key} must be under 2000 characters`
        }
        break
      }
      default:
        break
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
