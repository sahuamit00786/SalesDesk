import { forwardRef } from 'react'
import { cn } from '@/utils/cn'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'

export const IconInput = forwardRef(function IconInput(
  { icon: Icon, wrapperClassName, className, iconClassName, ...props },
  ref,
) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <Icon
        className={cn(
          'pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted',
          iconClassName,
        )}
        strokeWidth={1.75}
        aria-hidden
      />
      <Input ref={ref} className={cn('pl-9', className)} {...props} />
    </div>
  )
})

export const IconTextarea = forwardRef(function IconTextarea(
  { icon: Icon, wrapperClassName, className, iconClassName, rows, ...props },
  ref,
) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <Icon
        className={cn('pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-ink-muted', iconClassName)}
        strokeWidth={1.75}
        aria-hidden
      />
      <Textarea ref={ref} className={cn('min-h-[84px] pl-9 pt-2.5', className)} rows={rows} {...props} />
    </div>
  )
})
