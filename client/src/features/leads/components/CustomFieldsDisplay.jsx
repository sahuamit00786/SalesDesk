import { Hash } from 'lucide-react'
import { formatCustomFieldDisplayValue } from '@/features/leads/customFieldTypes'

function DisplayRow({ label, value, href }) {
  const display = value ?? '-'
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-ink-muted">{label}</p>
      {href && display !== '-' ? (
        <a href={href} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-700 hover:underline">
          {display}
        </a>
      ) : (
        <p className="text-xs font-medium text-ink">{display}</p>
      )}
    </div>
  )
}

export function CustomFieldsDisplay({ fields = [], values = {} }) {
  if (!fields.length) return null

  const rows = fields
    .map((field) => {
      const raw = values[field.key]
      const formatted = formatCustomFieldDisplayValue(field.type, raw)
      if (formatted === '-') return null
      let href
      if (field.type === 'url' && raw) {
        href = String(raw).startsWith('http') ? String(raw) : `https://${raw}`
      }
      if (field.type === 'email' && raw) href = `mailto:${raw}`
      if (field.type === 'phone' && raw) href = `tel:${String(raw).replace(/\s+/g, '')}`
      return { field, formatted, href }
    })
    .filter(Boolean)

  if (!rows.length) return null

  return (
    <>
      <div className="border-t border-surface-border pt-2">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Additional info</p>
      </div>
      {rows.map(({ field, formatted, href }) => (
        <DisplayRow key={field.id || field.key} label={field.label} value={formatted} href={href} />
      ))}
    </>
  )
}

export function CustomFieldsDisplayIcon() {
  return Hash
}
