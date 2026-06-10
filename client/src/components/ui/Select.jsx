import { cn } from '@/utils/cn'
import { controlClassName } from '@/components/ui/fieldTokens'

export function Select({ className, children, ...props }) {
  return (
    <select className={cn(controlClassName, className)} {...props}>
      {children}
    </select>
  )
}
