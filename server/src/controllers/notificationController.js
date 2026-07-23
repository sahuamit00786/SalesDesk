import { Op, fn, col, literal } from 'sequelize'
import { Notification } from '../models/index.js'
import { NOTIFICATION_CATEGORIES, categoryForType, typesForCategory } from '../services/notification/notificationCategories.js'

const RANGES = new Set(['today', 'week'])

function rangeStart(range) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (range === 'today') return startOfToday
  if (range === 'week') {
    const d = new Date(startOfToday)
    d.setDate(d.getDate() - 6)
    return d
  }
  return null
}

/**
 * GET /notifications?page=1&limit=20&unreadOnly=true&range=today|week|all&category=leads|...
 */
export async function getNotifications(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const offset = (page - 1) * limit
    const unreadOnly = ['true', '1', 'yes'].includes(String(req.query.unreadOnly || '').toLowerCase())
    const range = RANGES.has(String(req.query.range)) ? String(req.query.range) : 'all'
    const category = String(req.query.category || 'all')

    const where = {
      userId: req.user.id,
      companyId: req.user.companyId,
      workspaceId: req.workspaceId,
      // HR/attendance module isn't in use — hide stray attendance notifications
      // (e.g. leftover "Marked absent" rows from before the module was parked).
      type: { [Op.ne]: 'attendance' },
    }
    if (unreadOnly) where.isRead = false

    const start = rangeStart(range)
    if (start) where.createdAt = { [Op.gte]: start }

    if (category !== 'all') {
      const types = typesForCategory(category)
      where.type = types.length ? { [Op.in]: types } : { [Op.in]: [] }
    }

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
      meta: { range, category },
    })
  } catch (e) {
    return next(e)
  }
}

/**
 * GET /notifications/summary
 * Counts for the notification center's filter chips: total unread, today's
 * count, and per-category totals (each with its own unread count).
 */
export async function getNotificationSummary(req, res, next) {
  try {
    const where = {
      userId: req.user.id,
      companyId: req.user.companyId,
      workspaceId: req.workspaceId,
      type: { [Op.ne]: 'attendance' },
    }

    const [rows, totalUnread, todayCount] = await Promise.all([
      Notification.findAll({
        where,
        attributes: ['type', [fn('COUNT', col('id')), 'count'], [fn('SUM', literal('CASE WHEN is_read = 0 THEN 1 ELSE 0 END')), 'unread']],
        group: ['type'],
        raw: true,
      }),
      Notification.count({ where: { ...where, isRead: false } }),
      Notification.count({ where: { ...where, createdAt: { [Op.gte]: rangeStart('today') } } }),
    ])

    const categoryTotals = new Map(
      NOTIFICATION_CATEGORIES.map((c) => [c.id, { id: c.id, label: c.label, count: 0, unread: 0 }]),
    )
    for (const row of rows) {
      const bucket = categoryTotals.get(categoryForType(row.type))
      if (!bucket) continue
      bucket.count += Number(row.count) || 0
      bucket.unread += Number(row.unread) || 0
    }

    return res.json({
      success: true,
      data: {
        totalUnread,
        todayCount,
        categories: Array.from(categoryTotals.values()),
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
        workspaceId: req.workspaceId,
      },
    })

    if (!notification) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } })
    }

    await notification.update({ isRead: true, seenAt: notification.seenAt || new Date() })

    return res.json({ success: true, data: notification, meta: {} })
  } catch (e) {
    return next(e)
  }
}

/**
 * POST /notifications/mark-seen  { ids: [uuid, ...] }
 * Marks notifications as "seen" (rendered in the bell/center) without marking
 * them read — clears the per-row "new" dot but leaves the unread badge alone.
 */
export async function markNotificationsSeen(req, res, next) {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((id) => typeof id === 'string' && id) : []
    if (!ids.length) {
      return res.json({ success: true, data: { updated: 0 }, meta: {} })
    }

    const [updated] = await Notification.update(
      { seenAt: new Date() },
      {
        where: {
          id: { [Op.in]: ids },
          userId: req.user.id,
          companyId: req.user.companyId,
          workspaceId: req.workspaceId,
          seenAt: null,
        },
      },
    )

    return res.json({ success: true, data: { updated }, meta: {} })
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
      { isRead: true, seenAt: literal('COALESCE(seen_at, NOW())') },
      {
        where: {
          userId: req.user.id,
          companyId: req.user.companyId,
          workspaceId: req.workspaceId,
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
        workspaceId: req.workspaceId,
        isRead: false,
        type: { [Op.ne]: 'attendance' },
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
export async function createNotification({ userId, companyId, workspaceId, type, title, body, resourceType, resourceId, link }) {
  try {
    await Notification.create({
      userId,
      companyId,
      workspaceId,
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
