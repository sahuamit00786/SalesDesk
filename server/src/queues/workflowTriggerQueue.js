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

async function processWorkflowTriggerJob(job) {
  if (job.name === 'bulk') {
    const { leadIds, companyId, workspaceId, actorUserId } = job.data
    const eventType = 'lead_created'
    for (const leadId of leadIds) {
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
    }
    return { ok: true, processed: leadIds.length }
  }

  const { eventType, companyId, workspaceId, actorUserId, leadPlain, beforePlain } = job.data
  const summary = await runLeadWorkflowTriggersForLead({
    eventType,
    lead: leadPlain,
    before: beforePlain,
    companyId,
    workspaceId,
    actorUserId,
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
  const matchCount = await countActiveWorkflowTriggersForEvent({ eventType, companyId, workspaceId })
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
  worker.on('error', () => {})
  return worker
}
