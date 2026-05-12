import { cn } from '@/utils/cn'
import { STATUS_STYLES } from '@/features/leads/constants'

function formatPipelineLabel(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/** Primary label is pipeline stage (`opportunityStage`); legacy enum `status` is fallback only. */
export function LeadStatusBadge({ status, pipelineStage }) {
  const pipe = String(pipelineStage || '').trim()
  if (pipe) {
    return (
      <span
        className={cn(
          'inline-flex rounded-lg border px-2.5 py-0.5 text-xs font-semibold',
          'border-violet-200 bg-violet-50 text-violet-800',
        )}
      >
        {formatPipelineLabel(pipe)}
      </span>
    )
  }
  return (
    <span className={cn('inline-flex rounded-lg border px-2.5 py-0.5 text-xs font-semibold capitalize', STATUS_STYLES[status] || STATUS_STYLES.new)}>
      {status || 'new'}
    </span>
  )
}
