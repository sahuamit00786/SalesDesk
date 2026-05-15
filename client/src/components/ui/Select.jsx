import { cn } from '@/utils/cn'

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white shadow-sm',
        'text-sm text-ink',
        'outline-none transition-all duration-150',
        'hover:border-slate-400',
        'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
