import { cn } from '@/utils/cn'
import { controlHeight, controlRadius } from '@/components/ui/fieldTokens'

const variants = {
  primary: cn(
    'inline-flex items-center justify-center gap-2 px-5 text-white text-sm font-semibold shadow-sm',
    controlHeight,
    controlRadius,
    'cx-btn-primary cx-icon-inherit transition-colors duration-150',
  ),
  secondary: cn(
    'inline-flex items-center justify-center gap-2 px-5 text-ink text-sm font-medium',
    controlHeight,
    controlRadius,
    'border border-surface-border bg-white hover:border-brand-300 hover:bg-brand-50 transition-colors duration-150',
  ),
  soft: cn(
    'inline-flex items-center justify-center gap-2 px-5 text-brand-700 text-sm font-semibold',
    controlHeight,
    controlRadius,
    'bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors duration-150',
  ),
  danger: cn(
    'inline-flex items-center justify-center gap-2 px-5 text-white text-sm font-semibold',
    controlHeight,
    controlRadius,
    'bg-danger hover:bg-red-700 cx-icon-inherit transition-colors duration-150',
  ),
  icon: cn(
    'inline-flex items-center justify-center h-9 w-9 rounded-xl text-ink-muted hover:bg-brand-50 hover:text-brand-700 transition-colors duration-150',
  ),
}

export function Button({ variant = 'primary', className, type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={cn(variants[variant], 'disabled:pointer-events-none disabled:opacity-50', className)}
      {...props}
    />
  )
}
