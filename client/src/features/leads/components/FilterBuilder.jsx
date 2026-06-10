import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { cn } from '@/utils/cn'
import { STATUS_OPTIONS, SOURCE_OPTIONS, SOURCE_LABELS } from '@/features/leads/constants'

/* ── helpers ──────────────────────────────────────── */

function cap(s) {
  return String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const TEXT_OPS = [
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'eq', label: 'Is exactly' },
  { value: 'neq', label: 'Is not' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
]
const ENUM_OPS = [
  { value: 'is_any_of', label: 'Is any of' },
  { value: 'is_none_of', label: 'Is none of' },
  { value: 'is', label: 'Is' },
  { value: 'is_not', label: 'Is not' },
]
const NUMBER_OPS = [
  { value: 'eq', label: '= equals' },
  { value: 'gt', label: '> greater than' },
  { value: 'gte', label: '≥ at least' },
  { value: 'lt', label: '< less than' },
  { value: 'lte', label: '≤ at most' },
  { value: 'between', label: 'Between' },
]
const DATE_OPS = [
  { value: 'between', label: 'Between' },
  { value: 'after', label: 'After' },
  { value: 'before', label: 'Before' },
  { value: 'eq', label: 'On' },
]

const FIELD_GROUPS = [
  {
    id: 'system',
    label: 'System Filters',
    fields: [
      { id: '_touched', label: 'Touched Records', type: 'system_touched' },
      { id: '_untouched', label: 'Untouched Records', type: 'system_untouched' },
    ],
  },
  {
    id: 'info',
    label: 'Lead Info',
    fields: [
      { id: 'title', label: 'Lead Name', type: 'text' },
      { id: 'contactName', label: 'Contact Name', type: 'text' },
      { id: 'company', label: 'Company', type: 'text' },
      { id: 'email', label: 'Email', type: 'text' },
      { id: 'phone', label: 'Phone', type: 'text' },
    ],
  },
  {
    id: 'status',
    label: 'Status & Assignment',
    fields: [
      { id: 'status', label: 'Status', type: 'enum', values: STATUS_OPTIONS },
      { id: 'source', label: 'Source', type: 'enum', values: SOURCE_OPTIONS, labels: SOURCE_LABELS },
      { id: 'assignedTo', label: 'Assigned To', type: 'user' },
    ],
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    fields: [
      { id: 'value', label: 'Deal Value', type: 'number' },
      { id: 'score', label: 'Health Score', type: 'number' },
      { id: 'opportunityStage', label: 'Stage', type: 'text', oppOnly: true },
    ],
  },
  {
    id: 'location',
    label: 'Location',
    fields: [
      { id: 'city', label: 'City', type: 'text' },
      { id: 'state', label: 'State', type: 'text' },
      { id: 'country', label: 'Country', type: 'text' },
    ],
  },
  {
    id: 'dates',
    label: 'Dates',
    fields: [
      { id: 'createdAt', label: 'Created Date', type: 'date' },
      { id: 'updatedAt', label: 'Last Modified', type: 'date' },
      { id: 'closingDate', label: 'Closing Date', type: 'date', oppOnly: true },
    ],
  },
]

const DEFAULT_OP = { text: 'contains', enum: 'is_any_of', number: 'gte', date: 'between', user: 'is' }

function defaultCondition(type) {
  return { on: false, op: DEFAULT_OP[type] || 'contains', val: '', val2: '' }
}

function buildInitialDraft() {
  const draft = {
    _touched: false,
    _untouched: false,
    _untouchedDays: 30,
    _untouchedUnit: 'days',
  }
  for (const g of FIELD_GROUPS) {
    for (const f of g.fields) {
      if (f.type.startsWith('system')) continue
      draft[f.id] = defaultCondition(f.type)
    }
  }
  return draft
}

function treeToConditions(filterTree) {
  const out = {}
  if (!filterTree?.rules) return out
  for (const rule of filterTree.rules) {
    if (rule.type !== 'condition' || !rule.field) continue
    const fid = rule.field
    const value = rule.value

    if (fid === '__untouched__') {
      out._untouched = true
      out._untouchedDays = value || 30
      continue
    }
    if (fid === '__touched__') {
      out._touched = true
      continue
    }

    const group = FIELD_GROUPS.flatMap((g) => g.fields).find((f) => f.id === fid)
    if (!group) continue
    const type = group.type

    if (type === 'date') {
      if (rule.operator === 'between' && Array.isArray(value)) {
        out[fid] = { on: true, op: 'between', val: value[0] || '', val2: value[1] || '' }
      } else {
        out[fid] = { on: true, op: rule.operator, val: Array.isArray(value) ? value[0] : (value || ''), val2: '' }
      }
    } else if (type === 'enum') {
      const vals = Array.isArray(value) ? value : (value ? [value] : [])
      out[fid] = { on: true, op: rule.operator, val: vals.join(','), val2: '' }
    } else if (type === 'number') {
      if (rule.operator === 'between' && Array.isArray(value)) {
        out[fid] = { on: true, op: 'between', val: String(value[0] ?? ''), val2: String(value[1] ?? '') }
      } else {
        out[fid] = { on: true, op: rule.operator, val: String(Array.isArray(value) ? value[0] : (value ?? '')), val2: '' }
      }
    } else {
      out[fid] = { on: true, op: rule.operator, val: String(value ?? ''), val2: '' }
    }
  }
  return out
}

function conditionsToDraft(base, conditions) {
  const draft = { ...base }
  for (const [k, v] of Object.entries(conditions)) {
    if (k === '_touched') { draft._touched = Boolean(v); continue }
    if (k === '_untouched') { draft._untouched = Boolean(v); continue }
    if (k === '_untouchedDays') { draft._untouchedDays = v; continue }
    if (draft[k] !== undefined) {
      draft[k] = { ...draft[k], ...v }
    }
  }
  return draft
}

function draftToFilterTree(draft) {
  const rules = []

  if (draft._touched) {
    rules.push({ type: 'condition', field: '__touched__', operator: 'is', value: true })
  }
  if (draft._untouched) {
    const days = Number(draft._untouchedDays) || 30
    const unit = draft._untouchedUnit || 'days'
    const multiplier = unit === 'weeks' ? 7 : unit === 'months' ? 30 : 1
    const cutoff = daysAgo(days * multiplier)
    rules.push({ type: 'condition', field: 'updatedAt', operator: 'before', value: cutoff })
  }

  for (const g of FIELD_GROUPS) {
    for (const f of g.fields) {
      if (f.type.startsWith('system')) continue
      const cond = draft[f.id]
      if (!cond?.on) continue
      const { op, val, val2 } = cond

      if (['is_empty', 'is_not_empty'].includes(op)) {
        rules.push({ type: 'condition', field: f.id, operator: op, value: null })
        continue
      }

      if (f.type === 'enum') {
        const vals = String(val || '').split(',').map((v) => v.trim()).filter(Boolean)
        if (!vals.length) continue
        rules.push({ type: 'condition', field: f.id, operator: op, value: vals })
      } else if (f.type === 'number') {
        if (op === 'between') {
          if (!val && !val2) continue
          rules.push({ type: 'condition', field: f.id, operator: op, value: [Number(val) || 0, Number(val2) || 0] })
        } else {
          if (val === '') continue
          rules.push({ type: 'condition', field: f.id, operator: op, value: Number(val) })
        }
      } else if (f.type === 'date') {
        if (op === 'between') {
          if (!val && !val2) continue
          rules.push({ type: 'condition', field: f.id, operator: op, value: [val, val2] })
        } else {
          if (!val) continue
          rules.push({ type: 'condition', field: f.id, operator: op, value: val })
        }
      } else {
        if (!val) continue
        rules.push({ type: 'condition', field: f.id, operator: op, value: val })
      }
    }
  }

  return rules.length ? { logic: 'and', rules } : null
}

/* ── sub-components ──────────────────────────────── */

const ctrl = 'rounded-lg border border-surface-border bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-brand-500'

function TextValue({ val, onChange }) {
  return (
    <input
      className={cn(ctrl, 'flex-1 min-w-0')}
      placeholder="Type value…"
      value={val}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function NumberValue({ op, val, val2, onChange }) {
  if (op === 'between') {
    return (
      <>
        <input type="number" className={cn(ctrl, 'w-20')} placeholder="Min" value={val} onChange={(e) => onChange(e.target.value, val2)} />
        <span className="text-xs text-ink-faint">–</span>
        <input type="number" className={cn(ctrl, 'w-20')} placeholder="Max" value={val2} onChange={(e) => onChange(val, e.target.value)} />
      </>
    )
  }
  return <input type="number" className={cn(ctrl, 'w-28')} placeholder="Value" value={val} onChange={(e) => onChange(e.target.value, '')} />
}

function DateValue({ op, val, val2, onChange }) {
  if (op === 'between') {
    return (
      <>
        <input type="date" className={cn(ctrl, 'w-36')} value={val} onChange={(e) => onChange(e.target.value, val2)} />
        <span className="text-xs text-ink-faint">–</span>
        <input type="date" className={cn(ctrl, 'w-36')} value={val2} onChange={(e) => onChange(val, e.target.value)} />
      </>
    )
  }
  return <input type="date" className={cn(ctrl, 'w-36')} value={val} onChange={(e) => onChange(e.target.value, '')} />
}

function EnumValue({ field, val, onChange }) {
  const selected = val ? val.split(',').map((v) => v.trim()).filter(Boolean) : []
  const options = field.values || []
  const labels = field.labels || {}
  function toggle(v) {
    const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]
    onChange(next.join(','))
  }
  return (
    <div className="flex flex-wrap gap-1 pt-1">
      {options.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => toggle(v)}
          className={cn(
            'rounded-full border px-2 py-0.5 text-[11px] font-medium transition',
            selected.includes(v)
              ? 'border-brand-400 bg-brand-50 text-brand-800'
              : 'border-surface-border bg-white text-ink-muted hover:border-brand-300',
          )}
        >
          {labels[v] || cap(v)}
        </button>
      ))}
    </div>
  )
}

function UserValue({ users, val, onChange }) {
  return (
    <select className={cn(ctrl, 'flex-1 min-w-0')} value={val} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Select user —</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>{u.name || u.email}</option>
      ))}
    </select>
  )
}

function OpSelect({ ops, value, onChange }) {
  return (
    <select className={cn(ctrl, 'w-36 shrink-0')} value={value} onChange={(e) => onChange(e.target.value)}>
      {ops.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function FieldRow({ field, cond, onChange, users }) {
  const noValue = ['is_empty', 'is_not_empty'].includes(cond.op)
  const ops = field.type === 'number' ? NUMBER_OPS
    : field.type === 'date' ? DATE_OPS
    : field.type === 'enum' ? ENUM_OPS
    : TEXT_OPS

  function setOp(op) { onChange({ ...cond, op }) }
  function setVal(val, val2 = cond.val2) { onChange({ ...cond, val, val2 }) }

  return (
    <div className={cn('rounded-lg border px-3 py-2.5 transition', cond.on ? 'border-brand-200 bg-brand-50/40' : 'border-surface-border bg-white')}>
      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          checked={cond.on}
          onChange={(e) => onChange({ ...cond, on: e.target.checked })}
        />
        <span className="text-sm font-medium text-ink">{field.label}</span>
      </label>

      {cond.on ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
          {field.type !== 'enum' ? (
            <OpSelect ops={ops} value={cond.op} onChange={setOp} />
          ) : null}

          {!noValue ? (
            field.type === 'text' ? <TextValue val={cond.val} onChange={(v) => setVal(v)} />
            : field.type === 'number' ? <NumberValue op={cond.op} val={cond.val} val2={cond.val2} onChange={setVal} />
            : field.type === 'date' ? <DateValue op={cond.op} val={cond.val} val2={cond.val2} onChange={setVal} />
            : field.type === 'user' ? <UserValue users={users} val={cond.val} onChange={(v) => setVal(v)} />
            : field.type === 'enum' ? <EnumValue field={field} val={cond.val} onChange={(v) => setVal(v)} />
            : null
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function SectionGroup({ group, draft, onChange, users, search }) {
  const [open, setOpen] = useState(true)
  const filtered = group.fields.filter((f) => !search || f.label.toLowerCase().includes(search.toLowerCase()))
  if (!filtered.length) return null
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-faint hover:text-ink"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {group.label}
      </button>
      {open ? (
        <div className="space-y-1.5 pb-2">
          {filtered.map((f) => {
            if (f.type === 'system_touched') {
              return (
                <div key={f.id} className={cn('rounded-lg border px-3 py-2.5', draft._touched ? 'border-brand-200 bg-brand-50/40' : 'border-surface-border bg-white')}>
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      checked={draft._touched}
                      onChange={(e) => onChange({ _touched: e.target.checked })}
                    />
                    <span className="text-sm font-medium text-ink">{f.label}</span>
                    <span className="text-[11px] text-ink-faint">Records with recent activity</span>
                  </label>
                </div>
              )
            }
            if (f.type === 'system_untouched') {
              return (
                <div key={f.id} className={cn('rounded-lg border px-3 py-2.5', draft._untouched ? 'border-brand-200 bg-brand-50/40' : 'border-surface-border bg-white')}>
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      checked={draft._untouched}
                      onChange={(e) => onChange({ _untouched: e.target.checked })}
                    />
                    <span className="text-sm font-medium text-ink">{f.label}</span>
                  </label>
                  {draft._untouched ? (
                    <div className="mt-2 flex items-center gap-2 pl-6">
                      <span className="text-xs text-ink-faint shrink-0">Not touched in</span>
                      <input
                        type="number"
                        min={1}
                        className={cn(ctrl, 'w-16 text-center')}
                        value={draft._untouchedDays}
                        onChange={(e) => onChange({ _untouchedDays: Number(e.target.value) || 1 })}
                      />
                      <select
                        className={cn(ctrl, 'w-24')}
                        value={draft._untouchedUnit}
                        onChange={(e) => onChange({ _untouchedUnit: e.target.value })}
                      >
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                      </select>
                      <span className="text-xs text-ink-faint shrink-0">or more</span>
                    </div>
                  ) : null}
                </div>
              )
            }
            return (
              <FieldRow
                key={f.id}
                field={f}
                cond={draft[f.id] || defaultCondition(f.type)}
                onChange={(cond) => onChange({ [f.id]: cond })}
                users={users}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

/* ── main export ─────────────────────────────────── */

export function FilterBuilder({
  filters,
  onChange,
  onReset,
  workspaceOptions = null,
  users = [],
  stageOptions = [],
  isOpportunities = false,
  onDraftApply,
}) {
  const [fieldSearch, setFieldSearch] = useState('')
  const [draft, setDraft] = useState(() => buildInitialDraft())

  useEffect(() => {
    const base = buildInitialDraft()
    const fromTree = treeToConditions(filters.filterTree)
    const merged = conditionsToDraft(base, fromTree)
    // sync simple filters (status, assignedTo, source, stage) into draft
    if (filters.status?.length) {
      merged.status = { on: true, op: 'is_any_of', val: filters.status.join(','), val2: '' }
    }
    if (filters.assignedTo?.length) {
      merged.assignedTo = { on: true, op: 'is', val: filters.assignedTo[0], val2: '' }
    }
    if (filters.source?.length) {
      merged.source = { on: true, op: 'is_any_of', val: filters.source.join(','), val2: '' }
    }
    setDraft(merged)
  }, [filters.filterTree, filters.status, filters.assignedTo, filters.source])

  function patch(delta) {
    setDraft((d) => ({ ...d, ...delta }))
  }

  function handleApply() {
    const tree = draftToFilterTree(draft)
    const status = draft.status?.on
      ? (draft.status.val || '').split(',').map((v) => v.trim()).filter(Boolean)
      : []
    const assignedTo = draft.assignedTo?.on && draft.assignedTo.val ? [draft.assignedTo.val] : []
    const source = draft.source?.on
      ? (draft.source.val || '').split(',').map((v) => v.trim()).filter(Boolean)
      : []
    const stage = draft.opportunityStage?.on && draft.opportunityStage.val
      ? [draft.opportunityStage.val]
      : []
    const valueMin = draft.value?.on && draft.value.op !== 'between' ? (Number(draft.value.val) || undefined) : undefined
    const valueMax = draft.value?.on && draft.value.op === 'between' ? (Number(draft.value.val2) || undefined) : undefined
    onChange({ filterTree: tree, status, assignedTo, source, stage, valueMin, valueMax })
  }

  function handleReset() {
    setDraft(buildInitialDraft())
    onReset?.()
  }

  const visibleGroups = FIELD_GROUPS.map((g) => ({
    ...g,
    fields: g.fields.filter((f) => {
      if (f.oppOnly && !isOpportunities) return false
      return true
    }),
  }))

  const activeCount = useMemo(() => {
    let n = (draft._touched ? 1 : 0) + (draft._untouched ? 1 : 0)
    for (const g of FIELD_GROUPS) {
      for (const f of g.fields) {
        if (f.type.startsWith('system')) continue
        if (draft[f.id]?.on) n++
      }
    }
    return n
  }, [draft])

  return (
    <div className="flex flex-col" style={{ minHeight: 0 }}>
      {/* Field search */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          className="h-9 w-full rounded-xl border border-surface-border bg-surface-subtle pl-9 pr-3 text-sm text-ink outline-none focus:border-brand-500"
          placeholder="Search fields…"
          value={fieldSearch}
          onChange={(e) => setFieldSearch(e.target.value)}
        />
      </div>

      {/* Workspace filter */}
      {workspaceOptions?.length ? (
        <div className="mb-3 rounded-lg border border-surface-border bg-white px-3 py-2.5">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Workspace</p>
          <select
            className={cn(ctrl, 'w-full')}
            value={filters.workspaceId || ''}
            onChange={(e) => onChange({ workspaceId: e.target.value })}
          >
            <option value="">All workspaces</option>
            {workspaceOptions.map((w) => <option key={w.id} value={w.id}>{w.name || w.id}</option>)}
          </select>
        </div>
      ) : null}

      {/* Scrollable field list */}
      <div className="scrollbar-subtle -mx-1 flex-1 space-y-3 overflow-y-auto px-1 pb-2" style={{ maxHeight: '55vh' }}>
        {visibleGroups.map((g) => (
          <SectionGroup
            key={g.id}
            group={g}
            draft={draft}
            onChange={patch}
            users={users}
            search={fieldSearch}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-surface-border pt-3">
        <button
          type="button"
          onClick={handleReset}
          className="text-sm text-ink-faint underline underline-offset-2 hover:text-ink"
        >
          Clear all
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleApply}
            className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Apply{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
