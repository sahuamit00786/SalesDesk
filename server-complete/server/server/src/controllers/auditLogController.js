import { Op } from 'sequelize'
import { AuditLog } from '../models/index.js'

/**
 * GET /audit-logs
 * Paginated audit log viewer — admin only.
 * Query params: page, limit, userId, resourceType, startDate, endDate
 */
export async function getAuditLogs(req, res) {
  try {
    const user = req.user

    // Only company admins may view audit logs
    const isAdmin = user.isCompanyAdmin || user.companyRole?.name?.toLowerCase() === 'admin'
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied. Company admins only.' },
      })
    }

    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
    const offset = (page - 1) * limit

    const where = { companyId: user.companyId }

    if (req.query.userId) {
      where.userId = req.query.userId
    }

    if (req.query.resourceType) {
      where.resourceType = req.query.resourceType
    }

    if (req.query.startDate || req.query.endDate) {
      where.createdAt = {}
      if (req.query.startDate) {
        where.createdAt[Op.gte] = new Date(req.query.startDate)
      }
      if (req.query.endDate) {
        // Include the entire end day
        const end = new Date(req.query.endDate)
        end.setHours(23, 59, 59, 999)
        where.createdAt[Op.lte] = end
      }
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    })

    return res.json({
      success: true,
      data: {
        logs: rows,
        total: count,
        page,
        pages: Math.ceil(count / limit),
      },
    })
  } catch (err) {
    console.error('[auditLogController] getAuditLogs error:', err.message)
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch audit logs.' },
    })
  }
}
