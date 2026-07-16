import { Reminder } from '../models/Reminder.js'
import { Op } from 'sequelize'

/**
 * List reminders
 * GET /reminders
 */
export async function listReminders(req, res) {
  try {
    const {
      from,
      to,
      status,
      ownerUserId,
      targetType,
      page = 1,
      limit = 50,
    } = req.query

    const companyId = req.company?.id || req.user?.companyId
    const workspaceId = req.headers['x-workspace-id']

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' })
    }

    const where = { companyId, workspaceId }

    if (status) where.status = status
    if (ownerUserId) where.ownerUserId = ownerUserId
    if (targetType) where.targetType = targetType

    if (from || to) {
      where.remindAt = {}
      if (from) where.remindAt[Op.gte] = new Date(from)
      if (to) where.remindAt[Op.lte] = new Date(to)
    }

    const offset = (page - 1) * limit

    const { rows, count } = await Reminder.findAndCountAll({
      where,
      order: [['remindAt', 'ASC']],
      limit: Number(limit),
      offset: Number(offset),
    })

    return res.json({
      data: rows,
      meta: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(count / limit),
      },
    })
  } catch (err) {
    console.error('List reminders error:', err)
    return res.status(500).json({ message: err.message || 'Failed to list reminders' })
  }
}

/**
 * Create reminder
 * POST /reminders
 */
export async function createReminder(req, res) {
  try {
    const companyId = req.company?.id || req.user?.companyId
    const workspaceId = req.headers['x-workspace-id']

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' })
    }

    const {
      title,
      notes,
      remindAt,
      targetType = 'general',
      targetId,
      color,
      channelPush = true,
      channelEmail = true,
      ownerUserId,
    } = req.body

    const reminder = await Reminder.create({
      companyId,
      workspaceId,
      createdBy: req.user.id,
      ownerUserId: ownerUserId || req.user.id,
      title,
      notes,
      remindAt: new Date(remindAt),
      targetType,
      targetId,
      color,
      channelPush,
      channelEmail,
    })

    return res.status(201).json({
      data: reminder,
      message: 'Reminder created successfully',
    })
  } catch (err) {
    console.error('Create reminder error:', err)
    return res.status(500).json({ message: err.message || 'Failed to create reminder' })
  }
}

/**
 * Patch/update reminder
 * PATCH /reminders/:id
 */
export async function patchReminder(req, res) {
  try {
    const { id } = req.params
    const companyId = req.company?.id || req.user?.companyId
    const workspaceId = req.headers['x-workspace-id']

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' })
    }

    const reminder = await Reminder.findOne({
      where: { id, companyId, workspaceId },
    })

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' })
    }

    const updates = {}
    const allowedFields = [
      'title',
      'notes',
      'remindAt',
      'status',
      'targetType',
      'targetId',
      'color',
      'channelPush',
      'channelEmail',
      'ownerUserId',
    ]

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field]
      }
    }

    // Auto-set completedAt when status changes to done
    if (updates.status === 'done' && reminder.status !== 'done') {
      updates.completedAt = new Date()
    }
    // Clear completedAt if reopened
    if (updates.status === 'pending' && reminder.status !== 'pending') {
      updates.completedAt = null
    }

    if (updates.remindAt) {
      updates.remindAt = new Date(updates.remindAt)
    }

    await reminder.update(updates)

    return res.json({
      data: reminder,
      message: 'Reminder updated successfully',
    })
  } catch (err) {
    console.error('Patch reminder error:', err)
    return res.status(500).json({ message: err.message || 'Failed to update reminder' })
  }
}

/**
 * Delete reminder
 * DELETE /reminders/:id
 */
export async function deleteReminder(req, res) {
  try {
    const { id } = req.params
    const companyId = req.company?.id || req.user?.companyId
    const workspaceId = req.headers['x-workspace-id']

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' })
    }

    const reminder = await Reminder.findOne({
      where: { id, companyId, workspaceId },
    })

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' })
    }

    await reminder.destroy()

    return res.json({ message: 'Reminder deleted successfully' })
  } catch (err) {
    console.error('Delete reminder error:', err)
    return res.status(500).json({ message: err.message || 'Failed to delete reminder' })
  }
}
