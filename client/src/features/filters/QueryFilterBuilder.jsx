import { ChevronDown, GripVertical, RefreshCw, Trash2 } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import { FilterValueInput } from './FilterValueInput'
import {
  createCondition,
  createGroup,
  defaultOperator,
  operatorsForFieldType,
} from './filterUtils'

function QfSelect({ className, children, ...props }) {
  return (
    <div className="relative shrink-0">
      <select {...props} className={cn('qf-select', className)}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
    </div>
  )
}

function LogicToggle({ logic, onChange }) {
  const next = logic === 'and' ? 'or' : 'and'
  return (
    <button
      type="button"
      title={`Switch to ${next.toUpperCase()}`}
      onClick={() => onChange(next)}
      className="qf-logic-toggle"
    >
      <RefreshCw className="h-3 w-3 shrink-0 opacity-50" />
      {logic === 'and' ? 'And' : 'Or'}
    </button>
  )
}

function FilterGroupEditor({
  tree,
  onChange,
  fieldSchema,
  fieldList,
  users,
  stageOptions,
  depth = 0,
  onRemoveGroup,
}) {
  const logic = tree.logic === 'or' ? 'or' : 'and'
  const isNested = depth > 0

  const updateRule = (index, patch) => {
    const rules = [...(tree.rules || [])]
    rules[index] = { ...rules[index], ...patch }
    onChange({ ...tree, rules })
  }

  const removeRule = (index) => {
    const rules = (tree.rules || []).filter((_, i) => i !== index)
    onChange({
      ...tree,
      rules: rules.length ? rules : [createCondition(fieldList[0]?.id, fieldList[0]?.type)],
    })
  }

  const addCondition = () => {
    const first = fieldList[0]
    onChange({
      ...tree,
      rules: [...(tree.rules || []), createCondition(first?.id, first?.type)],
    })
  }

  const addSubgroup = () => {
    onChange({
      ...tree,
      rules: [...(tree.rules || []), createGroup(logic === 'and' ? 'or' : 'and')],
    })
  }

  const updateSubgroup = (index, nested) => {
    const rules = [...(tree.rules || [])]
    rules[index] = { type: 'group', ...nested }
    onChange({ ...tree, rules })
  }

  return (
    <div className={cn('qf-group', isNested && 'qf-subgroup')}>
      {isNested ? (
        <div className="qf-subgroup-header">
          <p className="qf-subgroup-title">
            {logic === 'or' ? 'Any of the following are true:' : 'All of the following are true:'}
          </p>
          {onRemoveGroup ? (
            <button type="button" className="qf-icon-btn" title="Remove group" onClick={onRemoveGroup}>
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="qf-spine">
        <div className="qf-spine-rail">
          <div className="qf-spine-toggle">
            <LogicToggle logic={logic} onChange={(l) => onChange({ ...tree, logic: l })} />
          </div>
          <div className="qf-spine-line" aria-hidden />
        </div>

        <div className="qf-rules">
          {(tree.rules || []).map((rule, index) => {
            if (rule.type === 'group') {
              return (
                <FilterGroupEditor
                  key={`g-${index}`}
                  tree={rule}
                  onChange={(nested) => updateSubgroup(index, nested)}
                  fieldSchema={fieldSchema}
                  fieldList={fieldList}
                  users={users}
                  stageOptions={stageOptions}
                  depth={depth + 1}
                  onRemoveGroup={() => removeRule(index)}
                />
              )
            }

            const fieldDef = fieldSchema[rule.field] || {
              type: 'text',
              label: rule.field,
            }
            const fieldType = fieldDef.type || 'text'
            const ops = operatorsForFieldType(fieldType)

            return (
              <div key={`c-${index}`} className="qf-row">
                <GripVertical className="qf-grip" aria-hidden />

                <QfSelect
                  className="qf-field-select"
                  value={rule.field || ''}
                  onChange={(e) => {
                    const id = e.target.value
                    const def = fieldSchema[id]
                    updateRule(index, {
                      field: id,
                      operator: defaultOperator(def?.type),
                      value: def?.type === 'enum' || def?.type === 'uuid' ? [] : '',
                    })
                  }}
                >
                  {fieldList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </QfSelect>

                <QfSelect
                  className="qf-op-select"
                  value={rule.operator || ''}
                  onChange={(e) => updateRule(index, { operator: e.target.value })}
                >
                  {ops.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.label}
                    </option>
                  ))}
                </QfSelect>

                <div className="qf-value min-w-0 flex-1">
                  <FilterValueInput
                    fieldDef={{ ...fieldDef, id: rule.field }}
                    operator={rule.operator}
                    value={rule.value}
                    onChange={(v) => updateRule(index, { value: v })}
                    users={users}
                    stageOptions={stageOptions}
                  />
                </div>

                <button
                  type="button"
                  className="qf-icon-btn qf-row-delete"
                  title="Remove condition"
                  onClick={() => removeRule(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}

          <div className="qf-inline-actions">
            <button type="button" className="qf-action-btn" onClick={addCondition}>
              + Add condition
            </button>
            {depth < 2 ? (
              <button type="button" className="qf-action-btn" onClick={addSubgroup}>
                + Add subgroup
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export function QueryFilterBuilder({
  value,
  onChange,
  fieldSchema,
  fieldList,
  users = [],
  stageOptions = [],
  onClear,
  showFooter = true,
}) {
  const tree = value?.rules?.length
    ? value
    : { logic: 'and', rules: [createCondition(fieldList[0]?.id, fieldList[0]?.type)] }

  return (
    <div className="qf-builder">
      <FilterGroupEditor
        tree={tree}
        onChange={onChange}
        fieldSchema={fieldSchema}
        fieldList={fieldList}
        users={users}
        stageOptions={stageOptions}
        depth={0}
      />

      {showFooter ? (
        <div className="qf-footer">
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              className="qf-action-btn"
              onClick={() => {
                const first = fieldList[0]
                onChange({
                  ...tree,
                  rules: [...(tree.rules || []), createCondition(first?.id, first?.type)],
                })
              }}
            >
              + Add condition
            </button>
            <button
              type="button"
              className="qf-action-btn"
              onClick={() => onChange({ ...tree, rules: [...(tree.rules || []), createGroup('or')] })}
            >
              + Add group
            </button>
          </div>
          {onClear ? (
            <button type="button" className="qf-clear-btn" onClick={onClear}>
              Clear all
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
