import { Queue, Worker } from 'bullmq'
import { bullmqConnectionFromEnv } from './connection.js'
import { Lead } from '../models/index.js'
import { createLeadSystemActivity } from '../services/leadSystemActivity.js'
import { countActiveWorkflowTriggersForEvent, runLeadWorkflowTriggersForLead } from '../services/workflowRunner.js'

const QUEUE_NAME = 'lead-workflow-triggers'
let queue = null
let worker = null

export function getWorkflowTriggerQueue() {
  if (queue) return queue
  const connection = bullmqConnectionFromEnv()
  if (!connection) return null
  queue = new Queue(QUEUE_NAME, { connection })
  return queue
}

/** BullMQ retries re-run the whole job; job progress records what already ran so retries skip it. */
function progressField(job, key) {
  const p = job.progress
  return p && typeof p === 'object' && Array.isArray(p[key]) ? p[key] : []
}

async function processWorkflowTriggerJob(job) {
  if (job.name === 'bulk') {
    const { leadIds, companyId, workspaceId, actorUserId } = job.data
    const eventType = 'lead_created'
    const doneLeadIds = new Set(progressField(job, 'doneLeadIds').map(String))
    for (const leadId of leadIds) {
      if (doneLeadIds.has(String(leadId))) continue
      const row = await Lead.findByPk(leadId)
      if (!row) continue
      const summary = await runLeadWorkflowTriggersForLead({
        eventType,
        lead: row.get({ plain: true }),
        before: null,
        companyId,
        workspaceId,
        actorUserId,
        // Scoped per lead: a crash mid-batch (before doneLeadIds is updated) redelivers
        // this lead too, so its workflow runs need the same resume-not-restart protection.
        sourceJobId: job.id ? `${job.id}:${leadId}` : null,
      })
      if (summary.matched > 0) {
        await createLeadSystemActivity({
          leadId,
          userId: actorUserId || null,
          body:
            summary.failed > 0
              ? `Automation (queue): ${summary.started}/${summary.matched} workflow run(s); ${summary.failed} failed.`
              : `Automation (queue): ${summary.started} workflow run(s) after import.`,
          metadata: { action: 'workflow_triggers_completed', eventType, viaQueue: true, ...summary },
        })
      }
      doneLeadIds.add(String(leadId))
      await job.updateProgress({ doneLeadIds: [...doneLeadIds] }).catch(() => {})
    }
    return { ok: true, processed: leadIds.length }
  }

  const { eventType, companyId, workspaceId, actorUserId, leadPlain, beforePlain } = job.data
  const doneWorkflowIds = new Set(progressField(job, 'doneWorkflowIds').map(String))
  const summary = await runLeadWorkflowTriggersForLead({
    eventType,
    lead: leadPlain,
    before: beforePlain,
    companyId,
    workspaceId,
    actorUserId,
    skipWorkflowIds: doneWorkflowIds,
    onWorkflowProcessed: async (workflowId) => {
      doneWorkflowIds.add(workflowId)
      await job.updateProgress({ doneWorkflowIds: [...doneWorkflowIds] }).catch(() => {})
    },
    // Stable across retry attempts of this job — lets startWorkflowRun resume a run that
    // failed on a prior attempt instead of re-running it from the trigger node (§4.1).
    sourceJobId: job.id ? String(job.id) : null,
  })
  const leadId = leadPlain?.id
  if (leadId && summary.matched > 0) {
    await createLeadSystemActivity({
      leadId,
      userId: actorUserId || null,
      body:
        summary.failed > 0
          ? `Automation (queue): ${summary.started}/${summary.matched} workflow run(s); ${summary.failed} failed.`
          : `Automation (queue): ${summary.started} workflow run(s) for ${eventType === 'lead_created' ? 'new lead' : 'lead update'}.`,
      metadata: { action: 'workflow_triggers_completed', eventType, viaQueue: true, ...summary },
    })
  }
  return summary
}

/**
 * Enqueue one lead's workflow triggers. Writes a "queued" activity on the lead.
 * @returns {Promise<{enqueued: boolean, checked: boolean, matchCount?: number}>}
 *   `checked: true` means countActiveWorkflowTriggersForEvent already ran here — the
 *   caller can trust matchCount and skip re-querying the same thing (§4.10 of the bug
 *   audit: this used to scan the workflow table here, then the inline fallback path
 *   scanned it again from scratch for the exact same answer).
 */
export async function tryEnqueueLeadWorkflowTrigger({ eventType, lead, before, companyId, workspaceId, actorUserId }) {
  const q = getWorkflowTriggerQueue()
  if (!q) return { enqueued: false, checked: false }
  const leadPlain = typeof lead?.get === 'function' ? lead.get({ plain: true }) : { ...lead }
  const beforePlain = before ? (typeof before.get === 'function' ? before.get({ plain: true }) : { ...before }) : null
  if (!leadPlain?.id) return { enqueued: false, checked: false }
  // Pass lead/before so watchFields-only triggers don't enqueue no-op jobs
  const matchCount = await countActiveWorkflowTriggersForEvent({
    eventType,
    companyId,
    workspaceId,
    lead: leadPlain,
    before: beforePlain,
  })
  if (matchCount < 1) return { enqueued: false, checked: true, matchCount: 0 }
  await q.add(
    'single',
    { eventType, companyId, workspaceId, actorUserId, leadPlain, beforePlain },
    {
      attempts: 3,
      removeOnComplete: 200,
      removeOnFail: 200,
      backoff: { type: 'exponential', delay: 2000 },
    },
  )
  await createLeadSystemActivity({
    leadId: leadPlain.id,
    userId: actorUserId || null,
    body: 'Automation: workflow triggers queued for background processing.',
    metadata: { action: 'workflow_triggers_queued', eventType, viaQueue: true },
  })
  return { enqueued: true, checked: true, matchCount }
}

/** One job processes many new lead IDs (e.g. CSV import). */
// §4.9 of the bug audit: one job for the whole import meant its progress array grew by
// one UUID per lead — a 10,000-lead import wrote a ~360MB cumulative progress payload to
// Redis and held one worker slot for the entire import. Splitting into chunk-sized jobs
// bounds each job's progress array and lets chunks process concurrently.
const BULK_TRIGGER_CHUNK_SIZE = 200

export async function tryEnqueueBulkLeadWorkflowTriggers({ leadIds, companyId, workspaceId, actorUserId }) {
  const q = getWorkflowTriggerQueue()
  if (!q || !Array.isArray(leadIds) || !leadIds.length) return false
  const matchCount = await countActiveWorkflowTriggersForEvent({
    eventType: 'lead_created',
    companyId,
    workspaceId,
  })
  if (matchCount < 1) return false
  const chunks = []
  for (let i = 0; i < leadIds.length; i += BULK_TRIGGER_CHUNK_SIZE) {
    chunks.push(leadIds.slice(i, i + BULK_TRIGGER_CHUNK_SIZE))
  }
  await q.addBulk(
    chunks.map((chunk) => ({
      name: 'bulk',
      data: { leadIds: chunk, companyId, workspaceId, actorUserId },
      opts: { attempts: 2, removeOnComplete: 100, removeOnFail: 150 },
    })),
  )
  return true
}

/**
 * §4.8 of the bug audit: tryEnqueueLeadWorkflowTrigger writes "queued for background
 * processing" on the lead's timeline, but if the job then exhausted every retry attempt,
 * nothing further was ever written — the timeline read as though automation was
 * permanently pending. Only fires once attempts are truly exhausted, not on each
 * intermediate retry.
 */
async function recordWorkflowTriggerFailure(job) {
  const data = job?.data || {}
  const leadIds = data.leadPlain?.id ? [data.leadPlain.id] : Array.isArray(data.leadIds) ? data.leadIds : []
  for (const leadId of leadIds) {
    await createLeadSystemActivity({
      leadId,
      userId: data.actorUserId || null,
      body: 'Automation: workflow triggers failed to run after repeated retries.',
      metadata: { action: 'workflow_triggers_failed', eventType: data.eventType || null },
    }).catch(() => {})
  }
}

export function startWorkflowTriggerWorker() {
  if (worker) return worker
  const connection = bullmqConnectionFromEnv()
  if (!connection) return null
  const concurrency = Math.max(1, Math.min(20, Number(process.env.WORKFLOW_TRIGGER_QUEUE_CONCURRENCY || 4)))
  worker = new Worker(QUEUE_NAME, processWorkflowTriggerJob, { connection, concurrency })
  worker.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[workflow] trigger worker error:', err?.message || err)
  })
  worker.on('failed', (job, err) => {
    // eslint-disable-next-line no-console
    console.error(`[workflow] trigger job ${job?.id || '?'} failed:`, err?.message || err)
    const exhausted = job && (job.attemptsMade || 0) >= (job.opts?.attempts || 1)
    if (exhausted) recordWorkflowTriggerFailure(job).catch(() => {})
  })
  return worker
}
