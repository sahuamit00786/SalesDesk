import { LeadCard } from '@/features/leads/components/LeadCard'
import { STATUS_OPTIONS } from '@/features/leads/constants'

export function LeadsKanban({ leads = [] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {STATUS_OPTIONS.slice(0, 4).map((status) => (
        <div key={status} className="space-y-3 rounded-2xl border border-surface-border bg-surface-muted p-3">
          <p className="text-sm font-semibold capitalize text-ink">{status}</p>
          {(leads || []).filter((lead) => lead.status === status).map((lead) => <LeadCard key={lead.id} lead={lead} />)}
        </div>
      ))}
    </div>
  )
}
