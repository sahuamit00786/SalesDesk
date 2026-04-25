import { cn } from '@/utils/cn'

export function Loader({ className, label = 'Loading' }) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-9 w-9 rounded-full border-2 border-surface-border border-t-brand-500 animate-spin" />
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  )
}
