import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { GitBranch, Loader2, MoreHorizontal, Play, Plus, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { PageShell } from '@/components/layout/PageShell'
import { RightDrawer } from '@/components/ui/RightDrawer'
import {
  useListWorkflowsQuery,
  useCreateWorkflowMutation,
  usePatchWorkflowMutation,
  useDeleteWorkflowMutation,
  useTestWorkflowMutation,
} from '@/features/workflows/workflowsApi'
import { cn } from '@/utils/cn'

const STATUS_META = {
  draft: { label: 'Draft', tone: 'border-amber-200 bg-amber-50 text-amber-900', dot: 'bg-amber-500' },
  active: { label: 'Active', tone: 'border-emerald-200 bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  paused: { label: 'Paused', tone: 'border-neutral-200 bg-neutral-100 text-neutral-700', dot: 'bg-neutral-500' },
}

function TestRunDrawer({ workflow, open, onClose }) {
  const [leadId, setLeadId] = useState('')
  const [testWorkflow, { isLoading }] = useTestWorkflowMutation()

  const run = async (e) => {
    e.preventDefault()
    const id = leadId.trim()
    if (!id || !workflow?.id) {
      toast.error('Enter a lead UUID.')
      return
    }
    try {
      await testWorkflow({ id: workflow.id, leadId: id }).unwrap()
      toast.success('Test run started.')
      setLeadId('')
      onClose()
    } catch {
      toast.error('Test run failed.')
    }
  }

  if (!workflow) return null

  return (
    <RightDrawer open={open} onClose={onClose} title="Test workflow" description={workflow.name}>
      <form onSubmit={run} className="space-y-4 p-2">
        <label className="block text-sm font-medium text-ink">
          Lead ID (UUID)
          <input
            className="mt-1 w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 font-mono text-sm"
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            placeholder="Lead in this workspace"
          />
        </label>
        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run test
        </button>
      </form>
    </RightDrawer>
  )
}

export function WorkflowsListPage() {
  const navigate = useNavigate()
  const { data, isLoading, refetch } = useListWorkflowsQuery()
  const [createWorkflow, { isLoading: creating }] = useCreateWorkflowMutation()
  const [patchWorkflow] = usePatchWorkflowMutation()
  const [deleteWorkflow] = useDeleteWorkflowMutation()
  const [menuOpen, setMenuOpen] = useState(null)
  const [testWf, setTestWf] = useState(null)

  const rows = useMemo(() => data?.data || [], [data?.data])

  const quickCreate = async () => {
    try {
      const res = await createWorkflow({ name: 'Untitled workflow', status: 'draft' }).unwrap()
      const id = res?.data?.id
      if (id) navigate(`/automation/${id}`)
      else toast.error('Could not create workflow.')
    } catch {
      toast.error('Could not create workflow.')
    }
  }

  const togglePause = async (row) => {
    const next = String(row.status).toLowerCase() === 'paused' ? 'active' : 'paused'
    try {
      await patchWorkflow({ id: row.id, status: next }).unwrap()
      toast.success(next === 'paused' ? 'Paused' : 'Resumed')
      refetch()
    } catch {
      toast.error('Could not update workflow.')
    }
    setMenuOpen(null)
  }

  const remove = async (row) => {
    if (!window.confirm(`Delete workflow “${row.name}”? This cannot be undone.`)) return
    try {
      await deleteWorkflow(row.id).unwrap()
      toast.success('Workflow deleted')
      refetch()
    } catch {
      toast.error('Delete failed')
    }
    setMenuOpen(null)
  }

  return (
    <PageShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Automation</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={creating}
            onClick={quickCreate}
            className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-surface-muted dark:bg-ink/60"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Quick draft
          </button>
          <Link
            to="/automation/new"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            New workflow
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-ink-muted">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-surface-border bg-surface-muted/40 p-10 text-center">
          <GitBranch className="mx-auto h-10 w-10 text-ink-muted" aria-hidden />
          <p className="mt-3 text-sm font-medium text-ink">No workflows yet</p>
          <p className="mt-1 text-sm text-ink-muted">Create one to start automating lead follow-up.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const status = String(row.status || 'draft').toLowerCase()
            const meta = STATUS_META[status] || STATUS_META.draft
            const lr = row.lastRun
            return (
              <li
                key={row.id}
                className="group relative flex flex-col rounded-2xl border border-surface-border bg-white p-4 shadow-sm dark:bg-ink/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/automation/${row.id}`} className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-bold text-ink">{row.name}</h2>
                    <p className="mt-1 text-[11px] text-ink-muted">
                      Updated{' '}
                      {row.updatedAt
                        ? formatDistanceToNow(new Date(row.updatedAt), { addSuffix: true })
                        : '—'}
                    </p>
                  </Link>
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink"
                      aria-label="Menu"
                      onClick={() => setMenuOpen((k) => (k === row.id ? null : row.id))}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuOpen === row.id ? (
                      <div className="absolute right-0 top-9 z-10 min-w-[160px] rounded-xl border border-surface-border bg-white py-1 shadow-lg dark:bg-ink">
                        <button
                          type="button"
                          className="flex w-full px-3 py-2 text-left text-xs font-medium text-ink hover:bg-surface-muted"
                          onClick={() => togglePause(row)}
                        >
                          {status === 'paused' ? 'Resume' : 'Pause'}
                        </button>
                        <button
                          type="button"
                          className="flex w-full px-3 py-2 text-left text-xs font-medium text-ink hover:bg-surface-muted"
                          onClick={() => {
                            setTestWf(row)
                            setMenuOpen(null)
                          }}
                        >
                          Test run…
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-rose-700 hover:bg-rose-50"
                          onClick={() => remove(row)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold', meta.tone)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
                    {meta.label}
                  </span>
                  {lr ? (
                    <span className="text-[10px] text-ink-muted">
                      Last run: <span className="font-semibold text-ink">{lr.status}</span>
                      {lr.startedAt
                        ? ` · ${formatDistanceToNow(new Date(lr.startedAt), { addSuffix: true })}`
                        : ''}
                    </span>
                  ) : (
                    <span className="text-[10px] text-ink-muted">No runs yet</span>
                  )}
                </div>
                <Link
                  to={`/automation/${row.id}`}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-surface-border py-2 text-xs font-semibold text-ink hover:bg-surface-muted"
                >
                  Open editor
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <TestRunDrawer workflow={testWf} open={Boolean(testWf)} onClose={() => setTestWf(null)} />
    </PageShell>
  )
}
