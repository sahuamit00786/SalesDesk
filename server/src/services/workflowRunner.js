import { Op } from 'sequelize'
import { sequelize } from '../config/db.js'
import {
  Workflow,
  WorkflowRun,
  WorkflowRunStep,
  Lead,
  LeadTask,
  LeadTaskSubtask,
  LeadFollowup,
  EmailTemplate,
  User,
  Activity,
} from '../models/index.js'
import { runTemplateSendJobInline, enqueueTemplateSendJob, getEmailTemplateQueue } from '../queues/emailTemplateQueue.js'
import { notifyLeadAssigned, notifyTaskAssigned } from './notification/teamNotificationService.js'
import { createLeadSystemActivity } from './leadSystemActivity.js'

const TRIGGER_TYPES = {
  triggerLeadCreated: 'lead_created',
  triggerLeadUpdated: 'lead_updated',
  triggerCampaignStageChanged: 'campaign_lead_stage_changed',
  triggerCampaignPaymentReceived: 'campaign_payment_received',
}

/** Hard ceiling on steps per run, counted across delay resumes (guards cycles through delayWait). */
const MAX_STEPS_PER_RUN = 200

function taskSubtasksFromWorkflowNode(node) {
  const raw = Array.isArray(node?.data?.subtasks) ? node.data.subtasks : []
  return raw
    .map((s) => ({
      title: String(s?.title ?? '').trim().slice(0, 500),
      done: Boolean(s?.done),
    }))
    .filter((s) => s.title)
}

/** Ordered unique user ids for Assign owner (prefers `userIds`, falls back to legacy `userId`). */
function normalizeAssignOwnerUserIds(data) {
  if (!data || typeof data !== 'object') return []
  const arr = Array.isArray(data.userIds) ? data.userIds : []
  const out = []
  const seen = new Set()
  for (const x of arr) {
    const id = String(x || '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  if (out.length) return out
  const single = String(data.userId || '').trim()
  return single ? [single] : []
}

function getDefinition(wf) {
  const d = wf.definitionJson ?? wf.get?.('definition_json')
  return d && typeof d === 'object' ? d : { nodes: [], edges: [] }
}

function triggerNodeTypeForEvent(eventType) {
  switch (eventType) {
    case 'lead_created':
      return 'triggerLeadCreated'
    case 'lead_updated':
      return 'triggerLeadUpdated'
    case 'campaign_lead_stage_changed':
      return 'triggerCampaignStageChanged'
    case 'campaign_payment_received':
      return 'triggerCampaignPaymentReceived'
    default:
      return null
  }
}

/** All trigger nodes matching this event (a workflow may have more than one, e.g. different watchFields). */
function findTriggerNodes(def, eventType) {
  const want = triggerNodeTypeForEvent(eventType)
  if (!want) return []
  return (def.nodes || []).filter((n) => n.type === want)
}

/** watchFields on lead_updated triggers: fire only if one of the listed fields actually changed. */
function triggerWatchFieldsMatch(trigger, eventType, leadPlain, beforePlain) {
  if (eventType !== 'lead_updated') return true
  const watch = Array.isArray(trigger.data?.watchFields) ? trigger.data.watchFields : []
  if (!watch.length) return true
  if (!leadPlain) return true
  return watch.some((f) => {
    const cur = getLeadField(leadPlain, f)
    const prev = beforePlain ? getLeadField(beforePlain, f) : ''
    return cur !== prev
  })
}

/**
 * How many active workflow triggers listen for this event (for skipping empty queue jobs).
 * Pass `lead`/`before` (plain objects) to also respect watchFields on lead_updated triggers.
 */
export async function countActiveWorkflowTriggersForEvent({ eventType, companyId, workspaceId, lead, before }) {
  const rows = await Workflow.findAll({
    where: { companyId, workspaceId, status: 'active' },
    order: [['updatedAt', 'DESC']],
  })
  let n = 0
  for (const wf of rows) {
    const def = getDefinition(wf)
    for (const trigger of findTriggerNodes(def, eventType)) {
      if (!triggerWatchFieldsMatch(trigger, eventType, lead || null, before || null)) continue
      n += 1
    }
  }
  return n
}

function outgoingEdges(def, sourceId) {
  return (def.edges || []).filter((e) => e.source === sourceId)
}

/**
 * All next node ids from a node. Condition nodes follow only edges whose
 * sourceHandle matches the evaluated branch — no fallback to the wrong branch.
 * Other nodes follow every outgoing edge (fan-out branches all execute).
 */
function pickNextNodeIds(def, sourceNode, branch) {
  const outs = outgoingEdges(def, sourceNode.id)
  if (!outs.length) return []
  if (sourceNode.type === 'conditionField') {
    const handle = branch ? 'true' : 'false'
    return outs
      .filter((e) => (e.sourceHandle || 'true') === handle)
      .map((e) => e.target)
      .filter(Boolean)
  }
  return outs.map((e) => e.target).filter(Boolean)
}

function getLeadField(lead, field) {
  const v = lead[field]
  return v === undefined || v === null ? '' : String(v)
}

function compareNumeric(cur, rhs, cmp) {
  const a = Number(cur)
  const b = Number(rhs)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  return cmp(a, b)
}

function evalCondition(lead, before, data) {
  const field = String(data?.field || '').trim()
  const op = String(data?.operator || 'equals').toLowerCase()
  const expected = data?.value
  const cur = getLeadField(lead, field)
  const prev = before ? getLeadField(before, field) : ''
  const rhs = expected === undefined || expected === null ? '' : String(expected)
  if (op === 'is_empty') return cur.trim() === ''
  if (op === 'is_not_empty') return cur.trim() !== ''
  if (op === 'starts_with') return cur.toLowerCase().startsWith(rhs.toLowerCase())
  if (op === 'ends_with') return cur.toLowerCase().endsWith(rhs.toLowerCase())
  if (op === 'contains') return cur.toLowerCase().includes(rhs.toLowerCase())
  if (op === 'not_contains') return !cur.toLowerCase().includes(rhs.toLowerCase())
  if (op === 'not_equals') return String(cur) !== String(rhs)
  if (op === 'changed') return String(cur) !== String(prev)
  if (op === 'greater_than') return compareNumeric(cur, rhs, (a, b) => a > b)
  if (op === 'greater_or_equal') return compareNumeric(cur, rhs, (a, b) => a >= b)
  if (op === 'less_than') return compareNumeric(cur, rhs, (a, b) => a < b)
  if (op === 'less_or_equal') return compareNumeric(cur, rhs, (a, b) => a <= b)
  return String(cur) === String(rhs)
}

const FOLLOWUP_PRESET_MINUTES = {
  '5m': 5,
  '10m': 10,
  '15m': 15,
  '1h': 60,
  '2h': 120,
  '4h': 240,
  '8h': 480,
  '24h': 1440,
}

const TASK_PRIORITY_OK = new Set(['low', 'medium', 'high', 'urgent'])

function resolveTaskAssignee(node, lead, actorUserId) {
  const mode = String(node.data?.assigneeMode || 'from_lead').toLowerCase()
  if (mode === 'specific_user') {
    const id = String(node.data?.assignedToUserId || '').trim()
    if (id) return id
  }
  if (mode === 'trigger_actor') {
    const a = actorUserId ? String(actorUserId).trim() : ''
    if (a) return a
  }
  return lead.assignedTo || lead.ownerUserId || actorUserId || null
}

function resolveTaskDueAt(node) {
  const dueMode = String(node.data?.dueMode || 'relative_days').toLowerCase()
  if (dueMode === 'none') return null
  if (dueMode === 'absolute') {
    const raw = String(node.data?.dueAtIso || '').trim()
    if (!raw) return null
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const dueDays = Number(node.data?.dueInDays)
  if (!Number.isFinite(dueDays) || dueDays < 0) return null
  return new Date(Date.now() + dueDays * 86400000)
}

async function startStep(runId, nodeId, input) {
  return WorkflowRunStep.create({
    runId,
    nodeId,
    status: 'running',
    inputJson: input || null,
    startedAt: new Date(),
  })
}

async function finishStep(stepRow, status, output, err) {
  await stepRow.update({
    status,
    outputJson: output || null,
    errorMessage: err || null,
    finishedAt: new Date(),
  })
}

async function executeNode(run, workflow, node, context) {
  const { lead, before, actorUserId } = context
  const def = context.definition
  const step = await startStep(run.id, node.id, { type: node.type, data: node.data })

  try {
    if (node.type === 'triggerLeadCreated' || node.type === 'triggerLeadUpdated') {
      await finishStep(step, 'completed', { ok: true }, null)
      return { nextNodeIds: pickNextNodeIds(def, node, true) }
    }

    if (node.type === 'conditionField') {
      const ok = evalCondition(lead, before, node.data || {})
      await finishStep(step, 'completed', { branch: ok }, null)
      return { nextNodeIds: pickNextNodeIds(def, node, ok) }
    }

    if (node.type === 'delayWait') {
      const minutes = Math.max(0, Math.min(10080, Number(node.data?.minutes) || 0))
      const nextIds = pickNextNodeIds(def, node, true)
      if (!minutes || !nextIds.length) {
        await finishStep(step, 'completed', { skipped: !minutes }, null)
        return { nextNodeIds: nextIds }
      }
      const waitUntil = new Date(Date.now() + minutes * 60 * 1000)
      await finishStep(step, 'waiting', { waitUntil: waitUntil.toISOString(), resumeTo: nextIds[0] }, null)
      return { waiting: true, waitUntil, resumeNodeIds: nextIds }
    }

    if (node.type === 'actionAssignOwner') {
      // Fast path: snapshot already has an assignee — manual assignment takes priority
      if (lead.assignedTo && String(lead.assignedTo).trim()) {
        await finishStep(step, 'completed', { skipped: true, reason: 'already_assigned', existingAssignee: lead.assignedTo }, null)
        return { nextNodeIds: pickNextNodeIds(def, node, true) }
      }

      const rawPool = normalizeAssignOwnerUserIds(node.data)
      if (!rawPool.length) throw new Error('Assign owner: select at least one teammate')
      // Filter out users who no longer exist or are deactivated
      const activeUsers = await User.findAll({
        where: { id: rawPool, companyId: workflow.companyId, isActive: true },
        attributes: ['id', 'name', 'email'],
      })
      const activeIds = new Set(activeUsers.map((u) => u.id))
      const pool = rawPool.filter((id) => activeIds.has(id))
      if (!pool.length) throw new Error('Assign owner: all configured users are inactive or removed')

      let assignedTo = null
      let skippedExisting = null
      await sequelize.transaction(async (transaction) => {
        // Lock the lead first and re-check: the snapshot may be stale (queued job,
        // retry) and a manual assignment made meanwhile must not be overwritten.
        const row = await Lead.findByPk(lead.id, { transaction, lock: transaction.LOCK.UPDATE })
        if (!row) throw new Error('Lead not found')
        if (row.assignedTo && String(row.assignedTo).trim()) {
          skippedExisting = row.assignedTo
          Object.assign(lead, row.get({ plain: true }))
          return
        }
        if (pool.length > 1) {
          const wfRow = await Workflow.findByPk(workflow.id, {
            transaction,
            lock: transaction.LOCK.UPDATE,
          })
          if (!wfRow) throw new Error('Workflow not found')
          const rawState = wfRow.get('runtimeStateJson')
          const state =
            rawState && typeof rawState === 'object' && !Array.isArray(rawState) ? { ...rawState } : {}
          const prevRr =
            state.assignOwnerRoundRobin && typeof state.assignOwnerRoundRobin === 'object'
              ? state.assignOwnerRoundRobin
              : {}
          const rr = { ...prevRr }
          const key = String(node.id)
          let nextIdx = Number(rr[key])
          if (!Number.isFinite(nextIdx) || nextIdx < 0) nextIdx = 0
          const pickIdx = nextIdx % pool.length
          assignedTo = pool[pickIdx]
          rr[key] = (pickIdx + 1) % pool.length
          state.assignOwnerRoundRobin = rr
          await wfRow.update({ runtimeStateJson: state }, { transaction })
        } else {
          assignedTo = pool[0]
        }
        await row.update({ assignedTo }, { transaction })
        await row.reload({ transaction })
        Object.assign(lead, row.get({ plain: true }))
      })

      if (skippedExisting) {
        await finishStep(step, 'completed', { skipped: true, reason: 'already_assigned', existingAssignee: skippedExisting }, null)
        return { nextNodeIds: pickNextNodeIds(def, node, true) }
      }

      await finishStep(step, 'completed', { assignedTo, roundRobin: pool.length > 1 }, null)
      const assignedUser = activeUsers.find((u) => u.id === assignedTo)
      const assignedName = assignedUser?.name || assignedUser?.email || 'a team member'
      await createLeadSystemActivity({
        leadId: lead.id,
        userId: actorUserId || workflow.createdBy || null,
        body: `"${workflow.name || 'Automation'}" assigned this lead to ${assignedName}`,
        metadata: { action: 'workflow_assign_owner', assignedUserId: assignedTo, workflowId: workflow.id, roundRobin: pool.length > 1 },
      })
      if (assignedTo && String(assignedTo) !== String(actorUserId || '')) {
        notifyLeadAssigned({
          companyId: workflow.companyId,
          workspaceId: lead.workspaceId,
          recipientUserId: assignedTo,
          actorUserId: actorUserId || workflow.createdBy || null,
          leadCount: 1,
        }).catch(() => {})
      }
      return { nextNodeIds: pickNextNodeIds(def, node, true) }
    }

    if (node.type === 'actionCreateTask') {
      const title = String(node.data?.title || '').trim() || 'Workflow task'
      const taskType = String(node.data?.taskType || 'follow_up').trim() || 'follow_up'
      const priority = TASK_PRIORITY_OK.has(String(node.data?.priority)) ? String(node.data.priority) : 'medium'
      const dueAt = resolveTaskDueAt(node)
      const assignedTo = resolveTaskAssignee(node, lead, actorUserId)
      const createdByRaw = actorUserId || workflow.createdBy || lead.ownerUserId || lead.assignedTo
      if (!createdByRaw) throw new Error('Create task: missing actor for createdBy')
      const t = await LeadTask.create({
        leadId: lead.id,
        workspaceId: lead.workspaceId,
        companyId: workflow.companyId,
        title,
        taskType,
        description: node.data?.description != null ? String(node.data.description).trim().slice(0, 8000) || null : null,
        startAt: null,
        dueAt,
        priority,
        status: 'pending',
        completedAt: null,
        createdBy: createdByRaw,
        assignedTo: assignedTo || null,
        attachments: [],
      })
      const subRows = taskSubtasksFromWorkflowNode(node)
      if (subRows.length) {
        await LeadTaskSubtask.bulkCreate(
          subRows.map((s, i) => ({
            leadTaskId: t.id,
            title: s.title,
            done: s.done,
            position: i,
          })),
        )
      }
      if (assignedTo && String(assignedTo) !== String(createdByRaw)) {
        notifyTaskAssigned({
          companyId: workflow.companyId,
          workspaceId: lead.workspaceId,
          recipientUserId: assignedTo,
          actorUserId: createdByRaw,
          tasks: [{ title }],
        }).catch(() => {})
      }
      await finishStep(step, 'completed', { taskId: t.id }, null)
      await createLeadSystemActivity({
        leadId: lead.id,
        userId: actorUserId || workflow.createdBy || null,
        body: `"${workflow.name || 'Automation'}" created a task: "${title}"`,
        metadata: { action: 'workflow_create_task', taskId: t.id, workflowId: workflow.id },
      })
      return { nextNodeIds: pickNextNodeIds(def, node, true) }
    }

    if (node.type === 'actionCreateFollowup') {
      const preset = String(node.data?.delayPreset || '15m')
      const minutes = FOLLOWUP_PRESET_MINUTES[preset] ?? 15
      const scheduledAt = new Date(Date.now() + minutes * 60 * 1000)
      const quickPickMinutes = [5, 10, 15].includes(minutes) ? minutes : null
      const remark =
        node.data?.remark != null ? String(node.data.remark).trim().slice(0, 8000) || null : null
      const ownerForFollowup = lead.assignedTo || lead.ownerUserId || actorUserId || workflow.createdBy
      if (!ownerForFollowup) {
        await finishStep(step, 'skipped', { reason: 'no_assignee_for_followup' }, null)
        return { nextNodeIds: pickNextNodeIds(def, node, true) }
      }
      const row = await LeadFollowup.create({
        leadId: lead.id,
        workspaceId: lead.workspaceId,
        companyId: workflow.companyId,
        scheduledAt,
        remark,
        quickPickMinutes,
        status: 'pending',
        createdBy: ownerForFollowup,
      })
      await finishStep(step, 'completed', { followupId: row.id, scheduledAt: scheduledAt.toISOString() }, null)
      await createLeadSystemActivity({
        leadId: lead.id,
        userId: actorUserId || workflow.createdBy || null,
        body: `"${workflow.name || 'Automation'}" scheduled a follow-up for ${scheduledAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`,
        metadata: { action: 'workflow_create_followup', followupId: row.id, scheduledAt: scheduledAt.toISOString(), workflowId: workflow.id },
      })
      return { nextNodeIds: pickNextNodeIds(def, node, true) }
    }

    if (node.type === 'actionSendEmailTemplate') {
      const templateId = String(node.data?.templateId || '').trim()
      if (!templateId) throw new Error('Send email: missing templateId')
      if (!lead.email) {
        await finishStep(step, 'skipped', { reason: 'lead_has_no_email' }, null)
        return { nextNodeIds: pickNextNodeIds(def, node, true) }
      }
      const template = await EmailTemplate.findOne({
        where: { id: templateId, companyId: workflow.companyId, isArchived: false },
      })
      if (!template) throw new Error('Template not found')
      const payload = { templateId: template.id, leadIds: [lead.id], companyId: workflow.companyId, source: 'workflow' }
      const q = getEmailTemplateQueue()
      if (q) {
        await enqueueTemplateSendJob(payload)
        await finishStep(step, 'completed', { queued: true }, null)
      } else {
        const res = await runTemplateSendJobInline(payload)
        await finishStep(step, 'completed', { inline: true, result: res }, null)
      }
      await createLeadSystemActivity({
        leadId: lead.id,
        userId: actorUserId || workflow.createdBy || null,
        body: `"${workflow.name || 'Automation'}" sent an email: "${template.name || 'Email template'}"`,
        metadata: { action: 'workflow_send_email', templateId: template.id, workflowId: workflow.id },
      })
      return { nextNodeIds: pickNextNodeIds(def, node, true) }
    }

    await finishStep(step, 'skipped', { reason: 'unknown_node_type', type: node.type }, null)
    return { nextNodeIds: pickNextNodeIds(def, node, true) }
  } catch (e) {
    const msg = e?.message || String(e)
    await finishStep(step, 'failed', null, msg)
    await run.update({ status: 'failed', errorMessage: msg, finishedAt: new Date() })
    return { halt: true }
  }
}

/** Persisted wait state: only what the resume path needs (no full lead snapshot). */
function buildWaitContextJson(ctx, def, pendingNodeIds) {
  return {
    leadId: ctx.lead.id,
    actorUserId: ctx.actorUserId || null,
    before: ctx.before ?? null,
    definition: def,
    pendingNodeIds,
  }
}

export async function runWorkflowGraph({ run, workflow, startNodeIds, context }) {
  const def = context.definition || getDefinition(workflow)
  const ctx = { ...context, definition: def }
  const queue = (Array.isArray(startNodeIds) ? startNodeIds : [startNodeIds]).filter(Boolean)
  if (!queue.length) {
    await run.update({ status: 'completed', finishedAt: new Date(), waitUntil: null, resumeNodeId: null })
    return
  }
  // Count across resumes so cycles routed through delayWait cannot run forever.
  let steps = await WorkflowRunStep.count({ where: { runId: run.id } })
  const visited = new Set()
  while (queue.length) {
    const currentId = queue.shift()
    // Converging branches execute a node once; repeat visits (cycles) just stop.
    if (visited.has(currentId)) continue
    visited.add(currentId)
    if (steps >= MAX_STEPS_PER_RUN) {
      await run.update({
        status: 'failed',
        errorMessage: `Step limit of ${MAX_STEPS_PER_RUN} exceeded (possible loop)`,
        finishedAt: new Date(),
      })
      return
    }
    const node = (def.nodes || []).find((n) => n.id === currentId)
    if (!node) {
      await run.update({ status: 'failed', errorMessage: `Missing node ${currentId}`, finishedAt: new Date() })
      return
    }
    const out = await executeNode(run, workflow, node, ctx)
    steps += 1
    if (out.halt) return
    if (out.waiting) {
      const resumeIds = out.resumeNodeIds || []
      const pending = [...resumeIds.slice(1), ...queue]
      await run.update({
        status: 'waiting',
        waitUntil: out.waitUntil,
        resumeNodeId: resumeIds[0] || null,
        contextJson: buildWaitContextJson(ctx, def, pending),
      })
      return
    }
    for (const id of out.nextNodeIds || []) queue.push(id)
  }
  await run.update({ status: 'completed', finishedAt: new Date(), waitUntil: null, resumeNodeId: null })
}

export async function startWorkflowRun({
  workflow,
  triggerNode,
  eventType,
  lead,
  before,
  actorUserId,
}) {
  const def = getDefinition(workflow)
  const triggerType = TRIGGER_TYPES[triggerNode.type] || eventType
  const run = await WorkflowRun.create({
    workflowId: workflow.id,
    version: workflow.publishedVersion || 1,
    triggerType,
    triggerPayloadJson: { leadId: lead.id, eventType },
    status: 'running',
    startedAt: new Date(),
    contextJson: {
      leadId: lead.id,
      actorUserId: actorUserId || null,
      definition: def,
    },
  })
  const context = {
    lead: { ...lead },
    before: before ? { ...before } : null,
    actorUserId: actorUserId || null,
    definition: def,
  }
  const next = await executeNode(run, workflow, triggerNode, context)
  if (next.waiting || next.halt) return
  await runWorkflowGraph({
    run,
    workflow,
    startNodeIds: next.nextNodeIds || [],
    context: { ...context, lead: { ...context.lead } },
  })
}

function toPlainLead(lead) {
  if (!lead) return null
  return typeof lead.get === 'function' ? lead.get({ plain: true }) : { ...lead }
}

/**
 * Run all active workflows for one lead event (used inline and from BullMQ worker).
 * `skipWorkflowIds` + `onWorkflowProcessed` let the queue worker resume a partially
 * processed job after a crash without re-running workflows (idempotent retries).
 */
export async function runLeadWorkflowTriggersForLead({
  eventType,
  lead,
  before,
  companyId,
  workspaceId,
  actorUserId,
  skipWorkflowIds = null,
  onWorkflowProcessed = null,
  workflows = null,
}) {
  const leadPlain = toPlainLead(lead)
  const beforePlain = before ? toPlainLead(before) : null
  const skip = skipWorkflowIds ? new Set([...skipWorkflowIds].map(String)) : null
  const rows =
    workflows ||
    (await Workflow.findAll({
      where: { companyId, workspaceId, status: 'active' },
      order: [['updatedAt', 'DESC']],
    }))
  const summary = { matched: 0, started: 0, failed: 0, errors: [] }
  for (const wf of rows) {
    const def = getDefinition(wf)
    const triggers = findTriggerNodes(def, eventType).filter((t) =>
      triggerWatchFieldsMatch(t, eventType, leadPlain, beforePlain),
    )
    if (!triggers.length) continue
    summary.matched += triggers.length
    if (skip && skip.has(String(wf.id))) {
      // Already processed in a previous attempt of this job
      summary.started += triggers.length
      continue
    }
    for (const trigger of triggers) {
      try {
        await startWorkflowRun({
          workflow: wf,
          triggerNode: trigger,
          eventType,
          lead: { ...leadPlain },
          before: beforePlain ? { ...beforePlain } : null,
          actorUserId,
        })
        summary.started += 1
      } catch (e) {
        summary.failed += 1
        if (summary.errors.length < 10) {
          summary.errors.push({ workflowId: wf.id, message: e?.message || String(e) })
        }
        // eslint-disable-next-line no-console
        console.error('[workflow]', wf.id, e?.message || e)
      }
    }
    if (onWorkflowProcessed) {
      try {
        await onWorkflowProcessed(String(wf.id))
      } catch {
        // progress bookkeeping is best-effort
      }
    }
  }
  return summary
}

/** Queue workflow triggers when REDIS_URL is set; otherwise run immediately on the API process. */
export async function emitLeadWorkflowTriggers({ eventType, lead, before, companyId, workspaceId, actorUserId }) {
  const { tryEnqueueLeadWorkflowTrigger } = await import('../queues/workflowTriggerQueue.js')
  const enqueued = await tryEnqueueLeadWorkflowTrigger({
    eventType,
    lead,
    before,
    companyId,
    workspaceId,
    actorUserId,
  })
  if (enqueued) return
  const summary = await runLeadWorkflowTriggersForLead({
    eventType,
    lead,
    before,
    companyId,
    workspaceId,
    actorUserId,
  })
  const leadId = toPlainLead(lead)?.id
  if (leadId && summary.matched > 0) {
    const { createLeadSystemActivity } = await import('../services/leadSystemActivity.js')
    await createLeadSystemActivity({
      leadId,
      userId: actorUserId || null,
      body: (() => {
        const trigger = eventType === 'lead_created' ? 'lead was created' : eventType === 'lead_updated' ? 'lead was updated' : eventType.replace(/_/g, ' ')
        if (summary.failed > 0) return `${summary.started} of ${summary.matched} automation(s) ran when this ${trigger}; ${summary.failed} failed.`
        return `${summary.started} automation${summary.started === 1 ? '' : 's'} ran when this ${trigger}.`
      })(),
      metadata: { action: 'workflow_triggers_completed', eventType, viaQueue: false, ...summary },
    })
  }
}

/** After CSV import: one BullMQ job processes all new lead IDs (or inline if no Redis). */
export async function emitLeadWorkflowTriggersBulkImport({ leadIds, companyId, workspaceId, actorUserId }) {
  if (!Array.isArray(leadIds) || !leadIds.length) return
  const { tryEnqueueBulkLeadWorkflowTriggers } = await import('../queues/workflowTriggerQueue.js')
  const enqueued = await tryEnqueueBulkLeadWorkflowTriggers({ leadIds, companyId, workspaceId, actorUserId })
  if (enqueued) return

  // No Redis/BullMQ: run inline. Fetch workflows + leads once instead of 2 queries per lead.
  const workflows = await Workflow.findAll({
    where: { companyId, workspaceId, status: 'active' },
    order: [['updatedAt', 'DESC']],
  })
  if (!workflows.length) return

  const leadRows = await Lead.findAll({ where: { id: { [Op.in]: leadIds } } })
  const activityRows = []
  for (const row of leadRows) {
    const summary = await runLeadWorkflowTriggersForLead({
      eventType: 'lead_created',
      lead: row.get({ plain: true }),
      before: null,
      companyId,
      workspaceId,
      actorUserId,
      workflows,
    })
    if (summary.matched > 0) {
      activityRows.push({
        type: 'system',
        leadId: row.id,
        userId: actorUserId || null,
        body:
          summary.failed > 0
            ? `Automation: ${summary.started}/${summary.matched} workflow run(s); ${summary.failed} failed.`
            : `Automation: ${summary.started} workflow run(s) started (import).`,
        metadata: { actorUserId, action: 'workflow_triggers_completed', eventType: 'lead_created', viaQueue: false, ...summary },
      })
    }
  }
  if (activityRows.length) {
    await Activity.bulkCreate(activityRows)
  }
}

let wakeupsInFlight = false

export async function processWorkflowWakeups() {
  // Re-entrancy guard: a slow batch must not overlap the next interval tick.
  if (wakeupsInFlight) return
  wakeupsInFlight = true
  try {
    const now = new Date()
    const waiting = await WorkflowRun.findAll({
      where: { status: 'waiting', waitUntil: { [Op.lte]: now } },
      limit: 50,
      include: [{ model: Workflow, as: 'workflow' }],
    })
    for (const run of waiting) {
      // Atomic claim: only the process that flips waiting → running executes the
      // resume. Protects against overlapping ticks and multiple server instances.
      const [claimed] = await WorkflowRun.update(
        { status: 'running', waitUntil: null },
        { where: { id: run.id, status: 'waiting' } },
      )
      if (!claimed) continue
      run.set({ status: 'running', waitUntil: null })

      const wf = run.workflow
      if (!wf) {
        await run.update({ status: 'failed', errorMessage: 'Workflow deleted before resume', finishedAt: new Date() })
        continue
      }
      const ctxJson = run.contextJson || {}
      const def = ctxJson.definition || getDefinition(wf)
      const lead = await Lead.findByPk(ctxJson.leadId || run.triggerPayloadJson?.leadId)
      if (!lead) {
        await run.update({ status: 'failed', errorMessage: 'Lead missing on resume', finishedAt: new Date() })
        continue
      }
      const leadPlain = lead.get({ plain: true })
      // Close out the delay step(s) that were parked as "waiting"
      await WorkflowRunStep.update(
        { status: 'completed', finishedAt: new Date() },
        { where: { runId: run.id, status: 'waiting' } },
      )
      const startNodeIds = [run.resumeNodeId, ...(Array.isArray(ctxJson.pendingNodeIds) ? ctxJson.pendingNodeIds : [])].filter(Boolean)
      if (!startNodeIds.length) {
        await run.update({ status: 'completed', finishedAt: new Date() })
        continue
      }
      const context = {
        lead: leadPlain,
        before: ctxJson.before ?? null,
        actorUserId: ctxJson.actorUserId || null,
        definition: def,
      }
      try {
        await runWorkflowGraph({ run, workflow: wf, startNodeIds, context })
      } catch (e) {
        await run.update({ status: 'failed', errorMessage: e?.message || String(e), finishedAt: new Date() })
      }
    }
  } finally {
    wakeupsInFlight = false
  }
}
