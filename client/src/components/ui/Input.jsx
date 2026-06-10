import { forwardRef } from 'react'
import { cn } from '@/utils/cn'
import { controlClassName } from '@/components/ui/fieldTokens'

/** Shared field chrome for CRM inputs */
export const inputFieldClassName = controlClassName

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputFieldClassName, className)} {...props} />
})
