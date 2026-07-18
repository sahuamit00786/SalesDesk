import { Workspace } from '../models/index.js'
import { allowedWorkspaceIdsForUser } from './userWorkspaceService.js'

export async function requireWorkspaceFromRequest(req) {
  const workspaceId = req.headers['x-workspace-id']
  if (!workspaceId) {
    const err = new Error('workspaceId is required')
    err.status = 400
    err.code = 'VALIDATION'
    err.publicMessage = 'Set x-workspace-id header'
    throw err
  }

  const allowed = await allowedWorkspaceIdsForUser(req.user)
  if (!allowed.length || !allowed.map(String).includes(String(workspaceId))) {
    const err = new Error('Forbidden')
    err.status = 403
    err.code = 'FORBIDDEN'
    err.publicMessage = 'You do not have access to this workspace'
    throw err
  }

  const workspace = await Workspace.findOne({
    where: { id: workspaceId, companyId: req.user.companyId },
  })
  if (!workspace) {
    const err = new Error('Not found')
    err.status = 404
    err.code = 'NOT_FOUND'
    throw err
  }

  return { workspace, workspaceId: String(workspaceId) }
}
