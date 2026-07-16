const OPS_BY_TYPE = {
  text: [
    { id: 'contains', label: 'contains' },
    { id: 'not_contains', label: 'does not contain' },
    { id: 'eq', label: 'is' },
    { id: 'neq', label: 'is not' },
    { id: 'is_empty', label: 'is empty' },
    { id: 'is_not_empty', label: 'is not empty' },
  ],
  enum: [
    { id: 'is_any_of', label: 'is any of' },
    { id: 'is_none_of', label: 'is none of' },
    { id: 'is', label: 'is' },
    { id: 'is_not', label: 'is not' },
    { id: 'is_empty', label: 'is empty' },
    { id: 'is_not_empty', label: 'is not empty' },
  ],
  number: [
    { id: 'eq', label: 'is' },
    { id: 'neq', label: 'is not' },
    { id: 'gte', label: 'is at least' },
    { id: 'lte', label: 'is at most' },
    { id: 'between', label: 'is between' },
    { id: 'is_empty', label: 'is empty' },
    { id: 'is_not_empty', label: 'is not empty' },
  ],
  date: [
    { id: 'eq', label: 'is on' },
    { id: 'before', label: 'is before' },
    { id: 'after', label: 'is after' },
    { id: 'between', label: 'is between' },
    { id: 'is_empty', label: 'is empty' },
    { id: 'is_not_empty', label: 'is not empty' },
  ],
  uuid: [
    { id: 'is', label: 'is' },
    { id: 'is_not', label: 'is not' },
    { id: 'is_any_of', label: 'is any of' },
    { id: 'is_none_of', label: 'is none of' },
    { id: 'is_empty', label: 'is empty' },
    { id: 'is_not_empty', label: 'is not empty' },
  ],
  boolean: [{ id: 'is', label: 'is' }],
}

export function operatorsForFieldType(type) {
  return OPS_BY_TYPE[type] || OPS_BY_TYPE.text
}

export function defaultOperator(type) {
  return operatorsForFieldType(type)[0]?.id || 'contains'
}

export function valueLessOperator(operator) {
  return ['is_empty', 'is_not_empty'].includes(operator)
}

export function createCondition(field = 'title', fieldType = 'text') {
  return {
    type: 'condition',
    field,
    operator: defaultOperator(fieldType),
    value: fieldType === 'enum' || fieldType === 'uuid' ? [] : '',
  }
}

export function createGroup(logic = 'and') {
  return {
    type: 'group',
    logic,
    rules: [createCondition()],
  }
}

export function createRootFilter() {
  return {
    logic: 'and',
    rules: [createCondition()],
  }
}

export function countActiveRules(tree) {
  if (!tree?.rules?.length) return 0
  let n = 0
  const walk = (node) => {
    for (const rule of node.rules || []) {
      if (rule.type === 'group') walk(rule)
      else if (rule.field && rule.operator) n += 1
    }
  }
  walk(tree)
  return n
}

export function serializeFilterTree(tree) {
  if (!tree?.rules?.length) return undefined
  return JSON.stringify(tree)
}
