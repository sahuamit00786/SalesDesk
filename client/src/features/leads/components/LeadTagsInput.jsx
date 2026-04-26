import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/Input'

const PRESET_COLORS = ['#3b73f5', '#16a34a', '#dc2626', '#d97706', '#0891b2', '#9333ea', '#f43f5e', '#64748b']

export function LeadTagsInput({ value = [], onChange }) {
  const [draft, setDraft] = useState('')
  const tags = useMemo(() => (Array.isArray(value) ? value : []), [value])

  function addTag(name) {
    const trimmed = name.trim().toLowerCase()
    if (!trimmed || tags.includes(trimmed)) return
    onChange?.([...tags, trimmed])
    setDraft('')
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, idx) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-semibold" style={{ borderColor: PRESET_COLORS[idx % PRESET_COLORS.length] + '50', color: PRESET_COLORS[idx % PRESET_COLORS.length], background: PRESET_COLORS[idx % PRESET_COLORS.length] + '1A' }}>
            {tag}
            <button type="button" onClick={() => onChange?.(tags.filter((t) => t !== tag))}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        placeholder="Search or create tag..."
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            addTag(draft)
          }
        }}
      />
    </div>
  )
}
