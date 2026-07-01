import { FilterPreset } from '../models/index.js'
import { allowedWorkspaceIdsForUser } from '../services/userWorkspaceService.js'

const VALID_MODULES = ['leads', 'deals', 'opportunities', 'tasks']

/**
 * GET /filter-presets?module=leads
 * Returns all filter presets for the current user in the current workspace.
 */
export async function getFilterPresets(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'x-workspace-id header is required' } })
    }

    // Verify user has access to this workspace
    const allowedIds = await allowedWorkspaceIdsForUser(req.user)
    if (!req.user.isCompanyAdmin && allowedIds.length && !allowedIds.includes(String(workspaceId))) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No access to this workspace' } })
    }

    const where = {
      userId: req.user.id,
      workspaceId: String(workspaceId),
      companyId: req.user.companyId,
    }

    const module_ = String(req.query.module || '').trim()
    if (module_ && VALID_MODULES.includes(module_)) {
      where.module = module_
    }

    const rows = await FilterPreset.findAll({
      where,
      order: [['created_at', 'ASC']],
    })

    return res.json({ success: true, data: rows, meta: {} })
  } catch (e) {
    return next(e)
  }
}

/**
 * POST /filter-presets
 * Body: { name, module, filterJson }
 */
export async function createFilterPreset(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'x-workspace-id header is required' } })
    }

    const { name, module: module_, filterJson } = req.body || {}

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'name is required' } })
    }
    if (!module_ || !VALID_MODULES.includes(String(module_).trim())) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: `module must be one of: ${VALID_MODULES.join(', ')}` },
      })
    }
    if (!filterJson) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'filterJson is required' } })
    }

    // Verify workspace access
    const allowedIds = await allowedWorkspaceIdsForUser(req.user)
    if (!req.user.isCompanyAdmin && allowedIds.length && !allowedIds.includes(String(workspaceId))) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No access to this workspace' } })
    }

    // Serialize filterJson if object
    const filterJsonStr = typeof filterJson === 'string' ? filterJson : JSON.stringify(filterJson)

    const preset = await FilterPreset.create({
      userId: req.user.id,
      workspaceId: String(workspaceId),
      companyId: req.user.companyId,
      name: String(name).trim().slice(0, 100),
      module: String(module_).trim(),
      filterJson: filterJsonStr,
    })

    return res.status(201).json({ success: true, data: preset, meta: {} })
  } catch (e) {
    return next(e)
  }
}

/**
 * DELETE /filter-presets/:id
 */
export async function deleteFilterPreset(req, res, next) {
  try {
    const preset = await FilterPreset.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
        companyId: req.user.companyId,
      },
    })

    if (!preset) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Filter preset not found' } })
    }

    await preset.destroy()

    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}
