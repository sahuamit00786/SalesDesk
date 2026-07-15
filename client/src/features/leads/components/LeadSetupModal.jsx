import { useState } from 'react'
import toast from 'react-hot-toast'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { useCreateLeadSourceMutation, useGetLeadSetupQuery } from '@/features/leads/leadsApi'

function apiErrorMessage(err) {
  return err?.data?.error?.message ?? err?.error ?? 'Something went wrong'
}

function formatStageLabel(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function LeadSetupModal({ open, onClose }) {
  const { data, isLoading } = useGetLeadSetupQuery(undefined, { skip: !open })
  const [createSource] = useCreateLeadSourceMutation()
  const [sourceName, setSourceName] = useState('')

  const setup = data?.data || { sources: [], pipelineStatuses: [] }

  async function submitCreateSource() {
    try {
      if (!sourceName.trim()) return
      await createSource({ name: sourceName.trim() }).unwrap()
      setSourceName('')
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title="Lead Setup"
      description="Add sources here. Configure lead status (pipeline) stages under Lead configuration."
      footer={
        <button type="button" className="h-10 rounded-xl border border-surface-border px-5" onClick={onClose}>
          Close
        </button>
      }
    >
      {isLoading ? <p className="text-sm text-ink-muted">Loading setup...</p> : null}

      <div className="space-y-4">
        <section className="space-y-2 rounded-2xl border border-surface-border p-4">
          <p className="text-sm font-semibold">Sources</p>
          <div className="flex gap-2">
            <input
              className="h-10 flex-1 rounded-xl border border-surface-border px-3.5"
              placeholder="Add source"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
            />
            <button type="button" className="h-10 rounded-xl bg-[var(--brand-primary)] px-4 text-white" onClick={submitCreateSource}>
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {setup.sources.map((x) => (
              <span key={x.id} className="rounded-lg border border-surface-border px-2.5 py-0.5 text-xs">
                {x.name}
              </span>
            ))}
          </div>
        </section>

        <section className="space-y-2 rounded-2xl border border-surface-border p-4">
          <p className="text-sm font-semibold">Lead status (pipeline)</p>
          <p className="text-xs text-ink-muted">Preview only — edit order and names under Lead configuration.</p>
          <div className="flex flex-wrap gap-2">
            {(setup.pipelineStatuses || []).length === 0 ? (
              <span className="text-xs text-ink-muted">None yet — add in Lead configuration.</span>
            ) : (
              setup.pipelineStatuses.map((x) => (
                <span key={x.id} className="rounded-lg border border-surface-border px-2.5 py-0.5 text-xs">
                  {x.name}
                </span>
              ))
            )}
          </div>
        </section>
      </div>
    </RightDrawer>
  )
}
