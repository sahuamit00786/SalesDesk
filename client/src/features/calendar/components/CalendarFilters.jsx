import { CALENDAR_FILTERS } from '../eventColors'
import { Video, CheckSquare, Phone, TrendingUp, Bell } from 'lucide-react'
import { cn } from '@/utils/cn'

const iconMap = {
  Video,
  CheckSquare,
  Phone,
  TrendingUp,
  Bell,
}

export function CalendarFilters({ selectedTypes, onChange, counts = {}, className }) {
  const toggleType = (typeId) => {
    if (selectedTypes.includes(typeId)) {
      onChange(selectedTypes.filter(t => t !== typeId))
    } else {
      onChange([...selectedTypes, typeId])
    }
  }

  const clearAll = () => onChange([])

  return (
    <div className={cn('space-y-1.5 rounded-xl border border-gray-200 bg-gray-50 p-2', className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          My Calendars
        </h4>
        <button
          type="button"
          onClick={clearAll}
          className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:underline"
        >
          Clear all
        </button>
      </div>
      <div className="space-y-1">
        {CALENDAR_FILTERS.map(filter => {
          const isSelected = selectedTypes.includes(filter.id)
          const Icon = iconMap[filter.icon]
          const count = counts[filter.id] || 0

          return (
            <button
              type="button"
              key={filter.id}
              onClick={() => toggleType(filter.id)}
              className={cn(
                'w-full flex items-center gap-1.5 px-1.5 py-1 rounded-md transition-all border',
                isSelected
                  ? 'bg-white border-brand-200 shadow-sm'
                  : 'bg-white/50 border-transparent hover:bg-white/80',
                isSelected ? 'opacity-100' : 'opacity-70'
              )}
            >
              <input
                type="checkbox"
                checked={isSelected}
                readOnly
                className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 pointer-events-none shrink-0"
              />
              <div
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: filter.color }}
              />
              <span className="flex-1 text-[12px] font-medium text-gray-700 text-left whitespace-nowrap">
                {filter.label}
              </span>
              <span className="text-[11px] font-semibold text-gray-500 min-w-[1.25rem] text-right">
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
