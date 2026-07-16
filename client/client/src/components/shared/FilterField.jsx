import { cn } from '@/utils/cn'

/** Small label above a filter input/select, so bare date/number/select filters aren't unlabeled. */
export function FilterField({ label, children, className }) {
  return (
    <div className={cn('flex shrink-0 flex-col gap-0.5', className)}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">{label}</span>
      {children}
    </div>
  )
}
