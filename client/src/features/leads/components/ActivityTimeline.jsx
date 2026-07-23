import { useState } from 'react'
import { useCreateLeadActivityMutation, useGetLeadActivitiesQuery } from '@/features/leads/leadsApi'
import { usePermission } from '@/hooks/usePermission'

export function ActivityTimeline({ leadId }) {
  const { data } = useGetLeadActivitiesQuery({ id: leadId, page: 1, limit: 50 }, { skip: !leadId })
  const [createActivity] = useCreateLeadActivityMutation()
  const [draft, setDraft] = useState('')
  const canCreate = usePermission('main.leads', 'create')
  const items = data?.data || []

  return (
    <section className="rounded-2xl border border-surface-border p-6">
      <h2 className="text-base font-semibold text-ink">Activity Timeline</h2>
      <div className="mt-4 space-y-3">
        {items.map((a) => (
          <div key={a.id} className="rounded-xl border border-surface-border p-3">
            <p className="text-sm font-medium text-ink capitalize">{a.type.replace('_', ' ')}</p>
            <p className="text-sm text-ink-muted">{a.body || '-'}</p>
          </div>
        ))}
        {items.length === 0 ? <p className="text-sm text-ink-muted">No activity yet.</p> : null}
      </div>
      {canCreate ? (
        <div className="mt-4 flex gap-2">
          <input className="h-10 flex-1 rounded-xl border border-surface-border px-3.5" placeholder="Add note..." value={draft} onChange={(e) => setDraft(e.target.value)} />
          <button type="button" className="h-10 rounded-xl bg-[var(--brand-primary)] px-5 text-white" onClick={async () => { if (!draft.trim()) return; await createActivity({ id: leadId, type: 'note', body: draft }).unwrap(); setDraft('') }}>Add</button>
        </div>
      ) : null}
    </section>
  )
}
