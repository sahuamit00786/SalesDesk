import { cn } from '@/utils/cn'

export function HrEmptyState({ icon: Icon, title, description, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-surface-border bg-surface-subtle/50 px-6 py-12 text-center',
        className,
      )}
    >
      {Icon ? (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-surface-border bg-white text-ink-muted shadow-sm">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
      ) : null}
      {title ? <p className="text-sm font-semibold text-ink">{title}</p> : null}
      {description ? <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p> : null}
    </div>
  )
}
