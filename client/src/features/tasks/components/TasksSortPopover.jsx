import { useRef } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useOutsideClick } from '@/hooks/useOutsideClick'
import { cn } from '@/utils/cn'
import { SORT_OPTIONS } from '../taskConstants'

export function TasksSortPopover({ sortBy, sortDir, onChange, onClose }) {
  const ref = useRef(null)
  useOutsideClick(ref, onClose)

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-30 mt-1 w-52 rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-lg"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Sort by</p>
      <div className="flex flex-col gap-1">
        {SORT_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value, sortBy === o.value && sortDir === 'asc' ? 'desc' : 'asc')}
            className={cn(
              'flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
              sortBy === o.value
                ? 'bg-violet-50 text-violet-800'
                : 'text-gray-700 hover:bg-gray-50',
            )}
          >
            {o.label}
            {sortBy === o.value
              ? sortDir === 'asc'
                ? <ArrowUp className="h-3.5 w-3.5" />
                : <ArrowDown className="h-3.5 w-3.5" />
              : <ArrowUpDown className="h-3.5 w-3.5 text-gray-300" />}
          </button>
        ))}
      </div>
    </div>
  )
}
