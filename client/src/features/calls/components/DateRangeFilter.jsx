import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, X } from 'lucide-react'
import { cn } from '@/utils/cn'

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7d', label: 'Last 7 days' },
  { value: 'last30d', label: 'Last 30 days' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'last6m', label: 'Last 6 months' },
  { value: 'custom', label: 'Custom date range' },
]

export function DateRangeFilter({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const menuRef = useRef(null)

  const preset = DATE_PRESETS.find((p) => p.value === value)
  const displayLabel = preset?.label || 'Select date range'

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

  function handlePresetSelect(presetValue) {
    if (presetValue === 'custom') {
      setCustomStart('')
      setCustomEnd('')
    }
    onChange({ preset: presetValue, customStart: '', customEnd: '' })
    setOpen(false)
  }

  function handleCustomApply() {
    if (!customStart || !customEnd) return
    onChange({ preset: 'custom', customStart, customEnd })
    setOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-surface-border bg-white px-3 text-xs font-semibold text-ink shadow-sm hover:bg-surface-subtle whitespace-nowrap"
      >
        <Calendar className="h-3.5 w-3.5 text-ink-muted" />
        {displayLabel}
        <ChevronDown className={cn('h-3.5 w-3.5 text-ink-muted transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-11 left-0 z-30 w-72 rounded-xl border border-surface-border bg-white p-3 shadow-lg">
          <div className="space-y-2">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => handlePresetSelect(p.value)}
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition',
                  value === p.value
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink hover:bg-surface-subtle',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {value === 'custom' && (
            <div className="mt-3 space-y-2 border-t border-surface-border pt-3">
              <label className="block">
                <span className="mb-1 text-[10px] font-semibold uppercase text-ink-muted">From</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-9 w-full rounded-lg border border-surface-border px-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 text-[10px] font-semibold uppercase text-ink-muted">To</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-9 w-full rounded-lg border border-surface-border px-2 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={handleCustomApply}
                disabled={!customStart || !customEnd}
                className="w-full rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white disabled:bg-neutral-300"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
