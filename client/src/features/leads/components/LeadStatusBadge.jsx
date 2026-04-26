import { cn } from '@/utils/cn'
import { STATUS_STYLES } from '@/features/leads/constants'

export function LeadStatusBadge({ status }) {
  return (
    <span className={cn('inline-flex rounded-lg border px-2.5 py-0.5 text-xs font-semibold capitalize', STATUS_STYLES[status] || STATUS_STYLES.new)}>
      {status || 'new'}
    </span>
  )
}
