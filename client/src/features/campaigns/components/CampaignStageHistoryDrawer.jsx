import { History } from 'lucide-react'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { useGetCampaignLeadStageHistoryQuery } from '@/features/campaigns/campaignsApi'

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/** Read-only audit trail of stage moves for one campaign lead. */
export function CampaignStageHistoryDrawer({ open, onClose, campaignId, leadId, leadName, stageLabelByKey = {} }) {
  const { data: res, isLoading } = useGetCampaignLeadStageHistoryQuery(
    { campaignId, leadId },
    { skip: !open || !campaignId || !leadId },
  )
  const rows = res?.data || []

  const label = (key) => stageLabelByKey[key] || key || '—'

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title={
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-neutral-900">Stage history</span>
          {leadName && <span className="text-xs font-normal text-neutral-500 truncate max-w-[220px]">{leadName}</span>}
        </div>
      }
    >
      <div className="px-4 py-3">
        {isLoading ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : !rows.length ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-200 py-10 text-center">
            <History className="h-5 w-5 text-neutral-300" />
            <p className="text-sm text-neutral-500">No stage changes recorded yet.</p>
          </div>
        ) : (
          <ol className="flex flex-col gap-3">
            {rows.map((r) => (
              <li key={r.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                <p className="text-sm font-semibold text-neutral-900">
                  {r.fromStageKey ? `${label(r.fromStageKey)} → ${label(r.toStageKey)}` : `Set to ${label(r.toStageKey)}`}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {formatDateTime(r.createdAt)} · {r.changedBy?.name || r.changedBy?.email || 'Unknown'}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </RightDrawer>
  )
}
