import { cn } from '@/utils/cn'
import { getLeaveTypeStyle, HOLIDAY_BADGE } from '@/features/leave/constants/leaveTypeStyles'

export function LeaveCalendarBadge({ label, bgClass, pending, subtitle }) {
  return (
    <span
      className={cn(
        'flex w-full max-w-full items-center gap-1.5 rounded px-1.5 py-[3px] text-[10px] font-semibold leading-tight text-white shadow-sm',
        bgClass,
        pending && 'ring-1 ring-amber-300/80 ring-offset-1 ring-offset-white',
      )}
      title={subtitle || label}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" aria-hidden />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  )
}

export function LeaveTypeBadge({ leaveType, status, showName }) {
  const style = getLeaveTypeStyle(leaveType)
  const pending = status === 'pending'
  const label = showName !== false ? style.label : leaveType?.code || 'Leave'
  return (
    <LeaveCalendarBadge
      label={label}
      bgClass={style.bg}
      pending={pending}
      subtitle={pending ? `${label} (pending approval)` : label}
    />
  )
}

export function HolidayBadge({ name }) {
  return (
    <LeaveCalendarBadge
      label={name?.length > 14 ? `${name.slice(0, 12)}…` : name || HOLIDAY_BADGE.label}
      bgClass={HOLIDAY_BADGE.bg}
      subtitle={name}
    />
  )
}
