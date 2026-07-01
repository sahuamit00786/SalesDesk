import { Queue, Worker } from 'bullmq'
import { bullmqConnectionFromEnv } from './connection.js'
import { getMailTransport } from '../services/mailService.js'

const QUEUE_NAME = 'emailSequence'
let queue = null
let worker = null

export function getEmailSequenceQueue() {
  if (queue) return queue
  const connection = bullmqConnectionFromEnv()
  if (!connection) return null
  queue = new Queue(QUEUE_NAME, { connection })
  return queue
}

/**
 * Enqueue a sequence step job.
 * @param {string} enrollmentId
 * @param {number} delayMs - delay before processing in milliseconds
 */
export async function enqueueSequenceStep(enrollmentId, delayMs = 0) {
  const q = getEmailSequenceQueue()
  if (!q) {
    console.warn('[emailSequenceQueue] Queue unavailable (no REDIS_URL). Step not enqueued.')
    return null
  }
  return q.add('processSequenceStep', { enrollmentId }, {
    delay: delayMs,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  })
}

async function processSequenceStep(job) {
  const { enrollmentId } = job.data

  // Lazy import to avoid circular deps at module load time
  const {
    EmailSequenceEnrollment,
    EmailSequence,
    EmailSequenceStep,
    Lead,
  } = await import('../models/index.js')

  const enrollment = await EmailSequenceEnrollment.findByPk(enrollmentId, {
    include: [
      {
        model: EmailSequence,
        as: 'sequence',
        include: [{ model: EmailSequenceStep, as: 'steps', order: [['stepOrder', 'ASC']] }],
      },
    ],
  })

  if (!enrollment) {
    console.warn(`[emailSequenceQueue] Enrollment ${enrollmentId} not found.`)
    return { ok: false, reason: 'enrollment_not_found' }
  }

  if (enrollment.status !== 'active') {
    console.log(`[emailSequenceQueue] Enrollment ${enrollmentId} is ${enrollment.status} — skipping.`)
    return { ok: false, reason: 'not_active' }
  }

  const sequence = enrollment.sequence
  if (!sequence) {
    await enrollment.update({ status: 'failed', exitReason: 'sequence_missing' })
    return { ok: false, reason: 'sequence_missing' }
  }

  const steps = (sequence.steps || []).sort((a, b) => a.stepOrder - b.stepOrder)
  const step = steps[enrollment.currentStep]

  if (!step) {
    // No more steps — mark completed
    await enrollment.update({ status: 'completed', nextSendAt: null })
    return { ok: true, reason: 'completed' }
  }

  // Load the lead
  const lead = await Lead.findByPk(enrollment.leadId)
  if (!lead) {
    await enrollment.update({ status: 'failed', exitReason: 'lead_not_found', exitedAt: new Date() })
    return { ok: false, reason: 'lead_not_found' }
  }

  if (!lead.email) {
    // Can't send without email — advance or mark failed
    console.warn(`[emailSequenceQueue] Lead ${lead.id} has no email — skipping step.`)
  } else {
    // Resolve subject/body from step or referenced template
    let subject = step.subject
    let bodyHtml = step.bodyHtml

    if (step.templateId && (!subject || !bodyHtml)) {
      try {
        const { EmailTemplate } = await import('../models/index.js')
        const tpl = await EmailTemplate.findByPk(step.templateId)
        if (tpl) {
          if (!subject) subject = tpl.subject
          if (!bodyHtml) bodyHtml = tpl.bodyHtml
        }
      } catch (e) {
        console.error('[emailSequenceQueue] Failed to load template:', e.message)
      }
    }

    const transport = getMailTransport()
    if (transport && subject && bodyHtml) {
      try {
        await transport.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: lead.email,
          subject: subject || `(No subject)`,
          html: bodyHtml,
        })
      } catch (sendErr) {
        console.error(`[emailSequenceQueue] Send failed for enrollment ${enrollmentId}:`, sendErr.message)
        // Continue advancing — don't block the sequence on a single send failure
      }
    } else {
      console.warn(`[emailSequenceQueue] SMTP not configured or step has no content. Skipping send for step ${step.id}.`)
    }
  }

  // Advance to next step
  const nextStepIndex = enrollment.currentStep + 1
  const nextStep = steps[nextStepIndex]

  if (nextStep) {
    const delayMs = (nextStep.delayDays * 86400000) + (nextStep.delayHours * 3600000)
    const nextSendAt = new Date(Date.now() + delayMs)
    await enrollment.update({ currentStep: nextStepIndex, nextSendAt })
    // Schedule next step job
    await enqueueSequenceStep(enrollmentId, delayMs)
  } else {
    // All steps done
    await enrollment.update({ status: 'completed', nextSendAt: null, currentStep: nextStepIndex })
  }

  return { ok: true, stepId: step.id, nextStepIndex }
}

export function startEmailSequenceWorker() {
  if (worker) return worker
  const connection = bullmqConnectionFromEnv()
  if (!connection) return null
  worker = new Worker(QUEUE_NAME, processSequenceStep, { connection, concurrency: 3 })
  worker.on('error', (err) => {
    console.error('[emailSequenceQueue] worker error:', err?.message || err)
  })
  worker.on('failed', (job, err) => {
    console.error(`[emailSequenceQueue] job ${job?.id} failed:`, err?.message || err)
  })
  return worker
}
