import { valueLessOperator } from './filterUtils'

function UserAvatar({ name }) {
  const initials = String(name || '?')
    .split(/\s+/)
    .map((x) => x[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-brand-700">
      {initials || '?'}
    </span>
  )
}

/**
 * @param {{
 *   fieldDef: object,
 *   operator: string,
 *   value: unknown,
 *   onChange: (v: unknown) => void,
 *   users?: { id: string, name?: string, email?: string }[],
 *   stageOptions?: { value: string, label: string }[],
 * }} props
 */
export function FilterValueInput({ fieldDef, operator, value, onChange, users = [], stageOptions = [] }) {
  if (valueLessOperator(operator)) return null

  const type = fieldDef?.type || 'text'

  if (type === 'boolean') {
    const opts = fieldDef.options || [
      { value: true, label: 'Yes' },
      { value: false, label: 'No' },
    ]
    return (
      <select
        className="qf-select min-w-[96px]"
        value={value === true || value === 'true' ? 'true' : value === false || value === 'false' ? 'false' : ''}
        onChange={(e) => onChange(e.target.value === 'true')}
      >
        <option value="">Select…</option>
        {opts.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  if (type === 'enum') {
    const options = fieldDef.options || []
    const selected = Array.isArray(value) ? value : value ? [value] : []
    const multi = ['is_any_of', 'is_none_of'].includes(operator)
    if (multi) {
      const visible = selected.slice(0, 1)
      const overflow = selected.length - visible.length
      return (
        <div className="flex min-w-[128px] flex-1 flex-wrap items-center gap-1.5">
          {visible.map((v) => {
            const label = options.find((o) => o.value === v)?.label || v
            return (
              <span key={v} className="qf-enum-pill">
                {label}
              </span>
            )
          })}
          {overflow > 0 ? (
            <span className="qf-enum-pill bg-neutral-100 text-neutral-600">+{overflow}</span>
          ) : null}
          <select
            className="qf-select max-w-[128px] flex-1"
            value=""
            onChange={(e) => {
              const v = e.target.value
              if (!v) return
              if (selected.includes(v)) return
              onChange([...selected, v])
            }}
          >
            <option value="">Add…</option>
            {options
              .filter((o) => !selected.includes(o.value))
              .map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
          </select>
        </div>
      )
    }
    return (
      <div className="flex min-w-[112px] flex-1 items-center gap-2">
        <select
          className="qf-select flex-1"
          value={selected[0] || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (type === 'uuid') {
    const options = users.map((u) => ({
      value: u.id,
      label: (u.name || u.email || 'User').trim(),
    }))
    const selected = Array.isArray(value) ? value : value ? [value] : []
    const multi = ['is_any_of', 'is_none_of'].includes(operator)
    if (multi) {
      return (
        <select
          multiple
          className="qf-select h-20 min-w-[144px] flex-1"
          value={selected}
          onChange={(e) => onChange(Array.from(e.target.selectedOptions).map((o) => o.value))}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    }
    const current = options.find((o) => o.value === selected[0])
    return (
      <div className="flex min-w-[128px] flex-1 items-center gap-2">
        {current ? <UserAvatar name={current.label} /> : null}
        <select
          className="qf-select flex-1"
          value={selected[0] || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select user…</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (type === 'number') {
    if (operator === 'between') {
      const arr = Array.isArray(value) ? value : ['', '']
      return (
        <div className="qf-value-dates">
          <input
            type="number"
            className="qf-select min-w-0"
            placeholder="Min"
            value={arr[0] ?? ''}
            onChange={(e) => onChange([e.target.value, arr[1] ?? ''])}
          />
          <span className="qf-date-sep">and</span>
          <input
            type="number"
            className="qf-select min-w-0"
            placeholder="Max"
            value={arr[1] ?? ''}
            onChange={(e) => onChange([arr[0] ?? '', e.target.value])}
          />
        </div>
      )
    }
    return (
      <input
        type="number"
        className="qf-select min-w-[80px] flex-1"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Value"
      />
    )
  }

  if (type === 'date') {
    if (operator === 'between') {
      const arr = Array.isArray(value) ? value : ['', '']
      return (
        <div className="qf-value-dates">
          <input
            type="date"
            className="qf-select min-w-0"
            value={arr[0] ? String(arr[0]).slice(0, 10) : ''}
            onChange={(e) => onChange([e.target.value, arr[1] ?? ''])}
          />
          <span className="qf-date-sep">and</span>
          <input
            type="date"
            className="qf-select min-w-0"
            value={arr[1] ? String(arr[1]).slice(0, 10) : ''}
            onChange={(e) => onChange([arr[0] ?? '', e.target.value])}
          />
        </div>
      )
    }
    return (
      <input
        type="date"
        className="qf-select flex-1"
        value={value ? String(value).slice(0, 10) : ''}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  if (fieldDef.id === 'opportunityStage' && stageOptions.length) {
    return (
      <select
        className="qf-select flex-1"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select stage…</option>
        {stageOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <input
      type="text"
      className="qf-select min-w-[112px] flex-1"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter value…"
    />
  )
}
