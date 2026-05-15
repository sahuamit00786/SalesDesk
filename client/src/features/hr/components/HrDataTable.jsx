import { cn } from '@/utils/cn'

export function HrDataTable({ children, className, minWidth = '640px' }) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-surface-border/80', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          {children}
        </table>
      </div>
    </div>
  )
}

export function HrTableHead({ children }) {
  return (
    <thead>
      <tr className="border-b border-surface-border bg-gradient-to-r from-surface-subtle to-white">
        {children}
      </tr>
    </thead>
  )
}

export function HrTh({ children, className }) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted first:pl-5 last:pr-5',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function HrTableBody({ children }) {
  return <tbody className="divide-y divide-surface-border/80 bg-white">{children}</tbody>
}

export function HrTr({ children, className }) {
  return (
    <tr className={cn('transition-colors hover:bg-brand-50/30', className)}>{children}</tr>
  )
}

export function HrTd({ children, className, muted }) {
  return (
    <td
      className={cn(
        'px-4 py-3.5 first:pl-5 last:pr-5',
        muted ? 'text-ink-muted' : 'text-ink',
        className,
      )}
    >
      {children}
    </td>
  )
}
