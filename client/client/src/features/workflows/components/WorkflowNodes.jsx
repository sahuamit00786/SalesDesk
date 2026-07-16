import { useMemo } from 'react'
import { Handle, Position, useReactFlow } from '@xyflow/react'
import { Plus, Trash2, X } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import {
  WORKFLOW_NODE_TYPES,
  defaultConditionValueForField,
  WORKFLOW_TASK_TYPE_OPTIONS,
  WORKFLOW_TASK_PRIORITY_OPTIONS,
  WORKFLOW_FOLLOWUP_DELAY_PRESETS,
} from '@/features/workflows/workflowDefinition'
import { useWorkflowRunStep } from '@/features/workflows/workflowRunOverlayContext'
import { SOURCE_LABELS, SOURCE_OPTIONS, STATUS_OPTIONS } from '@/features/leads/constants'

function RunStepBadge({ nodeId }) {
  const step = useWorkflowRunStep(nodeId)
  if (!step?.status) return null
  const s = String(step.status).toLowerCase()
  return (
    <span
      className={cn(
        'absolute right-2 top-2 z-10 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide shadow-sm',
        s === 'completed' && 'bg-emerald-100 text-emerald-800',
        s === 'failed' && 'bg-rose-100 text-rose-800',
        s === 'waiting' && 'bg-amber-100 text-amber-900',
        s === 'running' && 'animate-pulse bg-sky-100 text-sky-900',
        s === 'skipped' && 'bg-neutral-200 text-neutral-700',
        s === 'pending' && 'bg-neutral-100 text-neutral-600',
      )}
      title={step.errorMessage ? String(step.errorMessage) : undefined}
    >
      {s}
    </span>
  )
}

const WORKFLOW_NODE_SELECTED =
  'ring-2 ring-amber-500 shadow-[0_0_0_1px_rgba(245,158,11,0.25),0_8px_24px_-4px_rgba(245,158,11,0.12)] dark:ring-amber-400 dark:shadow-[0_0_0_1px_rgba(251,191,36,0.35)]'

function newWorkflowSubtaskKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `st-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeWorkflowSubtasksForUi(data) {
  const arr = Array.isArray(data?.subtasks) ? data.subtasks : []
  return arr.map((s) => ({
    key: typeof s?.key === 'string' && s.key ? s.key : typeof s?.id === 'string' && s.id ? s.id : newWorkflowSubtaskKey(),
    title: String(s?.title ?? ''),
    done: Boolean(s?.done),
  }))
}

function NodeShell({ id, title, subtitle, tone, selected, children, className, deletable = true }) {
  const rf = useReactFlow()
  const onRemove = (e) => {
    e.stopPropagation()
    if (!id) return
    void rf.deleteElements({ nodes: [{ id }] })
  }
  return (
    <div
      className={cn(
        'group/node relative min-w-[200px] max-w-[260px] rounded-2xl border border-surface-border bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:bg-ink/90 dark:border-surface-border',
        selected ? WORKFLOW_NODE_SELECTED : tone,
        className,
      )}
    >
      {deletable && id ? (
        <button
          type="button"
          title="Remove node"
          aria-label="Remove node"
          onClick={onRemove}
          className="nodrag nopan absolute left-1 top-1 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-surface-border bg-white/95 text-ink opacity-0 shadow-sm transition-opacity hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 group-hover/node:opacity-100 dark:bg-ink dark:hover:border-rose-500/40 dark:hover:bg-rose-950/30 dark:hover:text-rose-200"
        >
          <X className="h-4 w-4 shrink-0" strokeWidth={2.5} />
        </button>
      ) : null}
      {id ? <RunStepBadge nodeId={id} /> : null}
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{subtitle}</div>
      <div className="mt-0.5 text-sm font-semibold text-ink">{title}</div>
      {children ? <div className="mt-2 space-y-2 border-t border-surface-border/80 pt-2">{children}</div> : null}
    </div>
  )
}

function TriggerLeadCreatedNode({ id, selected }) {
  return (
    <NodeShell
      id={id}
      title={WORKFLOW_NODE_TYPES.triggerLeadCreated}
      subtitle="Trigger"
      selected={selected}
      tone="ring-1 ring-brand-200/80"
    >
      <p className="text-[11px] leading-snug text-ink-muted">Runs when a new lead is created in this workspace.</p>
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-500" />
    </NodeShell>
  )
}

const WATCHABLE_FIELDS = [
  { value: 'status', label: 'Lifecycle status' },
  { value: 'source', label: 'Source channel' },
  { value: 'sourceId', label: 'Workspace source' },
  { value: 'pipelineStatus', label: 'Pipeline status' },
  { value: 'assignedTo', label: 'Assigned to' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' },
  { value: 'contactName', label: 'Contact name' },
  { value: 'title', label: 'Title' },
  { value: 'city', label: 'City' },
  { value: 'value', label: 'Deal value' },
  { value: 'notes', label: 'Notes' },
]

function TriggerLeadUpdatedNode({ id, data, selected, updateNodeData }) {
  const watchFields = Array.isArray(data?.watchFields) ? data.watchFields : []

  const toggleField = (val) => {
    const next = watchFields.includes(val) ? watchFields.filter((f) => f !== val) : [...watchFields, val]
    updateNodeData(id, { watchFields: next })
  }

  return (
    <NodeShell
      id={id}
      title={WORKFLOW_NODE_TYPES.triggerLeadUpdated}
      subtitle="Trigger"
      selected={selected}
      tone="ring-1 ring-brand-200/80"
    >
      <p className="text-[11px] leading-snug text-ink-muted">Runs when an existing lead is updated.</p>
      <div className="rounded-lg border border-dashed border-surface-border bg-surface-muted/30 px-2 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Watch specific fields (optional)</p>
        <p className="mt-0.5 text-[9px] leading-snug text-ink-muted">
          If set, only fires when one of these fields actually changes. Leave empty to fire on any update.
        </p>
        <div className="mt-1.5 max-h-28 overflow-y-auto space-y-1">
          {WATCHABLE_FIELDS.map((f) => (
            <label key={f.value} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                className="nodrag h-3.5 w-3.5 shrink-0 rounded border-surface-border text-brand-600"
                checked={watchFields.includes(f.value)}
                onChange={() => toggleField(f.value)}
              />
              <span className="text-[11px] text-ink">{f.label}</span>
            </label>
          ))}
        </div>
        {watchFields.length > 0 ? (
          <p className="mt-1 text-[9px] text-sky-700 dark:text-sky-400">
            Watching: {watchFields.map((v) => WATCHABLE_FIELDS.find((f) => f.value === v)?.label || v).join(', ')}
          </p>
        ) : null}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-[var(--brand-primary)]" />
    </NodeShell>
  )
}

function TriggerCampaignStageChangedNode({ id, selected }) {
  return (
    <NodeShell
      id={id}
      title={WORKFLOW_NODE_TYPES.triggerCampaignStageChanged}
      subtitle="Trigger"
      selected={selected}
      tone="ring-1 ring-brand-200/80"
    >
      <p className="text-[11px] leading-snug text-ink-muted">
        Runs when a lead moves to a different stage in any campaign it belongs to.
      </p>
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-500" />
    </NodeShell>
  )
}

function TriggerCampaignPaymentReceivedNode({ id, selected }) {
  return (
    <NodeShell
      id={id}
      title={WORKFLOW_NODE_TYPES.triggerCampaignPaymentReceived}
      subtitle="Trigger"
      selected={selected}
      tone="ring-1 ring-brand-200/80"
    >
      <p className="text-[11px] leading-snug text-ink-muted">
        Runs when a campaign payment is recorded with status &ldquo;received&rdquo;.
      </p>
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-500" />
    </NodeShell>
  )
}

const CONDITION_FIELD_GROUPS = [
  {
    label: 'Lifecycle',
    options: [
      { value: 'status', label: 'Lifecycle status' },
      { value: 'isOpportunity', label: 'Is opportunity' },
    ],
  },
  {
    label: 'Source',
    options: [
      { value: 'source', label: 'Source channel (system)' },
      { value: 'sourceId', label: 'Workspace source (configured)' },
    ],
  },
  {
    label: 'Pipeline',
    options: [{ value: 'pipelineStatus', label: 'Pipeline status' }],
  },
  {
    label: 'Contact & account',
    options: [
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
      { value: 'company', label: 'Company' },
      { value: 'contactName', label: 'Contact name' },
      { value: 'title', label: 'Title' },
      { value: 'city', label: 'City' },
    ],
  },
  {
    label: 'Other',
    options: [
      { value: 'value', label: 'Deal value (text)' },
      { value: 'notes', label: 'Notes' },
    ],
  },
]

function formatStatusLabel(key) {
  const k = String(key || '')
  return k
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function ConditionValueControl({ field, value, operator, updateNodeData, id, leadSetup }) {
  const sources = Array.isArray(leadSetup?.sources) ? leadSetup.sources : []
  const stages = Array.isArray(leadSetup?.pipelineStatuses) ? leadSetup.pipelineStatuses : []

  if (operator === 'is_empty' || operator === 'is_not_empty') {
    return null
  }

  if (operator === 'changed') {
    return (
      <p className="text-[10px] leading-snug text-amber-700 dark:text-amber-400">
        &ldquo;Changed&rdquo; only works with the <strong>Lead Updated</strong> trigger &mdash; always false on Lead Created.
      </p>
    )
  }

  if (field === 'status') {
    return (
      <label className="block text-[11px] font-medium text-ink-muted">
        Lifecycle value
        <select
          className="mt-0.5 w-full rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink"
          value={String(value ?? '')}
          onChange={(e) => updateNodeData(id, { value: e.target.value })}
        >
          {STATUS_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {formatStatusLabel(k)}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (field === 'source') {
    return (
      <label className="block text-[11px] font-medium text-ink-muted">
        Channel
        <select
          className="mt-0.5 w-full rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink"
          value={String(value ?? '')}
          onChange={(e) => updateNodeData(id, { value: e.target.value })}
        >
          {SOURCE_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {SOURCE_LABELS[k] || k}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (field === 'sourceId') {
    return (
      <label className="block text-[11px] font-medium text-ink-muted">
        Workspace source
        <select
          className="mt-0.5 w-full rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink"
          value={String(value ?? '')}
          onChange={(e) => updateNodeData(id, { value: e.target.value })}
        >
          <option value="">Pick a source…</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name || s.id}
            </option>
          ))}
        </select>
        {sources.length === 0 ? (
          <p className="mt-1 text-[10px] text-amber-700">Add sources under Lead configuration.</p>
        ) : null}
      </label>
    )
  }

  if (field === 'pipelineStatus') {
    return (
      <label className="block text-[11px] font-medium text-ink-muted">
        Pipeline status
        <select
          className="mt-0.5 w-full rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink"
          value={String(value ?? '')}
          onChange={(e) => updateNodeData(id, { value: e.target.value })}
        >
          <option value="">Pick a status…</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name || s.id}
            </option>
          ))}
        </select>
        {stages.length === 0 ? (
          <p className="mt-1 text-[10px] text-amber-700">Add pipeline statuses under Lead configuration.</p>
        ) : null}
      </label>
    )
  }

  if (field === 'isOpportunity') {
    return (
      <label className="block text-[11px] font-medium text-ink-muted">
        Expected
        <select
          className="mt-0.5 w-full rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink"
          value={String(value ?? 'true')}
          onChange={(e) => updateNodeData(id, { value: e.target.value })}
        >
          <option value="true">Yes (opportunity)</option>
          <option value="false">No (lead)</option>
        </select>
      </label>
    )
  }

  return (
    <label className="block text-[11px] font-medium text-ink-muted">
      Value to match
      <input
        className="mt-0.5 w-full rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink"
        value={value ?? ''}
        onChange={(e) => updateNodeData(id, { value: e.target.value })}
        placeholder="Text match (equals / contains)"
      />
    </label>
  )
}

function ConditionFieldNode({ id, data, selected, updateNodeData, leadSetup }) {
  const field = String(data?.field || 'status')
  const dealStatuses = Array.isArray(leadSetup?.dealStatuses) ? leadSetup.dealStatuses : []

  const onFieldChange = (e) => {
    const f = e.target.value
    let v = defaultConditionValueForField(f)
    const sources = Array.isArray(leadSetup?.sources) ? leadSetup.sources : []
    const stages = Array.isArray(leadSetup?.pipelineStatuses) ? leadSetup.pipelineStatuses : []
    if (f === 'pipelineStatus' && stages[0]?.id) v = String(stages[0].id)
    if (f === 'sourceId' && sources[0]?.id) v = String(sources[0].id)
    updateNodeData(id, { field: f, value: v })
  }

  return (
    <NodeShell id={id} title={WORKFLOW_NODE_TYPES.conditionField} subtitle="Control" selected={selected}>
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-neutral-400" />
      <label className="block text-[11px] font-medium text-ink-muted">
        Lead field
        <select className="mt-0.5 w-full rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink" value={field} onChange={onFieldChange}>
          {CONDITION_FIELD_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="block text-[11px] font-medium text-ink-muted">
        Operator
        <select
          className="mt-0.5 w-full rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink"
          value={String(data?.operator || 'equals')}
          onChange={(e) => updateNodeData(id, { operator: e.target.value })}
        >
          <option value="equals">Equals</option>
          <option value="not_equals">Not equals</option>
          <option value="contains">Contains (text)</option>
          <option value="not_contains">Does not contain</option>
          <option value="starts_with">Starts with</option>
          <option value="ends_with">Ends with</option>
          <option value="greater_than">Greater than (number)</option>
          <option value="greater_or_equal">Greater or equal (number)</option>
          <option value="less_than">Less than (number)</option>
          <option value="less_or_equal">Less or equal (number)</option>
          <option value="is_empty">Is empty</option>
          <option value="is_not_empty">Is not empty</option>
          <option value="changed">Changed (Lead Updated trigger only)</option>
        </select>
      </label>
      <ConditionValueControl
        field={field}
        value={data?.value}
        operator={String(data?.operator || 'equals')}
        updateNodeData={updateNodeData}
        id={id}
        leadSetup={leadSetup}
      />
      <p className="text-[10px] leading-snug text-ink-muted">
        Drag from <span className="font-semibold text-rose-700">No</span> or{' '}
        <span className="font-semibold text-emerald-700">Yes</span> at the bottom to branch.
      </p>
      {dealStatuses.length > 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border bg-surface-muted/40 px-2 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-ink-muted">Deal board statuses (reference)</p>
          <p className="mt-0.5 text-[9px] leading-snug text-ink-muted">
            Stored on deals workspace config — not a lead column. Use pipeline stage above for lead pipeline, or compare a text field if you mirror a name.
          </p>
          <ul className="mt-1 max-h-16 overflow-y-auto text-[9px] text-ink-muted">
            {dealStatuses.map((d) => (
              <li key={d.id}>· {d.name}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="relative mt-1 min-h-[40px] w-full border-t border-dashed border-surface-border/80 pt-2">
        <div className="mb-1.5 flex justify-between px-0.5 text-[10px] font-semibold">
          <span className="w-[42%] text-center text-rose-700">No</span>
          <span className="w-[42%] text-center text-emerald-700">Yes</span>
        </div>
        <Handle
          id="false"
          type="source"
          position={Position.Bottom}
          style={{ left: '26%' }}
          className="!h-3 !w-3 !border-2 !border-white !bg-rose-500"
        />
        <Handle
          id="true"
          type="source"
          position={Position.Bottom}
          style={{ left: '74%' }}
          className="!h-3 !w-3 !border-2 !border-white !bg-emerald-500"
        />
      </div>
    </NodeShell>
  )
}

function DelayWaitNode({ id, data, selected, updateNodeData }) {
  const minutes = Number(data?.minutes) || 0
  return (
    <NodeShell id={id} title={WORKFLOW_NODE_TYPES.delayWait} subtitle="Control" selected={selected}>
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-neutral-400" />
      <label className="block text-[11px] font-medium text-ink-muted">
        Wait (minutes)
        <input
          type="number"
          min={0}
          max={10080}
          className="mt-0.5 w-full rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink"
          value={minutes}
          onChange={(e) => updateNodeData(id, { minutes: Math.max(0, Math.min(10080, Number(e.target.value) || 0)) })}
        />
      </label>
      <p className="text-[10px] leading-snug text-ink-muted">Continues after the wait (server checks about every 30s).</p>
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-amber-500" />
    </NodeShell>
  )
}

function WorkflowLeadContextBanner({ compact }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-sky-200/90 bg-sky-50/95 text-[10px] leading-snug text-sky-950 dark:border-sky-500/35 dark:bg-sky-950/50 dark:text-sky-100',
        compact ? 'px-1.5 py-1' : 'px-2 py-1.5',
      )}
    >
      <span className="font-semibold">Lead</span> — the lead that triggered this workflow. After{' '}
      <span className="font-medium">Assign owner</span>, "Lead assignee" uses the new owner for tasks and follow-ups.
    </div>
  )
}

function ActionAssignOwnerNode({ id, data, selected, updateNodeData, teamUsers }) {
  const users = Array.isArray(teamUsers) ? teamUsers : []
  const selectedIds = useMemo(() => {
    const arr = Array.isArray(data?.userIds) ? data.userIds.map((x) => String(x || '').trim()).filter(Boolean) : []
    if (arr.length) return arr
    const one = String(data?.userId || '').trim()
    return one ? [one] : []
  }, [data?.userIds, data?.userId])
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const toggleUser = (uid) => {
    const next = new Set(selectedSet)
    if (next.has(uid)) next.delete(uid)
    else next.add(uid)
    const userIds = users.filter((u) => next.has(u.id)).map((u) => u.id)
    updateNodeData(id, {
      userIds,
      userId: userIds.length === 1 ? userIds[0] : '',
    })
  }

  return (
    <NodeShell id={id} title={WORKFLOW_NODE_TYPES.actionAssignOwner} subtitle="Action" selected={selected}>
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-neutral-400" />
      <div className="text-[11px] font-medium text-ink-muted">Assign to</div>
      <p className="mt-0.5 text-[10px] leading-snug text-ink-muted">
        Check one or more teammates. Each new lead that reaches this step is assigned in{' '}
        <span className="font-semibold text-ink">round-robin</span> order so work is spread evenly (not always the same
        person).
      </p>
      {users.length === 0 ? (
        <p className="text-[10px] text-amber-700 dark:text-amber-300">No team members loaded for this workspace.</p>
      ) : (
        <ul className="scrollbar-subtle mt-1 max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-surface-border bg-surface-muted/40 p-1.5">
          {users.map((u) => {
            const checked = selectedSet.has(u.id)
            return (
              <li key={u.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[11px] hover:bg-white/80 dark:hover:bg-ink/50">
                  <input
                    type="checkbox"
                    className="nodrag h-3.5 w-3.5 shrink-0 rounded border-surface-border text-emerald-600"
                    checked={checked}
                    onChange={() => toggleUser(u.id)}
                  />
                  <span className="min-w-0 truncate font-medium text-ink">{u.name || u.email || u.id}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-[9px] leading-snug text-ink-muted">
        Order of rotation follows the list above (top to bottom), then wraps.
      </p>
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-emerald-500" />
    </NodeShell>
  )
}

function ActionCreateTaskNode({ id, data, selected, updateNodeData, teamUsers }) {
  const users = Array.isArray(teamUsers) ? teamUsers : []
  const assigneeMode = String(data?.assigneeMode || 'from_lead')
  const dueMode = String(data?.dueMode || 'relative_days') === 'none' ? 'none' : 'relative_days'
  const subtasksUi = normalizeWorkflowSubtasksForUi(data)

  const persistSubtasks = (rows) =>
    updateNodeData(id, {
      subtasks: rows.map((r) => ({
        key: r.key,
        title: String(r.title || ''),
        done: Boolean(r.done),
      })),
    })

  return (
    <NodeShell
      id={id}
      title={WORKFLOW_NODE_TYPES.actionCreateTask}
      subtitle="Action"
      selected={selected}
      className="max-w-[300px]"
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-neutral-400" />
      <WorkflowLeadContextBanner compact />
      <div className="scrollbar-subtle max-h-[min(52vh,420px)] space-y-2 overflow-y-auto pr-0.5">
        <label className="block text-[11px] font-medium text-ink-muted">
          Title
          <input
            className="mt-0.5 w-full rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink"
            value={data?.title ?? ''}
            placeholder="e.g. Call back about proposal"
            onChange={(e) => updateNodeData(id, { title: e.target.value })}
          />
        </label>
        <label className="block text-[11px] font-medium text-ink-muted">
          Type
          <select
            className="mt-0.5 w-full rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink"
            value={String(data?.taskType || 'follow_up')}
            onChange={(e) => updateNodeData(id, { taskType: e.target.value })}
          >
            {WORKFLOW_TASK_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[11px] font-medium text-ink-muted">
          Priority
          <select
            className="mt-0.5 w-full rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink"
            value={String(data?.priority || 'medium')}
            onChange={(e) => updateNodeData(id, { priority: e.target.value })}
          >
            {WORKFLOW_TASK_PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[11px] font-medium text-ink-muted">
          Description (optional)
          <textarea
            rows={2}
            className="mt-0.5 w-full resize-none rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink"
            value={data?.description ?? ''}
            placeholder="Notes for the assignee…"
            onChange={(e) => updateNodeData(id, { description: e.target.value })}
          />
        </label>
        <div className="rounded-lg border border-dashed border-surface-border bg-surface-muted/30 px-2 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Subtasks</div>
          <p className="mt-0.5 text-[9px] leading-snug text-ink-muted">Created with the task when the workflow runs (optional).</p>
          <div className="mt-2 space-y-1.5">
            {subtasksUi.map((row, idx) => (
              <div key={row.key} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  className="nodrag h-3.5 w-3.5 shrink-0 rounded border-surface-border text-brand-600"
                  checked={row.done}
                  onChange={(e) => {
                    const next = subtasksUi.map((s, i) => (i === idx ? { ...s, done: e.target.checked } : s))
                    persistSubtasks(next)
                  }}
                />
                <input
                  className="nodrag nopan min-w-0 flex-1 rounded-md border border-surface-border bg-white px-2 py-1 text-[11px] text-ink dark:bg-ink/50"
                  placeholder="Subtask title"
                  value={row.title}
                  onChange={(e) => {
                    const next = subtasksUi.map((s, i) => (i === idx ? { ...s, title: e.target.value } : s))
                    persistSubtasks(next)
                  }}
                />
                <button
                  type="button"
                  className="nodrag nopan shrink-0 rounded-md p-1 text-ink-muted hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                  aria-label="Remove subtask"
                  onClick={() => persistSubtasks(subtasksUi.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="nodrag nopan mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-brand-300/80 bg-slate-50 py-1.5 text-[10px] font-semibold text-brand-800 hover:bg-slate-50/80 dark:border-brand-500/30 dark:bg-brand-950/20 dark:text-brand-200 dark:hover:bg-brand-950/40"
            onClick={() => persistSubtasks([...subtasksUi, { key: newWorkflowSubtaskKey(), title: '', done: false }])}
          >
            <Plus className="h-3 w-3" /> Add subtask
          </button>
        </div>
        <label className="block text-[11px] font-medium text-ink-muted">
          Assign to
          <select
            className="mt-0.5 w-full rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink"
            value={assigneeMode}
            onChange={(e) => updateNodeData(id, { assigneeMode: e.target.value })}
          >
            <option value="from_lead">Lead assignee (owner on record)</option>
            <option value="specific_user">Specific teammate…</option>
            <option value="trigger_actor">User who triggered the workflow</option>
          </select>
        </label>
        {assigneeMode === 'specific_user' ? (
          <label className="block text-[11px] font-medium text-ink-muted">
            Teammate
            <select
              className="mt-0.5 w-full rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink"
              value={String(data?.assignedToUserId || '')}
              onChange={(e) => updateNodeData(id, { assignedToUserId: e.target.value })}
            >
              <option value="">Select user…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email || u.id}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="space-y-1">
          <span className="block text-[11px] font-medium text-ink-muted">Due date</span>
          <div className="flex items-center gap-1.5">
            <select
              className="min-w-0 flex-1 rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink"
              value={dueMode}
              onChange={(e) =>
                updateNodeData(id, {
                  dueMode: e.target.value,
                  dueAtIso: '',
                })
              }
            >
              <option value="none">No due date</option>
              <option value="relative_days">After N days</option>
            </select>
            {dueMode === 'relative_days' ? (
              <div className="flex shrink-0 items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={3650}
                  className="w-14 rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink"
                  value={data?.dueInDays ?? 3}
                  onChange={(e) => updateNodeData(id, { dueInDays: Number(e.target.value) || 0 })}
                />
                <span className="text-[11px] text-ink-muted">days</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-emerald-500" />
    </NodeShell>
  )
}

function ActionCreateFollowupNode({ id, data, selected, updateNodeData }) {
  return (
    <NodeShell
      id={id}
      title={WORKFLOW_NODE_TYPES.actionCreateFollowup}
      subtitle="Action"
      selected={selected}
      className="max-w-[300px]"
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-neutral-400" />
      <WorkflowLeadContextBanner compact />
      <label className="mt-2 block text-[11px] font-medium text-ink-muted">
        When
        <select
          className="mt-0.5 w-full rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink"
          value={String(data?.delayPreset || '15m')}
          onChange={(e) => updateNodeData(id, { delayPreset: e.target.value })}
        >
          {WORKFLOW_FOLLOWUP_DELAY_PRESETS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-[10px] leading-snug text-ink-muted">
        Follow-up is created for the <span className="font-semibold text-ink">lead assignee</span> (use Assign owner
        first if you want a specific owner).
      </p>
      <label className="block text-[11px] font-medium text-ink-muted">
        Note (optional)
        <textarea
          rows={2}
          className="mt-0.5 w-full resize-none rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink"
          value={data?.remark ?? ''}
          placeholder="Shown on the follow-up…"
          onChange={(e) => updateNodeData(id, { remark: e.target.value })}
        />
      </label>
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-emerald-500" />
    </NodeShell>
  )
}

function ActionSendEmailTemplateNode({ id, data, selected, updateNodeData, templates }) {
  const list = Array.isArray(templates) ? templates : []
  return (
    <NodeShell id={id} title={WORKFLOW_NODE_TYPES.actionSendEmailTemplate} subtitle="Action" selected={selected}>
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-neutral-400" />
      <label className="block text-[11px] font-medium text-ink-muted">
        Template
        <select
          className="mt-0.5 w-full rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-xs text-ink"
          value={String(data?.templateId || '')}
          onChange={(e) => updateNodeData(id, { templateId: e.target.value })}
        >
          <option value="">Select template…</option>
          {list.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name || t.id}
            </option>
          ))}
        </select>
      </label>
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-emerald-500" />
    </NodeShell>
  )
}

export function createWorkflowNodeTypes({ updateNodeData, teamUsers, templates, leadSetup }) {
  return {
    triggerLeadCreated: (p) => <TriggerLeadCreatedNode {...p} />,
    triggerLeadUpdated: (p) => <TriggerLeadUpdatedNode {...p} updateNodeData={updateNodeData} />,
    triggerCampaignStageChanged: (p) => <TriggerCampaignStageChangedNode {...p} />,
    triggerCampaignPaymentReceived: (p) => <TriggerCampaignPaymentReceivedNode {...p} />,
    conditionField: (p) => <ConditionFieldNode {...p} updateNodeData={updateNodeData} leadSetup={leadSetup} />,
    delayWait: (p) => <DelayWaitNode {...p} updateNodeData={updateNodeData} />,
    actionAssignOwner: (p) => <ActionAssignOwnerNode {...p} updateNodeData={updateNodeData} teamUsers={teamUsers} />,
    actionCreateTask: (p) => <ActionCreateTaskNode {...p} updateNodeData={updateNodeData} teamUsers={teamUsers} />,
    actionCreateFollowup: (p) => <ActionCreateFollowupNode {...p} updateNodeData={updateNodeData} />,
    actionSendEmailTemplate: (p) => (
      <ActionSendEmailTemplateNode {...p} updateNodeData={updateNodeData} templates={templates} />
    ),
  }
}
