import { Op } from 'sequelize'
import { EmailSequence, EmailSequenceStep, EmailSequenceEnrollment, Lead } from '../models/index.js'
import { enqueueSequenceStep } from '../queues/emailSequenceQueue.js'

/**
 * GET /email-sequences
 * List all sequences for the current workspace.
 */
export async function listSequences(req, res) {
  try {
    const { companyId } = req.user
    const workspaceId = req.headers['x-workspace-id']

    const where = { companyId }
    if (workspaceId) where.workspaceId = workspaceId

    const sequences = await EmailSequence.findAll({
      where,
      include: [{ model: EmailSequenceStep, as: 'steps', order: [['stepOrder', 'ASC']] }],
      order: [['createdAt', 'DESC']],
    })

    return res.json({ success: true, data: sequences })
  } catch (err) {
    console.error('[emailSequences] listSequences:', err.message)
    return res.status(500).json({ success: false, error: { message: 'Failed to fetch sequences.' } })
  }
}

/**
 * POST /email-sequences
 * Create a sequence with optional steps array.
 */
export async function createSequence(req, res) {
  try {
    const { companyId, id: userId } = req.user
    const workspaceId = req.headers['x-workspace-id']
    const { name, description, triggerType, triggerValue, exitOnReply, exitOnStatus, status, steps } = req.body

    if (!name) {
      return res.status(400).json({ success: false, error: { message: 'name is required.' } })
    }

    const sequence = await EmailSequence.create({
      companyId,
      workspaceId,
      name,
      description: description || null,
      triggerType: triggerType || 'manual',
      triggerValue: triggerValue || null,
      exitOnReply: exitOnReply !== undefined ? exitOnReply : true,
      exitOnStatus: exitOnStatus || null,
      status: status || 'draft',
      createdBy: userId,
    })

    if (Array.isArray(steps) && steps.length > 0) {
      const stepRecords = steps.map((s, idx) => ({
        sequenceId: sequence.id,
        stepOrder: s.stepOrder !== undefined ? s.stepOrder : idx,
        delayDays: s.delayDays || 0,
        delayHours: s.delayHours || 0,
        templateId: s.templateId || null,
        subject: s.subject || null,
        bodyHtml: s.bodyHtml || null,
      }))
      await EmailSequenceStep.bulkCreate(stepRecords)
    }

    const created = await EmailSequence.findByPk(sequence.id, {
      include: [{ model: EmailSequenceStep, as: 'steps', order: [['stepOrder', 'ASC']] }],
    })

    return res.status(201).json({ success: true, data: created })
  } catch (err) {
    console.error('[emailSequences] createSequence:', err.message)
    return res.status(500).json({ success: false, error: { message: 'Failed to create sequence.' } })
  }
}

/**
 * GET /email-sequences/:id
 * Get a single sequence with its steps.
 */
export async function getSequence(req, res) {
  try {
    const { companyId } = req.user
    const sequence = await EmailSequence.findOne({
      where: { id: req.params.id, companyId },
      include: [{ model: EmailSequenceStep, as: 'steps', order: [['stepOrder', 'ASC']] }],
    })

    if (!sequence) {
      return res.status(404).json({ success: false, error: { message: 'Sequence not found.' } })
    }

    return res.json({ success: true, data: sequence })
  } catch (err) {
    console.error('[emailSequences] getSequence:', err.message)
    return res.status(500).json({ success: false, error: { message: 'Failed to fetch sequence.' } })
  }
}

/**
 * PUT /email-sequences/:id
 * Update a sequence and replace its steps.
 */
export async function updateSequence(req, res) {
  try {
    const { companyId } = req.user
    const sequence = await EmailSequence.findOne({
      where: { id: req.params.id, companyId },
    })

    if (!sequence) {
      return res.status(404).json({ success: false, error: { message: 'Sequence not found.' } })
    }

    const { name, description, triggerType, triggerValue, exitOnReply, exitOnStatus, status, steps } = req.body

    await sequence.update({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(triggerType !== undefined && { triggerType }),
      ...(triggerValue !== undefined && { triggerValue }),
      ...(exitOnReply !== undefined && { exitOnReply }),
      ...(exitOnStatus !== undefined && { exitOnStatus }),
      ...(status !== undefined && { status }),
    })

    // Replace steps if provided
    if (Array.isArray(steps)) {
      await EmailSequenceStep.destroy({ where: { sequenceId: sequence.id } })
      if (steps.length > 0) {
        const stepRecords = steps.map((s, idx) => ({
          sequenceId: sequence.id,
          stepOrder: s.stepOrder !== undefined ? s.stepOrder : idx,
          delayDays: s.delayDays || 0,
          delayHours: s.delayHours || 0,
          templateId: s.templateId || null,
          subject: s.subject || null,
          bodyHtml: s.bodyHtml || null,
        }))
        await EmailSequenceStep.bulkCreate(stepRecords)
      }
    }

    const updated = await EmailSequence.findByPk(sequence.id, {
      include: [{ model: EmailSequenceStep, as: 'steps', order: [['stepOrder', 'ASC']] }],
    })

    return res.json({ success: true, data: updated })
  } catch (err) {
    console.error('[emailSequences] updateSequence:', err.message)
    return res.status(500).json({ success: false, error: { message: 'Failed to update sequence.' } })
  }
}

/**
 * DELETE /email-sequences/:id
 */
export async function deleteSequence(req, res) {
  try {
    const { companyId } = req.user
    const sequence = await EmailSequence.findOne({
      where: { id: req.params.id, companyId },
    })

    if (!sequence) {
      return res.status(404).json({ success: false, error: { message: 'Sequence not found.' } })
    }

    await sequence.destroy()
    return res.json({ success: true, data: { message: 'Sequence deleted.' } })
  } catch (err) {
    console.error('[emailSequences] deleteSequence:', err.message)
    return res.status(500).json({ success: false, error: { message: 'Failed to delete sequence.' } })
  }
}

/**
 * POST /email-sequences/:id/enroll
 * Enroll a lead in a sequence. Body: { leadId }
 */
export async function enrollLead(req, res) {
  try {
    const { companyId } = req.user
    const { leadId } = req.body

    if (!leadId) {
      return res.status(400).json({ success: false, error: { message: 'leadId is required.' } })
    }

    const sequence = await EmailSequence.findOne({
      where: { id: req.params.id, companyId },
      include: [{ model: EmailSequenceStep, as: 'steps', order: [['stepOrder', 'ASC']] }],
    })

    if (!sequence) {
      return res.status(404).json({ success: false, error: { message: 'Sequence not found.' } })
    }

    if (sequence.status !== 'active') {
      return res.status(400).json({ success: false, error: { message: 'Sequence is not active.' } })
    }

    const lead = await Lead.findOne({ where: { id: leadId, companyId } })
    if (!lead) {
      return res.status(404).json({ success: false, error: { message: 'Lead not found.' } })
    }

    // Check for existing enrollment
    const existing = await EmailSequenceEnrollment.findOne({
      where: { sequenceId: sequence.id, leadId },
    })

    if (existing) {
      return res.status(409).json({ success: false, error: { message: 'Lead is already enrolled in this sequence.' } })
    }

    const firstStep = sequence.steps?.[0]
    const nextSendAt = firstStep
      ? new Date(Date.now() + (firstStep.delayDays * 86400000) + (firstStep.delayHours * 3600000))
      : null

    const enrollment = await EmailSequenceEnrollment.create({
      sequenceId: sequence.id,
      leadId,
      companyId,
      currentStep: 0,
      status: 'active',
      enrolledAt: new Date(),
      nextSendAt,
    })

    // Schedule first step if there are steps
    if (firstStep) {
      const delayMs = (firstStep.delayDays * 86400000) + (firstStep.delayHours * 3600000)
      enqueueSequenceStep(enrollment.id, delayMs).catch((err) => {
        console.error('[emailSequences] Failed to enqueue first step:', err.message)
      })
    } else {
      // No steps — mark completed immediately
      await enrollment.update({ status: 'completed' })
    }

    return res.status(201).json({ success: true, data: enrollment })
  } catch (err) {
    console.error('[emailSequences] enrollLead:', err.message)
    return res.status(500).json({ success: false, error: { message: 'Failed to enroll lead.' } })
  }
}

/**
 * POST /email-sequences/:id/unenroll
 * Remove a lead from a sequence. Body: { leadId }
 */
export async function unenrollLead(req, res) {
  try {
    const { companyId } = req.user
    const { leadId } = req.body

    if (!leadId) {
      return res.status(400).json({ success: false, error: { message: 'leadId is required.' } })
    }

    const enrollment = await EmailSequenceEnrollment.findOne({
      where: { sequenceId: req.params.id, leadId, companyId },
    })

    if (!enrollment) {
      return res.status(404).json({ success: false, error: { message: 'Enrollment not found.' } })
    }

    await enrollment.update({
      status: 'exited',
      exitedAt: new Date(),
      exitReason: 'manual_unenroll',
    })

    return res.json({ success: true, data: { message: 'Lead unenrolled from sequence.' } })
  } catch (err) {
    console.error('[emailSequences] unenrollLead:', err.message)
    return res.status(500).json({ success: false, error: { message: 'Failed to unenroll lead.' } })
  }
}

/**
 * GET /email-sequences/:id/enrollments
 * List all enrollments for a sequence.
 */
export async function getEnrollments(req, res) {
  try {
    const { companyId } = req.user

    const sequence = await EmailSequence.findOne({
      where: { id: req.params.id, companyId },
    })

    if (!sequence) {
      return res.status(404).json({ success: false, error: { message: 'Sequence not found.' } })
    }

    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
    const offset = (page - 1) * limit

    const where = { sequenceId: sequence.id, companyId }
    if (req.query.status) where.status = req.query.status

    const { count, rows } = await EmailSequenceEnrollment.findAndCountAll({
      where,
      include: [{ model: Lead, as: 'lead', attributes: ['id', 'title', 'contactName', 'email', 'phone', 'status'] }],
      order: [['enrolledAt', 'DESC']],
      limit,
      offset,
    })

    return res.json({
      success: true,
      data: {
        enrollments: rows,
        total: count,
        page,
        pages: Math.ceil(count / limit),
      },
    })
  } catch (err) {
    console.error('[emailSequences] getEnrollments:', err.message)
    return res.status(500).json({ success: false, error: { message: 'Failed to fetch enrollments.' } })
  }
}
