import { Op } from 'sequelize'
import { Notification } from '../models/index.js'

/**
 * GET /notifications?page=1&limit=20&unreadOnly=true
 */
export async function getNotifications(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const offset = (page - 1) * limit
    const unreadOnly = ['true', '1', 'yes'].includes(String(req.query.unreadOnly || '').toLowerCase())

    const where = {
      userId: req.user.id,
      companyId: req.user.companyId,
    }
    if (unreadOnly) where.isRead = false

    const { count, rows } = await Notification.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    })

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

/**
 * POST /notifications/:id/read
 */
export async function markNotificationRead(req, res, next) {
  try {
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
        companyId: req.user.companyId,
      },
    })

    if (!notification) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } })
    }

    await notification.update({ isRead: true })

    return res.json({ success: true, data: notification, meta: {} })
  } catch (e) {
    return next(e)
  }
}

/**
 * POST /notifications/read-all
 */
export async function markAllRead(req, res, next) {
  try {
    await Notification.update(
      { isRead: true },
      {
        where: {
          userId: req.user.id,
          companyId: req.user.companyId,
          isRead: false,
        },
      },
    )

    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

/**
 * GET /notifications/unread-count
 * Returns { count: N }
 */
export async function getUnreadCount(req, res, next) {
  try {
    const count = await Notification.count({
      where: {
        userId: req.user.id,
        companyId: req.user.companyId,
        isRead: false,
      },
    })

    return res.json({ success: true, data: { count }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

/**
 * Helper function: creates a notification without throwing.
 * Non-fatal — notifications should never block the main operation.
 *
 * @param {Object} opts
 * @param {string} opts.userId
 * @param {string} opts.companyId
 * @param {string} opts.type
 * @param {string} opts.title
 * @param {string} [opts.body]
 * @param {string} [opts.resourceType]
 * @param {string} [opts.resourceId]
 * @param {string} [opts.link]
 */
export async function createNotification({ userId, companyId, type, title, body, resourceType, resourceId, link }) {
  try {
    await Notification.create({
      userId,
      companyId,
      type: type || 'info',
      title,
      message: body || null,
      resourceType: resourceType || null,
      resourceId: resourceId || null,
      link: link || null,
      isRead: false,
    })
  } catch (e) {
    console.error('Failed to create notification:', e.message)
    // Non-fatal — notifications should never block the main operation
  }
}
