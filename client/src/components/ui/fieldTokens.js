import { cn } from '@/utils/cn'

export const controlHeight = 'h-10'
export const controlRadius = 'rounded-xl'
export const controlText = 'text-sm text-ink'
export const controlPlaceholder = 'placeholder:text-ink-faint/90'

export const controlBorder =
  'border border-surface-field bg-white shadow-sm hover:border-brand-700'

export const controlFocus =
  'outline-none transition-all duration-150 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15'

export const controlDisabled = 'disabled:opacity-50 disabled:cursor-not-allowed'

/** Shared input/select chrome for CRM forms and filter bars */
export const controlClassName = cn(
  'w-full px-3.5',
  controlHeight,
  controlRadius,
  controlBorder,
  controlText,
  controlPlaceholder,
  controlFocus,
  controlDisabled,
)
