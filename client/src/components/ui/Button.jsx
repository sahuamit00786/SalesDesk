import { cn } from '@/utils/cn'

const variants = {
  primary:
    'h-10 px-5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors duration-150 shadow-sm',
  secondary:
    'h-10 px-5 rounded-xl border border-surface-border bg-white hover:bg-surface-muted text-ink text-sm font-medium transition-colors duration-150',
  danger:
    'h-10 px-5 rounded-xl bg-danger hover:bg-red-700 text-white text-sm font-semibold transition-colors duration-150',
  icon: 'h-9 w-9 rounded-xl flex items-center justify-center text-ink-muted hover:bg-surface-subtle transition-colors duration-150',
}

export function Button({ variant = 'primary', className, type = 'button', ...props }) {
  return (
    <button type={type} className={cn(variants[variant], className)} {...props} />
  )
}
