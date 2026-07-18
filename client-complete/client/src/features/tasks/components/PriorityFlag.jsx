import { useRef, useState } from 'react'
import { Check, Flag } from '@/components/ui/icons'
import { useOutsideClick } from '@/hooks/useOutsideClick'
import { cn } from '@/utils/cn'
import { PRIORITY_META } from '../taskConstants'

const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low']

export function PriorityFlag({ value, className }) {
  const meta = PRIORITY_META[value] || PRIORITY_META.medium
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', className)}>
      <Flag className={cn('h-3.5 w-3.5 fill-current', meta.flagClass)} strokeWidth={1.5} />
      <span className={cn('font-medium', meta.textClass)}>{meta.label}</span>
    </span>
  )
}

export function PriorityFlagMenu({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useOutsideClick(ref, () => setOpen(false), open)
  const meta = PRIORITY_META[value] || PRIORITY_META.medium

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition hover:bg-gray-100 disabled:opacity-50"
      >
        <Flag className={cn('h-3.5 w-3.5 fill-current', meta.flagClass)} strokeWidth={1.5} />
        <span className={cn('font-medium', meta.textClass)}>{meta.label}</span>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1 w-36 rounded-xl border border-[#E5E7EB] bg-white p-1.5 shadow-lg">
          {PRIORITY_ORDER.map((id) => {
            const m = PRIORITY_META[id]
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
                <Flag className={cn('h-3.5 w-3.5 fill-current', m.flagClass)} strokeWidth={1.5} />
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
