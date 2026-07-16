import { useEffect, useState } from 'react'
import { GripVertical, Plus, Trash2 } from '@/components/ui/icons'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { Button } from '@/components/ui/Button'
import { usePatchCampaignStagesMutation } from '@/features/campaigns/campaignsApi'

function slugify(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** Custom pipeline editor: rename, reorder, add, or remove campaign stages. */
export function CampaignStageEditorDrawer({ open, onClose, campaignId, stages }) {
  const [rows, setRows] = useState([])
  const [patchStages, { isLoading: saving }] = usePatchCampaignStagesMutation()

  useEffect(() => {
    if (open) setRows((stages || []).map((s, i) => ({ key: s.key, label: s.label, sortOrder: s.sortOrder ?? i })))
  }, [open, stages])

  const moveRow = (index, dir) => {
    setRows((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next.map((r, i) => ({ ...r, sortOrder: i }))
    })
  }

  const updateLabel = (index, label) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, label } : r)))
  }

  const addRow = () => {
    setRows((prev) => [...prev, { key: '', label: '', sortOrder: prev.length, __new: true }])
  }

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index).map((r, i) => ({ ...r, sortOrder: i })))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const payload = rows.map((r, i) => ({
      key: r.__new ? slugify(r.label) : r.key,
      label: r.label.trim(),
      sortOrder: i,
    }))
    if (payload.some((r) => !r.key || !r.label)) return
    try {
      await patchStages({ campaignId, stages: payload }).unwrap()
      onClose()
    } catch { /* toast handled in api */ }
  }

  return (
    <RightDrawer open={open} onClose={onClose} title="Edit campaign stages">
      <form onSubmit={onSubmit} className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="mb-3 text-xs text-neutral-500">
            Rename, reorder, add, or remove pipeline stages. A stage still holding leads can&apos;t be removed —
            move those leads first.
          </p>
          <div className="flex flex-col gap-2">
            {rows.map((r, i) => (
              <div key={r.key || `new-${i}`} className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-2">
                <div className="flex flex-col">
                  <button type="button" disabled={i === 0} onClick={() => moveRow(i, -1)} className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30">
                    <GripVertical className="h-3.5 w-3.5 rotate-90" />
                  </button>
                </div>
                <input
                  value={r.label}
                  onChange={(e) => updateLabel(i, e.target.value)}
                  placeholder="Stage label"
                  required
                  className="h-8 flex-1 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  title="Move down"
                  disabled={i === rows.length - 1}
                  onClick={() => moveRow(i, 1)}
                  className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                >
                  <GripVertical className="h-3.5 w-3.5 -rotate-90" />
                </button>
                <button
                  type="button"
                  title="Remove stage"
                  onClick={() => removeRow(i)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="secondary" className="mt-3 w-full" onClick={addRow}>
            <Plus className="h-3.5 w-3.5" /> Add stage
          </Button>
        </div>
        <div className="border-t border-neutral-100 px-4 py-3">
          <Button type="submit" size="sm" className="w-full" disabled={saving || !rows.length}>
            {saving ? 'Saving…' : 'Save stages'}
          </Button>
        </div>
      </form>
    </RightDrawer>
  )
}
