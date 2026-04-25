import { cn } from '@/utils/cn'

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'w-full min-h-[80px] px-3.5 py-2.5 rounded-xl border border-surface-border bg-white',
        'text-sm text-ink placeholder:text-ink-faint',
        'outline-none transition-all duration-150',
        'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
        'hover:border-brand-300',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  )
}
