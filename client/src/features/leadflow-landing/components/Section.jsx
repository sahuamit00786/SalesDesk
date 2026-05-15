import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

export const Section = forwardRef(function Section({ id, className, children, ...rest }, ref) {
  return (
    <section ref={ref} id={id} className={cn('relative scroll-mt-20', className)} {...rest}>
      {children}
    </section>
  )
})
