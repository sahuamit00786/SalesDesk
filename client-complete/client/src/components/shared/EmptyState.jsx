import { cn } from '@/utils/cn'

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-surface-border bg-white p-10 text-center',
        className,
      )}
    >
      {Icon ? <Icon className="h-10 w-10 text-ink-faint" aria-hidden /> : null}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description ? <p className="text-sm text-ink-muted max-w-sm">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
