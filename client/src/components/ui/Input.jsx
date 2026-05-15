import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

/** Shared field chrome: slate border, brand focus ring (used by IconInput, PasswordInput). */
export const inputFieldClassName = cn(
  'w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white shadow-sm',
  'text-sm text-ink placeholder:text-ink-faint/90',
  'outline-none transition-all duration-150',
  'hover:border-slate-400',
  'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15',
  'disabled:opacity-50 disabled:cursor-not-allowed',
)

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputFieldClassName, className)} {...props} />
})
