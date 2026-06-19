import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { CUSTOM_FIELD_TYPE_OPTIONS, OPTION_FIELD_TYPES } from '@/features/leads/customFieldTypes'

const EMPTY_FORM = {
  label: '',
  type: 'text',
  isRequired: false,
  options: [''],
}

export function CustomFieldEditorDrawer({ open, mode, initial, saving, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && initial) {
      setForm({
        label: initial.label || '',
        type: initial.type || 'text',
        isRequired: Boolean(initial.isRequired),
        options: Array.isArray(initial.options) && initial.options.length ? [...initial.options] : [''],
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [open, mode, initial])

  const showOptions = OPTION_FIELD_TYPES.has(form.type)

  function patch(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function patchOption(index, value) {
    setForm((prev) => {
      const next = [...(prev.options || [])]
      next[index] = value
      return { ...prev, options: next }
    })
  }

  function addOption() {
    setForm((prev) => ({ ...prev, options: [...(prev.options || []), ''] }))
  }

  function removeOption(index) {
    setForm((prev) => {
      const next = (prev.options || []).filter((_, i) => i !== index)
      return { ...prev, options: next.length ? next : [''] }
    })
  }

  function handleSave() {
    const label = String(form.label || '').trim()
    if (!label) return
    const payload = {
      label,
      type: form.type,
      isRequired: Boolean(form.isRequired),
    }
    if (OPTION_FIELD_TYPES.has(form.type)) {
      payload.options = (form.options || []).map((x) => String(x).trim()).filter(Boolean)
    }
    onSave?.(payload)
  }

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit custom field' : 'Add custom field'}
      description="Define a field that appears on leads and opportunities."
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !String(form.label || '').trim()}
            className="h-10 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add field'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Label</span>
          <Input
            value={form.label}
            onChange={(e) => patch('label', e.target.value)}
            placeholder="e.g. Budget range"
            autoFocus
          />
        </label>

        {mode === 'edit' && initial?.key ? (
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Key</span>
            <p className="rounded-xl border border-surface-border bg-surface-subtle px-3 py-2 font-mono text-xs text-ink-muted">
              {initial.key}
            </p>
          </div>
        ) : null}

        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Type</span>
          <Select value={form.type} onChange={(e) => patch('type', e.target.value)}>
            {CUSTOM_FIELD_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </label>

        {showOptions ? (
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Options</span>
            {(form.options || []).map((opt, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={opt}
                  onChange={(e) => patchOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-200 text-danger hover:bg-red-50"
                  aria-label="Remove option"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add option
            </button>
          </div>
        ) : null}

        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-surface-border bg-slate-50 px-3 py-2.5">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-surface-border text-brand-600"
            checked={form.isRequired}
            onChange={(e) => patch('isRequired', e.target.checked)}
          />
          <span className="text-sm text-ink">Required on create / edit</span>
        </label>
      </div>
    </RightDrawer>
  )
}
