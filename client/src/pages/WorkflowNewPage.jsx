import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { useCreateWorkflowMutation } from '@/features/workflows/workflowsApi'

export function WorkflowNewPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('New workflow')
  const [createWorkflow, { isLoading }] = useCreateWorkflowMutation()

  const onSubmit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Enter a workflow name.')
      return
    }
    try {
      const res = await createWorkflow({ name: trimmed, status: 'draft' }).unwrap()
      const id = res?.data?.id
      if (id) navigate(`/automation/${id}`, { replace: true })
      else toast.error('Could not create workflow.')
    } catch {
      toast.error('Could not create workflow.')
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-lg">
        <Link
          to="/automation"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Automation
        </Link>
        <h1 className="text-xl font-semibold text-ink">New workflow</h1>
        <p className="mt-1 text-sm text-ink-muted">Create a draft, then open the visual editor to add triggers and actions.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-surface-border bg-white p-5 shadow-sm dark:bg-ink/40">
          <label className="block text-sm font-medium text-ink">
            Name
            <input
              className="mt-1.5 w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm text-ink"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {isLoading ? 'Creating…' : 'Create & open editor'}
          </button>
        </form>
      </div>
    </PageShell>
  )
}
