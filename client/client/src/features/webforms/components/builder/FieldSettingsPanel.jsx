import { Plus, X } from '@/components/ui/icons'

const LEAD_CRM_FIELDS = [
  { value: 'lead.contactName', label: 'Lead Name', placeholder: 'Enter full name' },
  { value: 'lead.email', label: 'Email', placeholder: 'Enter email address' },
  { value: 'lead.phone', label: 'Phone', placeholder: 'Enter phone number' },
  { value: 'lead.company', label: 'Company', placeholder: 'Enter company name' },
  { value: 'lead.designation', label: 'Designation', placeholder: 'Enter job title' },
  { value: 'lead.city', label: 'City', placeholder: 'Enter city' },
  { value: 'lead.state', label: 'State', placeholder: 'Enter state' },
  { value: 'lead.country', label: 'Country', placeholder: 'Enter country' },
  { value: 'lead.postalCode', label: 'Postal Code', placeholder: 'Enter postal code' },
  { value: 'lead.status', label: 'Lead Status', placeholder: '' },
  { value: 'lead.source', label: 'Lead Source', placeholder: '' },
  { value: 'lead.value', label: 'Lead Value', placeholder: 'Enter lead value' },
  { value: 'lead.notes', label: 'Notes', placeholder: 'Add notes' },
  { value: 'lead.requirement', label: 'Requirement', placeholder: 'Add requirement' },
]

const FILE_ACCEPT_OPTIONS = [
  { value: '', label: 'Any file' },
  { value: 'image/*', label: 'Images only' },
  { value: 'application/pdf', label: 'PDF only' },
  { value: 'image/*,application/pdf', label: 'Images & PDF' },
  { value: '.doc,.docx,.pdf,.txt', label: 'Documents' },
  { value: 'video/*', label: 'Videos only' },
  { value: 'audio/*', label: 'Audio only' },
]

const TEXT_TYPES = new Set(['text', 'email', 'phone', 'number', 'textarea'])
const CHOICE_TYPES = new Set(['select', 'multiselect', 'radio', 'checkbox'])

const inputCls = 'mt-1 h-10 w-full rounded-xl border border-surface-border px-3 text-sm'

function Row({ label, children }) {
  return (
    <label className="block text-xs text-ink-muted">
      {label}
      {children}
    </label>
  )
}

function PanelWrap({ children }) {
  return (
    <div className="space-y-3 rounded-2xl border border-surface-border bg-white p-4">
      <h3 className="text-sm font-semibold text-ink">Field settings</h3>
      {children}
    </div>
  )
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function normalizeOptions(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((o) =>
    typeof o === 'string' ? { label: o, value: o } : { label: String(o.label ?? ''), value: String(o.value ?? '') },
  )
}

function OptionsEditor({ options, onChange }) {
  const opts = normalizeOptions(options)

  function updateLabel(index, newLabel) {
    const updated = opts.map((o, i) =>
      i === index ? { label: newLabel, value: slugify(newLabel) || o.value } : o,
    )
    onChange(updated)
  }

  function removeOption(index) {
    onChange(opts.filter((_, i) => i !== index))
  }

  function addOption() {
    onChange([...opts, { label: '', value: '' }])
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-ink-muted">Choices</p>
      <div className="space-y-1.5">
        {opts.length === 0 && (
          <p className="text-xs text-ink-faint italic">No options yet — add one below.</p>
        )}
        {opts.map((opt, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <input
              className="h-8 flex-1 rounded-lg border border-surface-border px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400"
              value={opt.label}
              placeholder={`Option ${index + 1}`}
              onChange={(e) => updateLabel(index, e.target.value)}
            />
            <button
              type="button"
              aria-label="Remove option"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-surface-border text-ink-muted hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              onClick={() => removeOption(index)}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-2 flex h-7 items-center gap-1 rounded-lg border border-dashed border-surface-border px-2.5 text-xs text-ink-muted hover:border-brand-300 hover:text-brand-600"
        onClick={addOption}
      >
        <Plus size={12} />
        Add option
      </button>
    </div>
  )
}

export function FieldSettingsPanel({ field, onChange }) {
  if (!field) return null

  if (field.type === 'divider') {
    return (
      <PanelWrap>
        <p className="text-xs text-ink-muted">No settings for divider.</p>
      </PanelWrap>
    )
  }

  if (field.type === 'heading' || field.type === 'paragraph') {
    return (
      <PanelWrap>
        <Row label={field.type === 'heading' ? 'Heading text' : 'Paragraph text'}>
          <textarea
            className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
            rows={3}
            value={field.label || ''}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder={field.type === 'heading' ? 'Enter heading…' : 'Enter paragraph text…'}
          />
        </Row>
      </PanelWrap>
    )
  }

  if (field.type === 'hidden') {
    return (
      <PanelWrap>
        <Row label="CRM key (field name)">
          <input
            className={inputCls}
            value={field.crmField || ''}
            placeholder="e.g. lead.source or custom.campaign"
            onChange={(e) => onChange({ crmField: e.target.value })}
          />
        </Row>
        <Row label="Default value (submitted with form)">
          <input
            className={inputCls}
            value={field.defaultValue || ''}
            placeholder="e.g. google-ads"
            onChange={(e) => onChange({ defaultValue: e.target.value })}
          />
        </Row>
      </PanelWrap>
    )
  }

  if (field.type === 'file') {
    const opts = field.options || {}
    function setOpt(key, value) {
      onChange({ options: { ...opts, [key]: value } })
    }
    return (
      <PanelWrap>
        <Row label="Label">
          <input className={inputCls} value={field.label || ''} onChange={(e) => onChange({ label: e.target.value })} />
        </Row>
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          <input type="checkbox" checked={Boolean(field.isRequired)} onChange={(e) => onChange({ isRequired: e.target.checked })} />
          Required field
        </label>
        <Row label="Accepted file types">
          <select
            className={inputCls}
            value={opts.accept || ''}
            onChange={(e) => setOpt('accept', e.target.value)}
          >
            {FILE_ACCEPT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Row>
        <Row label="Max files allowed">
          <input
            type="number"
            min="1"
            max="20"
            className={inputCls}
            value={opts.maxFiles ?? 1}
            onChange={(e) => setOpt('maxFiles', Math.max(1, Number(e.target.value) || 1))}
          />
        </Row>
        <Row label="Max file size (MB)">
          <input
            type="number"
            min="1"
            max="100"
            className={inputCls}
            value={opts.maxFileSizeMB ?? 10}
            onChange={(e) => setOpt('maxFileSizeMB', Math.max(1, Number(e.target.value) || 1))}
          />
        </Row>
      </PanelWrap>
    )
  }

  const isChoice = CHOICE_TYPES.has(field.type)
  const mappedLeadField = LEAD_CRM_FIELDS.find((item) => item.value === field.crmField)

  function handleLeadMappingChange(value) {
    const selected = LEAD_CRM_FIELDS.find((item) => item.value === value)
    if (!selected) {
      onChange({ crmField: '' })
      return
    }
    onChange({
      crmField: selected.value,
      label: field.label?.trim() ? field.label : selected.label,
      placeholder: field.placeholder?.trim() ? field.placeholder : selected.placeholder,
    })
  }

  return (
    <PanelWrap>
      <Row label="Label">
        <input className={inputCls} value={field.label || ''} onChange={(e) => onChange({ label: e.target.value })} />
      </Row>

      {!isChoice && field.type !== 'date' && (
        <Row label="Placeholder">
          <input className={inputCls} value={field.placeholder || ''} onChange={(e) => onChange({ placeholder: e.target.value })} />
        </Row>
      )}

      <label className="flex items-center gap-2 text-xs text-ink-muted">
        <input type="checkbox" checked={Boolean(field.isRequired)} onChange={(e) => onChange({ isRequired: e.target.checked })} />
        Required field
      </label>

      {!isChoice && TEXT_TYPES.has(field.type) && (
        <Row label="Max character limit">
          <input
            type="number"
            min="1"
            className={inputCls}
            value={field.maxLength ?? ''}
            placeholder="No limit"
            onChange={(e) => onChange({ maxLength: e.target.value ? Number(e.target.value) : null })}
          />
        </Row>
      )}

      {isChoice && (
        <OptionsEditor
          options={Array.isArray(field.options) ? field.options : []}
          onChange={(opts) => onChange({ options: opts })}
        />
      )}

      <Row label="CRM mapping (Lead fields)">
        <select
          className={inputCls}
          value={mappedLeadField ? mappedLeadField.value : ''}
          onChange={(e) => handleLeadMappingChange(e.target.value)}
        >
          <option value="">Select lead field</option>
          {LEAD_CRM_FIELDS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Row>

      <Row label="Custom CRM key (optional)">
        <input
          className={inputCls}
          value={field.crmField || ''}
          placeholder="custom.budget_range"
          onChange={(e) => onChange({ crmField: e.target.value })}
        />
      </Row>
    </PanelWrap>
  )
}
