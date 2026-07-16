import { useMemo, useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { GitBranch, MoreHorizontal, Play, Plus, Trash2, Zap, Layers, CheckCircle2, XCircle, Clock, CalendarDays, Loader2, Search } from '@/components/ui/icons'
import { SkeletonCards } from '@/components/shared/SkeletonLoader'
import { formatDistanceToNow, format } from 'date-fns'
import { PageShell } from '@/components/layout/PageShell'
import { PageFilterBar } from '@/components/layout/PageFilterBar'
import { PageStack } from '@/components/layout/PageStack'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  useListWorkflowsQuery,
  useCreateWorkflowMutation,
  usePatchWorkflowMutation,
  useDeleteWorkflowMutation,
  useTestWorkflowMutation,
} from '@/features/workflows/workflowsApi'
import { useGetLeadsQuery } from '@/features/leads/leadsApi'
import { cn } from '@/utils/cn'

const STATUS_META = {
  draft: { label: 'Draft', tone: 'border-amber-200 bg-amber-50 text-amber-900', dot: 'bg-amber-500' },
  active: { label: 'Active', tone: 'border-emerald-200 bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  paused: { label: 'Paused', tone: 'border-neutral-200 bg-neutral-100 text-neutral-700', dot: 'bg-neutral-500' },
}

function TestRunDrawer({ workflow, open, onClose }) {
  const [selectedId, setSelectedId] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef(null)
  const [testWorkflow, { isLoading }] = useTestWorkflowMutation()

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const queryParams = useMemo(() => {
    const p = { limit: 100, sort: 'createdAt', order: 'desc' }
    if (debouncedSearch.trim()) p.search = debouncedSearch.trim()
    return p
  }, [debouncedSearch])

  const { data: leadsData, isLoading: leadsLoading, isFetching } = useGetLeadsQuery(queryParams, { skip: !open })

  const allRecords = useMemo(() => (Array.isArray(leadsData?.data) ? leadsData.data : []), [leadsData])

  const [selectedRecord, setSelectedRecord] = useState(null)
  const selected = selectedRecord

  const run = async (e) => {
    e.preventDefault()
    if (!selectedId || !workflow?.id) {
      toast.error('Select a lead or opportunity.')
      return
    }
    try {
      await testWorkflow({ id: workflow.id, leadId: selectedId }).unwrap()
      toast.success('Test run started.')
      setSelectedId('')
      setSelectedRecord(null)
      setSearch('')
      onClose()
    } catch {
      toast.error('Test run failed.')
    }
  }

  if (!workflow) return null

  return (
    <RightDrawer open={open} onClose={onClose} title="Test workflow" description={workflow.name}>
      <form onSubmit={run} className="flex flex-col gap-4 p-2">
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Select lead or opportunity</p>
          {/* Search */}
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
            <input
              className="w-full rounded-xl border border-surface-border bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-brand-400"
              placeholder="Search by name, company, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* List */}
          <div className="max-h-72 overflow-y-auto rounded-xl border border-surface-border divide-y divide-surface-border">
            {leadsLoading || isFetching ? (
              <div className="flex items-center justify-center py-8 text-xs text-ink-muted">Loading…</div>
            ) : allRecords.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-xs text-ink-muted">No results</div>
            ) : (
              allRecords.map((r) => {
                const isOpp = Boolean(r.isOpportunity)
                const label = r.title || r.contactName || '—'
                const sub = [r.company, r.email].filter(Boolean).join(' · ')
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setSelectedId(r.id); setSelectedRecord(r) }}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                      selectedId === r.id ? 'bg-brand-50' : 'hover:bg-surface-subtle',
                    )}
                  >
                    <span className={cn(
                      'shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                      isOpp ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700',
                    )}>
                      {isOpp ? 'OPP' : 'LEAD'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-ink">{label}</span>
                      {sub && <span className="block truncate text-[11px] text-ink-muted">{sub}</span>}
                    </span>
                    {selectedId === r.id && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-500" />
                    )}
                  </button>
                )
              })
            )}
          </div>
          {selected && (
            <p className="mt-2 text-[11px] text-ink-muted">
              Selected: <span className="font-medium text-ink">{selected.title || selected.contactName}</span>
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !selectedId}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-2.5 text-sm font-semibold cx-icon-inherit text-white hover:bg-slate-900 disabled:opacity-60"
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
  const [searchParams, setSearchParams] = useSearchParams()
  const { data, isLoading, refetch } = useListWorkflowsQuery()
  const [createWorkflow, { isLoading: creating }] = useCreateWorkflowMutation()
  const [patchWorkflow] = usePatchWorkflowMutation()
  const [deleteWorkflow] = useDeleteWorkflowMutation()
  const [menuOpen, setMenuOpen] = useState(null)
  const [testWf, setTestWf] = useState(null)

  const [statusFilter, setStatusFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newWorkflowName, setNewWorkflowName] = useState('')

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setCreateOpen(true)
      setNewWorkflowName('')
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const allRows = useMemo(() => data?.data || [], [data?.data])
  const rows = useMemo(
    () => (statusFilter ? allRows.filter((r) => String(r.status || 'draft').toLowerCase() === statusFilter) : allRows),
    [allRows, statusFilter],
  )

  const openCreateModal = () => {
    setNewWorkflowName('')
    setCreateOpen(true)
  }

  const closeCreateModal = () => {
    if (creating) return
    setCreateOpen(false)
    setNewWorkflowName('')
  }

  const submitNewWorkflow = async (e) => {
    e.preventDefault()
    const trimmed = newWorkflowName.trim()
    if (!trimmed) {
      toast.error('Enter workflow name.')
      return
    }
    try {
      const res = await createWorkflow({ name: trimmed, status: 'draft' }).unwrap()
      const id = res?.data?.id
      if (id) {
        setCreateOpen(false)
        setNewWorkflowName('')
        navigate(`/automation/${id}`)
      } else toast.error('Could not create workflow.')
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
    <PageShell fullWidth mainClassName="pt-1.5 pb-3 sm:pb-4">
      <PageStack className="gap-3">
        <PageFilterBar>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-xl border border-surface-border bg-white px-3 pr-8 text-xs font-medium text-ink outline-none focus:border-brand-400"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
          <button
            type="button"
            onClick={openCreateModal}
            className="ml-auto inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold cx-icon-inherit text-white shadow-sm hover:bg-[var(--brand-primary-dark)]"
          >
            <Plus className="h-4 w-4" />
            New workflow
          </button>
        </PageFilterBar>

        {isLoading ? (
          <SkeletonCards count={6} cols="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" cardHeight="h-44" />
        ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-border bg-white p-10 text-center shadow-sm">
          <GitBranch className="mx-auto h-10 w-10 text-ink-muted" aria-hidden />
          <p className="mt-3 text-sm font-medium text-ink">No workflows yet</p>
          <p className="mt-1 text-sm text-ink-muted">Create one to start automating lead follow-up.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const status = String(row.status || 'draft').toLowerCase()
            const meta = STATUS_META[status] || STATUS_META.draft
            const lr = row.lastRun
            const runStatusIcon = lr?.status === 'completed'
              ? <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              : lr?.status === 'failed'
              ? <XCircle className="h-3 w-3 text-rose-500" />
              : lr?.status === 'running'
              ? <Clock className="h-3 w-3 text-brand-500 animate-pulse" />
              : null
            return (
              <li
                key={row.id}
                className="group relative flex flex-col rounded-2xl border border-surface-border bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-ink/40"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 px-4 pt-4">
                  <Link to={`/automation/${row.id}`} className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-bold text-ink leading-snug">{row.name}</h2>
                    {row.triggerLabel && (
                      <div className="mt-1 flex items-center gap-1">
                        <Zap className="h-3 w-3 text-brand-400 shrink-0" />
                        <span className="text-[11px] text-ink-muted truncate">{row.triggerLabel}</span>
                      </div>
                    )}
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', meta.tone)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
                      {meta.label}
                    </span>
                    <div className="relative">
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
                            onClick={() => { setTestWf(row); setMenuOpen(null) }}
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
                </div>

                {/* Stats row */}
                <div className="mx-4 mt-3 grid grid-cols-3 divide-x divide-surface-border rounded-xl border border-surface-border bg-surface-subtle">
                  <div className="flex flex-col items-center py-2">
                    <span className="text-sm font-bold text-ink">{row.stepCount ?? 0}</span>
                    <span className="text-[10px] text-ink-muted">Steps</span>
                  </div>
                  <div className="flex flex-col items-center py-2">
                    <span className="text-sm font-bold text-ink">{row.runCount ?? 0}</span>
                    <span className="text-[10px] text-ink-muted">Total runs</span>
                  </div>
                  <div className="flex flex-col items-center py-2">
                    {lr ? (
                      <>
                        <span className="flex items-center gap-1 text-sm font-bold text-ink capitalize">
                          {runStatusIcon}{lr.status}
                        </span>
                        <span className="text-[10px] text-ink-muted">Last run</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-bold text-ink-faint">—</span>
                        <span className="text-[10px] text-ink-muted">Last run</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Footer meta */}
                <div className="flex items-center justify-between px-4 py-3 text-[11px] text-ink-muted">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    Created {row.createdAt ? format(new Date(row.createdAt), 'MMM d, yyyy') : '—'}
                  </span>
                  <span>
                    {row.updatedAt
                      ? `Updated ${formatDistanceToNow(new Date(row.updatedAt), { addSuffix: true })}`
                      : ''}
                  </span>
                </div>

                <div className="border-t border-surface-border px-4 pb-4 pt-3">
                  <Link
                    to={`/automation/${row.id}`}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-surface-border py-2 text-xs font-semibold text-ink hover:bg-surface-muted"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    Open editor
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      </PageStack>

      <TestRunDrawer workflow={testWf} open={Boolean(testWf)} onClose={() => setTestWf(null)} />

      <Modal
        open={createOpen}
        onClose={closeCreateModal}
        title="New workflow"
        description="Name your workflow, then design triggers and actions in the editor."
        maxWidthClassName="max-w-md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeCreateModal} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" form="new-workflow-form" disabled={creating || !newWorkflowName.trim()}>
              {creating ? 'Creating…' : 'Create & open editor'}
            </Button>
          </>
        }
      >
        <form id="new-workflow-form" onSubmit={submitNewWorkflow} className="space-y-4">
          <label className="block text-sm font-medium text-ink">
            Workflow name
            <input
              className="mt-1.5 w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              value={newWorkflowName}
              onChange={(e) => setNewWorkflowName(e.target.value)}
              placeholder="e.g. New lead follow-up"
              autoFocus
              disabled={creating}
            />
          </label>
        </form>
      </Modal>
    </PageShell>
  )
}
