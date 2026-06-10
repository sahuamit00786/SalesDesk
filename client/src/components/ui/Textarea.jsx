import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

export const textareaFieldClassName = cn(
  'w-full min-h-[80px] px-3.5 py-2.5 rounded-xl border border-surface-field bg-white shadow-sm',
  'text-sm text-ink placeholder:text-ink-faint/90',
  'outline-none transition-all duration-150',
  'hover:border-brand-700',
  'focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15',
  'disabled:opacity-50 disabled:cursor-not-allowed',
)

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(textareaFieldClassName, className)} {...props} />
})
