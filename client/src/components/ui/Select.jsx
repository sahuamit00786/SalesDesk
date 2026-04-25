import { cn } from '@/utils/cn'

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'w-full h-10 px-3.5 rounded-xl border border-surface-border bg-white',
        'text-sm text-ink',
        'outline-none transition-all duration-150',
        'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
        'hover:border-brand-300',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
