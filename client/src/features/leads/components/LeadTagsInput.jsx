import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

function normalizeHexColor(value) {
  const text = String(value || '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(text)) return text
  return '#3b73f5'
}

export function LeadTagsInput({ value = [], onChange, availableTags = [], onCreateTag }) {
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3b73f5')
  const [creating, setCreating] = useState(false)
  const tags = useMemo(
    () => [...new Set((Array.isArray(value) ? value : []).map((t) => String(t || '').trim().toLowerCase()).filter(Boolean))],
    [value],
  )
  const tagMeta = useMemo(() => {
    const map = new Map()
    for (const item of Array.isArray(availableTags) ? availableTags : []) {
      if (typeof item === 'string') {
        const raw = item.trim()
        const name = raw.toLowerCase()
        if (!name) continue
        map.set(name, { name, label: raw, color: '#3b73f5' })
        continue
      }
      const raw = String(item?.name || '').trim()
      const name = raw.toLowerCase()
      if (!name) continue
      map.set(name, { name, label: raw, color: normalizeHexColor(item?.color) })
    }
    return map
  }, [availableTags])
  const options = useMemo(
    () => [...tagMeta.values()].sort((a, b) => a.name.localeCompare(b.name)),
    [tagMeta],
  )

  async function addTag(name, colorOverride = null) {
    const trimmed = name.trim().toLowerCase()
    if (!trimmed || tags.includes(trimmed)) return
    if (!tagMeta.has(trimmed) && onCreateTag) {
      try {
        setCreating(true)
        await onCreateTag({ name: trimmed, color: normalizeHexColor(colorOverride || newTagColor) })
      } finally {
        setCreating(false)
      }
    }
    onChange?.([...tags, trimmed])
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div className="relative">
          <button
            type="button"
            className="h-10 w-full rounded-xl border border-surface-border bg-white px-3 text-left text-sm text-ink outline-none hover:border-brand-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            onClick={() => setSelectorOpen((v) => !v)}
            disabled={creating}
          >
            {tags.length ? `${tags.length} selected` : 'Select tag...'}
          </button>
          {selectorOpen ? (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-surface-border bg-white p-1.5 shadow-xl">
              {options.length ? (
                options.map((item) => {
                  const checked = tags.includes(item.name)
                  const color = normalizeHexColor(item.color)
                  return (
                    <label key={item.name} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-subtle">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) void addTag(item.name, item.color)
                          else onChange?.(tags.filter((t) => t !== item.name))
                        }}
                      />
                      <span className="h-2.5 w-2.5 rounded-full border border-surface-border" style={{ backgroundColor: color }} />
                      <span className="text-ink">{item.label || item.name}</span>
                    </label>
                  )
                })
              ) : (
                <p className="px-2 py-2 text-xs text-ink-muted">No tags available.</p>
              )}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-xl font-semibold text-white hover:bg-[var(--brand-primary-dark)]"
          aria-label="Create tag"
          title="Create tag"
        >
          +
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const color = normalizeHexColor(tagMeta.get(tag)?.color || '#3b73f5')
          return (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-semibold"
              style={{ borderColor: `${color}66`, color, background: `${color}1A` }}
            >
              {tagMeta.get(tag)?.label || tag}
              <button type="button" onClick={() => onChange?.(tags.filter((t) => t !== tag))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )
        })}
      </div>
      {creating ? <p className="text-[11px] text-ink-muted">Creating tag…</p> : null}
      <Modal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false)
          setNewTagName('')
          setNewTagColor('#3b73f5')
        }}
        title="Create tag"
        footer={
          <>
            <button
              type="button"
              className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink-muted"
              onClick={() => {
                setCreateModalOpen(false)
                setNewTagName('')
                setNewTagColor('#3b73f5')
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="h-10 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-medium text-white disabled:opacity-60"
              disabled={!newTagName.trim() || creating}
              onClick={async () => {
                await addTag(newTagName, newTagColor)
                setCreateModalOpen(false)
                setNewTagName('')
                setNewTagColor('#3b73f5')
              }}
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </>
        }
      >
        <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Tag name</label>
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="Enter tag name"
          className="h-10 w-full rounded-xl border border-surface-border px-3.5 text-sm"
        />
        <div className="mt-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Color</label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(normalizeHexColor(e.target.value))}
              className="h-9 w-12 cursor-pointer rounded border border-surface-border bg-white p-1"
            />
            <span className="text-xs text-ink-muted">{newTagColor}</span>
          </div>
        </div>
      </Modal>
    </div>
  )
}
