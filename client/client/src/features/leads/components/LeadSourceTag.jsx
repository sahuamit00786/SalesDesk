import { SOURCE_LABELS } from '@/features/leads/constants'

export function LeadSourceTag({ source }) {
  return (
    <span className="inline-flex rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
      {SOURCE_LABELS[source] || SOURCE_LABELS.other}
    </span>
  )
}
