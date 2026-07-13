import { useRef, useEffect, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/utils/cn'

const HAS_LEAD_OPTIONS = [
  { value: '', label: 'All calls' },
  { value: 'true', label: 'With lead' },
  { value: 'false', label: 'No lead' },
]

const OUTCOME_OPTIONS = [
  { value: '', label: 'All outcomes' },
  { value: 'connected', label: 'Connected' },
  { value: 'no_answer', label: 'No answer' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'followup_needed', label: 'Follow-up needed' },
]

const DURATION_PRESETS = [
  { min: 0, max: 60, label: '< 1 min' },
  { min: 60, max: 300, label: '1-5 min' },
  { min: 300, max: 900, label: '5-15 min' },
  { min: 900, max: null, label: '15+ min' },
]

export function MoreFiltersMenu({
  hasLead,
  outcome,
  durationMin,
  durationMax,
  sortBy,
  sortOrder,
  activeSecondaryCount,
  onHasLeadChange,
  onOutcomeChange,
  onDurationChange,
  onSortChange,
  onClearSecondary,
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  function applyDurationPreset(min, max) {
    onDurationChange({ min, max })
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold shadow-sm whitespace-nowrap',
          open || activeSecondaryCount > 0
            ? 'border-brand-200 bg-brand-50 text-brand-700'
            : 'border-surface-border bg-white text-ink hover:bg-surface-subtle',
        )}
      >
        More filters
        {activeSecondaryCount > 0 && (
          <span className="rounded-full bg-[var(--brand-primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {activeSecondaryCount}
          </span>
        )}
        <ChevronDown className={cn('h-3.5 w-3.5 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-11 right-0 z-30 w-80 rounded-xl border border-surface-border bg-white p-4 shadow-lg">
          <div className="space-y-4">
            {/* Lead Association */}
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Lead</span>
              <select
                className="h-9 w-full rounded-lg border border-surface-border px-2 text-sm"
                value={hasLead}
                onChange={(e) => onHasLeadChange(e.target.value)}
              >
                {HAS_LEAD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Outcome */}
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Outcome</span>
              <select
                className="h-9 w-full rounded-lg border border-surface-border px-2 text-sm"
                value={outcome}
                onChange={(e) => onOutcomeChange(e.target.value)}
              >
                {OUTCOME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Duration */}
            <div className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Duration</span>
              <div className="mb-2 flex gap-2">
                <input
                  type="number"
                  placeholder="Min (sec)"
                  value={durationMin ?? ''}
                  onChange={(e) => onDurationChange({ min: e.target.value ? parseInt(e.target.value) : null, max: durationMax })}
                  className="h-9 flex-1 rounded-lg border border-surface-border px-2 text-sm"
                  min="0"
                />
                <input
                  type="number"
                  placeholder="Max (sec)"
                  value={durationMax ?? ''}
                  onChange={(e) => onDurationChange({ min: durationMin, max: e.target.value ? parseInt(e.target.value) : null })}
                  className="h-9 flex-1 rounded-lg border border-surface-border px-2 text-sm"
                  min="0"
                />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyDurationPreset(preset.min, preset.max)}
                    className={cn(
                      'rounded-lg px-2 py-1.5 text-[10px] font-semibold transition',
                      durationMin === preset.min && (preset.max === null || durationMax === preset.max)
                        ? 'bg-brand-50 text-brand-700'
                        : 'border border-surface-border bg-white text-ink hover:bg-surface-subtle',
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sorting */}
            <div className="block pt-2 border-t border-surface-border">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Sort by</span>
              <select
                className="h-9 w-full rounded-lg border border-surface-border px-2 text-sm mb-2"
                value={sortBy}
                onChange={(e) => onSortChange({ sortBy: e.target.value, sortOrder })}
              >
                <option value="date">Date</option>
                <option value="duration">Duration</option>
              </select>
              <select
                className="h-9 w-full rounded-lg border border-surface-border px-2 text-sm"
                value={sortOrder}
                onChange={(e) => onSortChange({ sortBy, sortOrder: e.target.value })}
              >
                <option value="desc">{sortBy === 'date' ? 'Newest first' : 'Longest first'}</option>
                <option value="asc">{sortBy === 'date' ? 'Oldest first' : 'Shortest first'}</option>
              </select>
            </div>

            {/* Clear Button */}
            {activeSecondaryCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClearSecondary()
                  setOpen(false)
                }}
                className="w-full rounded-lg border border-rose-200 bg-white py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
              >
                Clear secondary filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
