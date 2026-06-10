import {
  getCompanyNotificationSettings,
  updateCompanyNotificationSettings,
} from '../services/notification/notificationPreferencesService.js'
import { NotificationDeliveryLog, User } from '../models/index.js'

export async function getNotificationEmailSettings(req, res, next) {
  try {
    const settings = await getCompanyNotificationSettings(req.user.companyId)
    return res.json({ success: true, data: settings, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patchNotificationEmailSettings(req, res, next) {
  try {
    if (!req.user.isCompanyAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only company admins can update notification settings' },
      })
    }
    const settings = await updateCompanyNotificationSettings(req.user.companyId, req.body || {})
    return res.json({ success: true, data: settings, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function listNotificationDeliveryHistory(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25))
    const offset = (page - 1) * limit
    const where = { companyId: req.user.companyId }

    if (req.query.eventType) where.eventType = String(req.query.eventType)
    if (req.query.channel) where.channel = String(req.query.channel)
    if (req.query.status) where.status = String(req.query.status)

    const canViewAll = req.user.isCompanyAdmin
    if (!canViewAll) {
      where.recipientUserId = req.user.id
    } else if (req.query.userId) {
      where.recipientUserId = String(req.query.userId)
    }

    const { count, rows } = await NotificationDeliveryLog.findAndCountAll({
      where,
      include: [
        { model: User, as: 'recipient', attributes: ['id', 'name', 'email'], required: false },
        { model: User, as: 'actor', attributes: ['id', 'name', 'email'], required: false },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    })

    return res.json({
      success: true,
      data: rows,
      meta: { page, limit, total: count },
    })
  } catch (e) {
    return next(e)
  }
}
