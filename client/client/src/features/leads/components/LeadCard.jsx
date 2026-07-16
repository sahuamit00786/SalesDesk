import { LeadStatusBadge } from '@/features/leads/components/LeadStatusBadge'
import { LeadScorePill } from '@/features/leads/components/LeadScorePill'
import { LeadSourceTag } from '@/features/leads/components/LeadSourceTag'

export function LeadCard({ lead }) {
  return (
    <div className="rounded-2xl border border-surface-border bg-white p-4">
      <p className="font-semibold text-ink">{lead.contactName || lead.title}</p>
      <p className="text-xs text-ink-muted">{lead.company || '-'}</p>
      <div className="mt-3 flex items-center gap-2">
        <LeadStatusBadge status={lead.status} pipelineStage={lead.opportunityStage} />
        <LeadSourceTag source={lead.source} />
      </div>
      <div className="mt-3"><LeadScorePill score={lead.score || 0} /></div>
    </div>
  )
}
