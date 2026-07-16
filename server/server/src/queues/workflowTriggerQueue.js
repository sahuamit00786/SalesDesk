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
 * @returns {Promise<boolean>} true if job was enqueued
 */
export async function tryEnqueueLeadWorkflowTrigger({ eventType, lead, before, companyId, workspaceId, actorUserId }) {
  const q = getWorkflowTriggerQueue()
  if (!q) return false
  const leadPlain = typeof lead?.get === 'function' ? lead.get({ plain: true }) : { ...lead }
  const beforePlain = before ? (typeof before.get === 'function' ? before.get({ plain: true }) : { ...before }) : null
  if (!leadPlain?.id) return false
  // Pass lead/before so watchFields-only triggers don't enqueue no-op jobs
  const matchCount = await countActiveWorkflowTriggersForEvent({
    eventType,
    companyId,
    workspaceId,
    lead: leadPlain,
    before: beforePlain,
  })
  if (matchCount < 1) return false
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
  return true
}

/** One job processes many new lead IDs (e.g. CSV import). */
export async function tryEnqueueBulkLeadWorkflowTriggers({ leadIds, companyId, workspaceId, actorUserId }) {
  const q = getWorkflowTriggerQueue()
  if (!q || !Array.isArray(leadIds) || !leadIds.length) return false
  const matchCount = await countActiveWorkflowTriggersForEvent({
    eventType: 'lead_created',
    companyId,
    workspaceId,
  })
  if (matchCount < 1) return false
  await q.add(
    'bulk',
    { leadIds, companyId, workspaceId, actorUserId },
    { attempts: 2, removeOnComplete: 100, removeOnFail: 150 },
  )
  return true
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
  })
  return worker
}
