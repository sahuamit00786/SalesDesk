import { Op, fn, col, where as sqlWhere } from 'sequelize'
import { Lead } from '../models/index.js'

/** Resolve Sequelize attribute → physical column name on `leads`. */
function leadDbColumn(attr) {
  const def = Lead.rawAttributes[attr]
  if (!def) return attr
  return def.field || attr
}

const TEXT_OPS = ['contains', 'not_contains', 'eq', 'neq', 'is_empty', 'is_not_empty']
const ENUM_OPS = ['is', 'is_not', 'is_any_of', 'is_none_of', 'is_empty', 'is_not_empty']
const NUMBER_OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'is_empty', 'is_not_empty']
const DATE_OPS = ['eq', 'before', 'after', 'between', 'is_empty', 'is_not_empty']
const UUID_OPS = ['is', 'is_not', 'is_any_of', 'is_none_of', 'is_empty', 'is_not_empty']
const BOOL_OPS = ['is']

function opsForType(type) {
  switch (type) {
    case 'text':
      return TEXT_OPS
    case 'enum':
      return ENUM_OPS
    case 'number':
      return NUMBER_OPS
    case 'date':
      return DATE_OPS
    case 'uuid':
      return UUID_OPS
    case 'boolean':
      return BOOL_OPS
    default:
      return TEXT_OPS
  }
}

export function parseFiltersParam(raw) {
  if (!raw) return null
  if (typeof raw === 'object' && raw !== null) return sanitizeFilterTree(raw)
  const str = String(raw).trim()
  if (!str) return null
  try {
    return sanitizeFilterTree(JSON.parse(str))
  } catch {
    return null
  }
}

function sanitizeFilterTree(node) {
  if (!node || typeof node !== 'object') return null
  const logic = String(node.logic || 'and').toLowerCase() === 'or' ? 'or' : 'and'
  const rules = Array.isArray(node.rules) ? node.rules.map(sanitizeRule).filter(Boolean) : []
  if (!rules.length) return null
  return { logic, rules }
}

function sanitizeRule(rule) {
  if (!rule || typeof rule !== 'object') return null
  if (rule.type === 'group') {
    const nested = sanitizeFilterTree(rule)
    return nested ? { type: 'group', ...nested } : null
  }
  const field = String(rule.field || '').trim()
  const operator = String(rule.operator || '').trim()
  if (!field || !operator) return null
  return {
    type: 'condition',
    field,
    operator,
    value: rule.value,
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter((v) => v !== undefined && v !== null && String(v).trim() !== '')
  if (value === undefined || value === null || value === '') return []
  return [value]
}

function buildConditionWhere(fieldDef, field, operator, value) {
  const { type } = fieldDef
  const allowed = opsForType(type)
  if (!allowed.includes(operator)) return null

  const attr = field

  if (operator === 'is_empty') {
    return { [attr]: { [Op.or]: [{ [Op.is]: null }, { [Op.eq]: '' }] } }
  }
  if (operator === 'is_not_empty') {
    return { [attr]: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] } }
  }

  if (type === 'text') {
    const q = String(value ?? '').trim()
    if (!q && operator !== 'is_empty') return null
    const like = `%${q.toLowerCase()}%`
    const dbCol = leadDbColumn(attr)
    if (operator === 'contains') {
      return sqlWhere(fn('LOWER', col(`Lead.${dbCol}`)), { [Op.like]: like })
    }
    if (operator === 'not_contains') {
      return sqlWhere(fn('LOWER', col(`Lead.${dbCol}`)), { [Op.notLike]: like })
    }
    if (operator === 'eq') return { [attr]: q }
    if (operator === 'neq') return { [attr]: { [Op.ne]: q } }
  }

  if (type === 'enum') {
    const list = toArray(value).map((v) => String(v).trim()).filter(Boolean)
    if (!list.length) return null
    if (operator === 'is' || operator === 'eq') return { [attr]: list[0] }
    if (operator === 'is_not' || operator === 'neq') return { [attr]: { [Op.ne]: list[0] } }
    if (operator === 'is_any_of') return { [attr]: { [Op.in]: list } }
    if (operator === 'is_none_of') return { [attr]: { [Op.notIn]: list } }
  }

  if (type === 'uuid') {
    const list = toArray(value).map((v) => String(v).trim()).filter(Boolean)
    if (!list.length && !['is_empty', 'is_not_empty'].includes(operator)) return null
    if (operator === 'is') return { [attr]: list[0] }
    if (operator === 'is_not') return { [attr]: { [Op.ne]: list[0] } }
    if (operator === 'is_any_of') return { [attr]: { [Op.in]: list } }
    if (operator === 'is_none_of') return { [attr]: { [Op.notIn]: list } }
  }

  if (type === 'number') {
    const parseNum = (v) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }
    if (operator === 'between') {
      const arr = toArray(value)
      const a = parseNum(arr[0])
      const b = parseNum(arr[1])
      if (a === null && b === null) return null
      const clause = {}
      if (a !== null) clause[Op.gte] = a
      if (b !== null) clause[Op.lte] = b
      return { [attr]: clause }
    }
    const n = parseNum(value)
    if (n === null) return null
    if (operator === 'eq') return { [attr]: n }
    if (operator === 'neq') return { [attr]: { [Op.ne]: n } }
    if (operator === 'gt') return { [attr]: { [Op.gt]: n } }
    if (operator === 'gte') return { [attr]: { [Op.gte]: n } }
    if (operator === 'lt') return { [attr]: { [Op.lt]: n } }
    if (operator === 'lte') return { [attr]: { [Op.lte]: n } }
  }

  if (type === 'date') {
    if (operator === 'between') {
      const arr = toArray(value)
      const from = arr[0] ? String(arr[0]).slice(0, 10) : null
      const to = arr[1] ? String(arr[1]).slice(0, 10) : null
      if (!from && !to) return null
      const clause = {}
      if (from) clause[Op.gte] = from
      if (to) clause[Op.lte] = to
      return { [attr]: clause }
    }
    const d = value ? String(value).slice(0, 10) : null
    if (!d) return null
    if (operator === 'eq') return { [attr]: d }
    if (operator === 'before') return { [attr]: { [Op.lt]: d } }
    if (operator === 'after') return { [attr]: { [Op.gt]: d } }
  }

  if (type === 'boolean') {
    const truthy = value === true || value === 'true' || value === 1 || value === '1'
    const falsy = value === false || value === 'false' || value === 0 || value === '0'
    if (!truthy && !falsy) return null
    return { [attr]: truthy }
  }

  return null
}

function buildGroupWhere(node, fieldSchema) {
  const parts = []
  for (const rule of node.rules || []) {
    if (rule.type === 'group') {
      const nested = buildGroupWhere(rule, fieldSchema)
      if (nested) parts.push(nested)
      continue
    }
    const fieldDef = fieldSchema[rule.field]
    if (!fieldDef) continue
    if (!opsForType(fieldDef.type).includes(rule.operator)) continue
    const clause = buildConditionWhere(fieldDef, rule.field, rule.operator, rule.value)
    if (clause) parts.push(clause)
  }
  if (!parts.length) return null
  if (parts.length === 1) return parts[0]
  return node.logic === 'or' ? { [Op.or]: parts } : { [Op.and]: parts }
}

/**
 * @param {object|null} filterTree
 * @param {Record<string, { type: string }>} fieldSchema
 */
export function buildAdvancedListWhere(filterTree, fieldSchema) {
  if (!filterTree?.rules?.length) return null
  return buildGroupWhere(filterTree, fieldSchema)
}

export { opsForType }
