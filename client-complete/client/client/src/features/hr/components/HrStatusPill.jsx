import { cn } from '@/utils/cn'
import {
  ATTENDANCE_STATUS_STYLES,
  LEAVE_STATUS_STYLES,
  formatStatusLabel,
} from '@/features/hr/constants/statusStyles'

export function HrStatusPill({ status, kind = 'leave', className }) {
  const key = String(status || '').toLowerCase()
  const styles = kind === 'attendance' ? ATTENDANCE_STATUS_STYLES : LEAVE_STATUS_STYLES
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold capitalize',
        styles[key] || 'bg-slate-50 text-slate-700 border-slate-200/80',
        className,
      )}
    >
      {formatStatusLabel(status)}
    </span>
  )
}
