import { ChevronRight, User, Users } from 'lucide-react'
import { cn } from '@/utils/cn'

export function DisambiguationChips({ block, onSelect, disabled }) {
  return (
    <div className="rounded-2xl border border-brand-200/60 bg-brand-50/30 p-3">
      <p className="mb-2.5 px-1 text-sm font-medium text-ink">{block.prompt}</p>
      <div className="flex flex-col gap-1.5">
        {block.options.map((opt) => {
          const isLead = opt.entityType === 'lead'
          const Icon = isLead ? Users : User
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(opt)}
              className={cn(
                'group flex items-center gap-3 rounded-xl border border-surface-border bg-white px-3 py-2.5 text-left transition-colors',
                'hover:border-brand-300 hover:bg-brand-50/60 disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{opt.label}</span>
                {opt.meta ? <span className="block truncate text-xs text-ink-muted">{opt.meta}</span> : null}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
