import { cn } from '@/utils/cn'

export function PageTabButton({ active, className, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'h-10 rounded-xl border px-3 text-xs font-medium transition-colors',
        active
          ? 'border-brand-600 bg-[var(--brand-primary)] text-white'
          : 'border-surface-border bg-white text-ink-muted hover:border-brand-200 hover:bg-brand-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
