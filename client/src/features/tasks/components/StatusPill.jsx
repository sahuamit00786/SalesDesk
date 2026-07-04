import { useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useOutsideClick } from '@/hooks/useOutsideClick'
import { cn } from '@/utils/cn'
import { STATUS_META } from '../taskConstants'

const STATUS_ORDER = ['pending', 'in_progress', 'completed', 'cancelled']

export function StatusPill({ value, className }) {
  const meta = STATUS_META[value] || STATUS_META.pending
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1', meta.pill, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
      {meta.label}
    </span>
  )
}

export function StatusPillMenu({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useOutsideClick(ref, () => setOpen(false), open)
  const meta = STATUS_META[value] || STATUS_META.pending

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 transition hover:brightness-95 disabled:opacity-50',
          meta.pill,
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
        {meta.label}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1 w-40 rounded-xl border border-[#E5E7EB] bg-white p-1.5 shadow-lg">
          {STATUS_ORDER.map((id) => {
            const m = STATUS_META[id]
            return (
              <button
                key={id}
                type="button"
                onClick={() => { setOpen(false); if (id !== value) onChange?.(id) }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
                  id === value ? 'bg-violet-50 text-violet-800' : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', m.dot)} aria-hidden />
                <span className="flex-1 text-left">{m.label}</span>
                {id === value ? <Check className="h-3.5 w-3.5" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
