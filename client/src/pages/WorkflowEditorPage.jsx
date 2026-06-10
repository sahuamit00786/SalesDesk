import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowLeft,
  History,
  Play,
  Rocket,
  Pause,
  PlayCircle,
  Loader2,
  Check,
  AlertCircle,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { SkeletonForm } from '@/components/shared/SkeletonLoader'
import { DataGrid } from '@/components/shared/DataGrid'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { WorkflowCanvas } from '@/features/workflows/components/WorkflowCanvas'
import {
  WorkflowRunOverlayProvider,
} from '@/features/workflows/workflowRunOverlayContext'
import { stepsToByNodeId } from '@/features/workflows/workflowRunStepUtils'
import {
  useGetWorkflowQuery,
  usePatchWorkflowMutation,
  usePublishWorkflowMutation,
  useTestWorkflowMutation,
  useListWorkflowRunsQuery,
  useGetWorkflowRunQuery,
} from '@/features/workflows/workflowsApi'
import { useTeamUsersQuery } from '@/features/team/teamApi'
import { useGetTemplatesQuery } from '@/features/templates/templatesApi'
import { useGetLeadSetupQuery } from '@/features/leads/leadsApi'
import { cn } from '@/utils/cn'

const STATUS_LABEL = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
}

function TestRunModal({ open, onClose, workflowId, onRan }) {
  const [leadId, setLeadId] = useState('')
  const [testWorkflow, { isLoading }] = useTestWorkflowMutation()

  if (!open) return null

  const run = async (e) => {
    e.preventDefault()
    const id = leadId.trim()
    if (!id) {
      toast.error('Enter a lead UUID.')
      return
    }
    try {
      await testWorkflow({ id: workflowId, leadId: id }).unwrap()
      toast.success('Test run started.')
      onRan?.()
      onClose()
      setLeadId('')
    } catch {
      toast.error('Test run failed — check lead id and workflow.')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-white p-5 shadow-xl dark:bg-ink">
        <h2 className="text-lg font-semibold text-ink">Test workflow</h2>
        <p className="mt-1 text-sm text-ink-muted">Runs the graph for a lead in this workspace (same engine as live triggers).</p>
        <form onSubmit={run} className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-ink">
            Lead ID (UUID)
            <input
              className="mt-1 w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 font-mono text-sm"
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-surface-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run test
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function WorkflowEditorLoaded({ wf, refetchWorkflow, teamUsers, templates, leadSetup }) {
  const flowViewportRef = useRef(null)
  const [name, setName] = useState(() => wf.name || '')
  const [saveStatus, setSaveStatus] = useState('idle')
  const [runsOpen, setRunsOpen] = useState(false)
  const [testOpen, setTestOpen] = useState(false)
  const [followLatest, setFollowLatest] = useState(true)
  const [selectedRunId, setSelectedRunId] = useState(null)
  const [patchWorkflow] = usePatchWorkflowMutation()
  const [publishWorkflow, { isLoading: publishing }] = usePublishWorkflowMutation()
  const { data: runsData, refetch: refetchRuns } = useListWorkflowRunsQuery(wf.id, { skip: !wf.id })

  const runs = useMemo(() => (Array.isArray(runsData?.data) ? runsData.data : []), [runsData])
  const latestRunId = runs[0]?.id ? String(runs[0].id) : null
  const effectiveWatchId = followLatest ? latestRunId : selectedRunId ? String(selectedRunId) : null

  const { data: runEnvelope, refetch: refetchRunDetail } = useGetWorkflowRunQuery(effectiveWatchId, {
    skip: !effectiveWatchId,
  })

  const watchedRun = runEnvelope?.data ?? null

  useEffect(() => {
    if (!effectiveWatchId) return undefined
    const st = String(watchedRun?.status || '').toLowerCase()
    if (st !== 'running' && st !== 'waiting') return undefined
    const t = window.setInterval(() => {
      void refetchRunDetail()
    }, 2000)
    return () => window.clearInterval(t)
  }, [effectiveWatchId, watchedRun?.status, refetchRunDetail])

  const stepsByNodeId = useMemo(
    () => stepsToByNodeId(Array.isArray(watchedRun?.steps) ? watchedRun.steps : []),
    [watchedRun],
  )

  const stepRows = Array.isArray(watchedRun?.steps) ? watchedRun.steps : []

  useEffect(() => {
    if (runsOpen) void refetchRuns()
  }, [runsOpen, refetchRuns])

  const bootDef = useMemo(() => {
    if (!wf?.definitionJson) return null
    return {
      nodes: wf.definitionJson.nodes || [],
      edges: wf.definitionJson.edges || [],
    }
  }, [wf.definitionJson])

  const onDebouncedSave = useCallback(
    async (definitionJson) => {
      await patchWorkflow({ id: wf.id, definitionJson }).unwrap()
    },
    [wf.id, patchWorkflow],
  )

  const saveName = useCallback(async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === (wf.name || '')) return
    try {
      await patchWorkflow({ id: wf.id, name: trimmed }).unwrap()
      await refetchWorkflow()
      toast.success('Name saved')
    } catch {
      toast.error('Could not save name')
    }
  }, [wf.id, wf.name, name, patchWorkflow, refetchWorkflow])

  const onPublish = async () => {
    try {
      await publishWorkflow(wf.id).unwrap()
      toast.success('Version published')
    } catch {
      toast.error('Publish failed')
    }
  }

  const setPaused = async (paused) => {
    try {
      await patchWorkflow({ id: wf.id, status: paused ? 'paused' : 'active' }).unwrap()
      await refetchWorkflow()
      toast.success(paused ? 'Workflow paused' : 'Workflow resumed')
    } catch {
      toast.error('Could not update status')
    }
  }

  const status = String(wf.status || 'draft').toLowerCase()

  return (
    <PageShell fullWidth flush mainClassName="!py-0">
      <div className="flex min-h-0 flex-col gap-0 border-b border-surface-border bg-white/90 px-4 py-3 backdrop-blur-sm dark:bg-ink/60 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/automation"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Library
          </Link>
          <input
            className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-ink hover:border-surface-border focus:border-brand-400 focus:outline-none sm:max-w-md"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              void saveName()
            }}
          />
          <span
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
              status === 'active' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
              status === 'paused' && 'border-amber-200 bg-amber-50 text-amber-900',
              status === 'draft' && 'border-neutral-200 bg-neutral-100 text-neutral-700',
            )}
          >
            {STATUS_LABEL[status] || status}
          </span>
          <div
            className="hidden items-center gap-0.5 rounded-xl border border-surface-border bg-white px-0.5 py-0.5 sm:flex dark:bg-ink/80"
            title="Canvas zoom"
          >
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => flowViewportRef.current?.zoomIn?.()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-ink hover:border-surface-border hover:bg-surface-muted"
            >
              <ZoomIn className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => flowViewportRef.current?.zoomOut?.()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-ink hover:border-surface-border hover:bg-surface-muted"
            >
              <ZoomOut className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Fit view"
              onClick={() => flowViewportRef.current?.fitView?.()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-ink hover:border-surface-border hover:bg-surface-muted"
            >
              <Maximize2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="hidden items-center gap-1.5 text-xs text-ink-muted sm:inline-flex" title="Graph auto-save">
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Saved
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                  Save error
                </>
              ) : (
                <span className="text-ink-muted">Auto-save</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setRunsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-white px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-muted dark:bg-ink/80"
            >
              <History className="h-3.5 w-3.5" />
              Runs
            </button>
            <button
              type="button"
              onClick={() => setTestOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-white px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-muted dark:bg-ink/80"
            >
              <Play className="h-3.5 w-3.5" />
              Test
            </button>
            {status === 'active' ? (
              <button
                type="button"
                onClick={() => setPaused(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                <Pause className="h-3.5 w-3.5" />
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPaused(false)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                Activate
              </button>
            )}
            <button
              type="button"
              disabled={publishing}
              onClick={onPublish}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
            >
              {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
              Publish
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 px-2 pb-4 pt-2 sm:px-4">
        {bootDef ? (
          <WorkflowRunOverlayProvider stepsByNodeId={stepsByNodeId}>
            <WorkflowCanvas
              workflowId={wf.id}
              bootDef={bootDef}
              onDebouncedSave={onDebouncedSave}
              onSaveStatus={setSaveStatus}
              teamUsers={teamUsers}
              templates={templates}
              leadSetup={leadSetup}
              onViewportControlsReady={(api) => {
                flowViewportRef.current = api
              }}
            />
          </WorkflowRunOverlayProvider>
        ) : null}
      </div>

      <TestRunModal
        open={testOpen}
        onClose={() => setTestOpen(false)}
        workflowId={wf.id}
        onRan={() => refetchRuns()}
      />

      <RightDrawer
        open={runsOpen}
        onClose={() => setRunsOpen(false)}
        title="Run history"
        description={
          followLatest
            ? 'Showing the latest run on the canvas. Pick a row to inspect steps.'
            : 'Pinned to a past run. Use Follow latest to track new runs on the canvas.'
        }
      >
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {!followLatest ? (
              <button
                type="button"
                onClick={() => {
                  setFollowLatest(true)
                  setSelectedRunId(null)
                }}
                className="rounded-lg border border-brand-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-brand-900 hover:bg-slate-100"
              >
                Follow latest
              </button>
            ) : null}
            <span className="text-xs text-ink-muted">
              {effectiveWatchId ? (
                <>
                  Watching{' '}
                  <span className="font-mono text-[11px] text-ink">{effectiveWatchId.slice(0, 8)}…</span>
                  {watchedRun?.status ? (
                    <span className="ml-2 font-semibold text-ink">· {String(watchedRun.status)}</span>
                  ) : null}
                </>
              ) : (
                'No runs yet'
              )}
            </span>
          </div>

          {runs.length === 0 ? (
            <p className="text-sm text-ink-muted">No runs yet. Use Test or wait for lead triggers.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {runs.map((r) => {
                const isLatest = latestRunId && String(r.id) === latestRunId
                const isSelected = !followLatest && selectedRunId && String(r.id) === String(selectedRunId)
                const isFollowHighlight = followLatest && isLatest
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setFollowLatest(false)
                        setSelectedRunId(String(r.id))
                      }}
                      className={cn(
                        'w-full rounded-xl border p-3 text-left text-sm transition-colors',
                        isSelected || isFollowHighlight
                          ? 'border-brand-300 bg-slate-50 dark:border-violet-500/50 dark:bg-violet-950/30'
                          : 'border-surface-border bg-surface-muted/50 hover:border-brand-200 dark:bg-ink/40',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-ink-muted">{String(r.id).slice(0, 8)}…</span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                            r.status === 'completed' && 'bg-emerald-100 text-emerald-800',
                            r.status === 'failed' && 'bg-rose-100 text-rose-800',
                            r.status === 'waiting' && 'bg-amber-100 text-amber-900',
                            r.status === 'running' && 'bg-sky-100 text-sky-900',
                          )}
                        >
                          {r.status}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-ink-muted">
                        {r.triggerType} · v{r.version ?? '—'}
                        {r.startedAt ? ` · ${formatDistanceToNow(new Date(r.startedAt), { addSuffix: true })}` : ''}
                      </div>
                      {r.errorMessage ? <p className="mt-2 line-clamp-2 text-xs text-rose-700">{r.errorMessage}</p> : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {effectiveWatchId && stepRows.length > 0 ? (
            <div className="border-t border-surface-border pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-muted">Steps</h3>
              <div className="mt-2">
                <DataGrid
                  gridColumns
                  columns={[
                    {
                      field: 'nodeId',
                      headerName: 'Node',
                      flex: 1,
                      minWidth: 100,
                      valueGetter: (_v, row) => {
                        const nid = String(row.nodeId ?? row.node_id ?? '')
                        return `${nid.slice(0, 10)}…`
                      },
                    },
                    {
                      field: 'status',
                      headerName: 'Status',
                      width: 90,
                      renderCell: ({ row }) => (
                        <span className="font-semibold">{row.status}</span>
                      ),
                    },
                    {
                      field: 'finishedAt',
                      headerName: 'Finished',
                      flex: 1,
                      minWidth: 100,
                      valueGetter: (_v, row) => {
                        const fin = row.finishedAt ?? row.finished_at
                        return fin ? formatDistanceToNow(new Date(fin), { addSuffix: true }) : '—'
                      },
                    },
                  ]}
                  data={stepRows.map((step, i) => ({
                    ...step,
                    id: step.id ?? `${String(step.nodeId ?? step.node_id ?? '')}-${i}`,
                  }))}
                  density="compact"
                  searchable={false}
                  showColumnToggle={false}
                  showExportCsv={false}
                  hideFooter
                  maxHeightClass="max-h-[240px]"
                  className="border border-surface-border shadow-none"
                />
              </div>
              {stepRows.some((s) => s.errorMessage ?? s.error_message) ? (
                <div className="mt-2 space-y-1">
                  {stepRows
                    .filter((s) => s.errorMessage ?? s.error_message)
                    .map((step) => {
                      const err = step.errorMessage ?? step.error_message
                      const nid = String(step.nodeId ?? step.node_id ?? '')
                      return (
                        <p key={step.id ? `err-${step.id}` : `err-${nid}-${step.status}`} className="text-[11px] text-rose-700">
                          <span className="font-mono">{nid.slice(0, 8)}…</span>: {err}
                        </p>
                      )
                    })}
                </div>
              ) : null}
            </div>
          ) : effectiveWatchId ? (
            <p className="text-xs text-ink-muted">No step rows returned yet for this run.</p>
          ) : null}
        </div>
      </RightDrawer>
    </PageShell>
  )
}

export function WorkflowEditorPage() {
  const { id } = useParams()
  const { data, isLoading, error, refetch } = useGetWorkflowQuery(id)
  const wf = data?.data

  const { data: teamData } = useTeamUsersQuery()
  const { data: templatesData } = useGetTemplatesQuery({})
  const { data: leadSetupRes } = useGetLeadSetupQuery()
  const leadSetup = leadSetupRes?.data ?? null

  const teamUsers = useMemo(() => {
    const items = teamData?.data?.items || []
    return items.filter((u) => u.isActive !== false)
  }, [teamData?.data?.items])

  const templates = useMemo(() => {
    const raw = templatesData?.data
    return Array.isArray(raw) ? raw.filter((t) => !t.isArchived) : []
  }, [templatesData?.data])

  if (isLoading) {
    return (
      <PageShell fullWidth flush>
        <div className="p-6"><SkeletonForm rows={8} /></div>
      </PageShell>
    )
  }

  if (error || !wf) {
    return (
      <PageShell>
        <p className="text-sm text-rose-600">Workflow not found or you do not have access.</p>
        <Link to="/automation" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
          Back to automation
        </Link>
      </PageShell>
    )
  }

  return (
    <WorkflowEditorLoaded
      key={wf.id}
      wf={wf}
      refetchWorkflow={refetch}
      teamUsers={teamUsers}
      templates={templates}
      leadSetup={leadSetup}
    />
  )
}
