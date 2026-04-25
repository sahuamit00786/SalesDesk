import { Lead } from '../models/index.js'
import { leadAccessWhere } from '../services/leadVisibility.js'
import { allowedWorkspaceIdsForUser } from '../services/userWorkspaceService.js'

export async function list(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const offset = (page - 1) * limit

    const accessWhere = await leadAccessWhere(req.user)
    const selectedWorkspaceId = req.query.workspaceId || req.headers['x-workspace-id']
    const allowedWorkspaceIds = await allowedWorkspaceIdsForUser(req.user)
    if (selectedWorkspaceId) {
      if (!allowedWorkspaceIds.includes(String(selectedWorkspaceId))) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to this workspace' },
        })
      }
      accessWhere.workspaceId = String(selectedWorkspaceId)
    } else if (allowedWorkspaceIds.length && !req.user.isCompanyAdmin) {
      accessWhere.workspaceId = allowedWorkspaceIds
    }

    const { count, rows } = await Lead.findAndCountAll({
      where: accessWhere,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'title', 'ownerUserId', 'companyId', 'createdAt', 'updatedAt'],
    })

    return res.json({
      success: true,
      data: {
        items: rows.map((l) => ({
          id: l.id,
          title: l.title,
          ownerUserId: l.ownerUserId,
          companyId: l.companyId,
          createdAt: l.createdAt?.toISOString() ?? null,
          updatedAt: l.updatedAt?.toISOString() ?? null,
        })),
      },
      meta: {
        page,
        limit,
        total: count,
      },
    })
  } catch (e) {
    return next(e)
  }
}
