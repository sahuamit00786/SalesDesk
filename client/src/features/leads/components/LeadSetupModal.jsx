import { useState } from 'react'
import toast from 'react-hot-toast'
import { RightDrawer } from '@/components/ui/RightDrawer'
import {
  useCreateLeadSourceMutation,
  useCreateLeadStageMutation,
  useCreateLeadStatusCategoryMutation,
  useCreateLeadStatusMutation,
  useGetLeadSetupQuery,
} from '@/features/leads/leadsApi'

function apiErrorMessage(err) {
  return err?.data?.error?.message ?? err?.error ?? 'Something went wrong'
}

export function LeadSetupModal({ open, onClose }) {
  const { data, isLoading } = useGetLeadSetupQuery(undefined, { skip: !open })
  const [createSource] = useCreateLeadSourceMutation()
  const [createStage] = useCreateLeadStageMutation()
  const [createCategory] = useCreateLeadStatusCategoryMutation()
  const [createStatus] = useCreateLeadStatusMutation()
  const [sourceName, setSourceName] = useState('')
  const [stageName, setStageName] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [statusName, setStatusName] = useState('')
  const [statusCategoryId, setStatusCategoryId] = useState('')

  const setup = data?.data || { sources: [], stages: [], categories: [] }

  async function submitCreate(action) {
    try {
      if (action === 'source') {
        if (!sourceName.trim()) return
        await createSource({ name: sourceName.trim() }).unwrap()
        setSourceName('')
      }
      if (action === 'stage') {
        if (!stageName.trim()) return
        await createStage({ name: stageName.trim() }).unwrap()
        setStageName('')
      }
      if (action === 'category') {
        if (!categoryName.trim()) return
        await createCategory({ name: categoryName.trim() }).unwrap()
        setCategoryName('')
      }
      if (action === 'status') {
        if (!statusName.trim() || !statusCategoryId) return
        await createStatus({ name: statusName.trim(), categoryId: statusCategoryId }).unwrap()
        setStatusName('')
      }
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title="Lead Setup"
      description="Setup Sources, Stages, and Status Category -> Status mapping."
      footer={<button type="button" className="h-10 rounded-xl border border-surface-border px-5" onClick={onClose}>Close</button>}
    >
      {isLoading ? <p className="text-sm text-ink-muted">Loading setup...</p> : null}

      <div className="space-y-4">
        <section className="space-y-2 rounded-2xl border border-surface-border p-4">
          <p className="text-sm font-semibold">Sources</p>
          <div className="flex gap-2">
            <input className="h-10 flex-1 rounded-xl border border-surface-border px-3.5" placeholder="Add source" value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
            <button type="button" className="h-10 rounded-xl bg-brand-600 px-4 text-white" onClick={() => submitCreate('source')}>Add</button>
          </div>
          <div className="flex flex-wrap gap-2">{setup.sources.map((x) => <span key={x.id} className="rounded-lg border border-surface-border px-2.5 py-0.5 text-xs">{x.name}</span>)}</div>
        </section>

        <section className="space-y-2 rounded-2xl border border-surface-border p-4">
          <p className="text-sm font-semibold">Stages</p>
          <div className="flex gap-2">
            <input className="h-10 flex-1 rounded-xl border border-surface-border px-3.5" placeholder="Add stage" value={stageName} onChange={(e) => setStageName(e.target.value)} />
            <button type="button" className="h-10 rounded-xl bg-brand-600 px-4 text-white" onClick={() => submitCreate('stage')}>Add</button>
          </div>
          <div className="flex flex-wrap gap-2">{setup.stages.map((x) => <span key={x.id} className="rounded-lg border border-surface-border px-2.5 py-0.5 text-xs">{x.name}</span>)}</div>
        </section>

        <section className="space-y-3 rounded-2xl border border-surface-border p-4">
          <p className="text-sm font-semibold">Status Category -&gt; Status</p>
          <div className="flex gap-2">
            <input className="h-10 flex-1 rounded-xl border border-surface-border px-3.5" placeholder="Add category" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
            <button type="button" className="h-10 rounded-xl bg-brand-600 px-4 text-white" onClick={() => submitCreate('category')}>Add</button>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <select className="h-10 rounded-xl border border-surface-border px-3.5" value={statusCategoryId} onChange={(e) => setStatusCategoryId(e.target.value)}>
              <option value="">Select category</option>
              {setup.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="button" className="h-10 rounded-xl bg-brand-600 px-4 text-white" onClick={() => submitCreate('status')}>Add Status</button>
          </div>
          <input className="h-10 w-full rounded-xl border border-surface-border px-3.5" placeholder="Status name" value={statusName} onChange={(e) => setStatusName(e.target.value)} />

          <div className="space-y-2">
            {setup.categories.map((category) => (
              <div key={category.id} className="rounded-xl border border-surface-border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{category.name}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(category.statuses || []).map((status) => <span key={status.id} className="rounded-lg bg-surface-subtle px-2.5 py-0.5 text-xs">{status.name}</span>)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </RightDrawer>
  )
}
