import { cn } from '@/utils/cn'

/**
 * Unified Card component with consistent border, shadow, and radius.
 * Replaces ad-hoc `div className="bg-white rounded-xl border border-gray-100 shadow-sm"`
 */

export function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-100 shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Header = function CardHeader({ children, className, ...props }) {
  return (
    <div className={cn('px-5 py-4 border-b border-gray-100', className)} {...props}>
      {children}
    </div>
  )
}

Card.Body = function CardBody({ children, className, ...props }) {
  return (
    <div className={cn('px-5 py-4', className)} {...props}>
      {children}
    </div>
  )
}

Card.KPI = function CardKPI({ children, className, accentColor = 'bg-brand-600', ...props }) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden', className)} {...props}>
      <div className={cn('h-1 w-full', accentColor)} />
      <div className="px-5 py-4">
        {children}
      </div>
    </div>
  )
}

export default Card
