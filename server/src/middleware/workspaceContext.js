import { requireWorkspaceFromRequest } from '../services/workspaceScope.js'

export async function workspaceContext(req, res, next) {
  try {
    const { workspace, workspaceId } = await requireWorkspaceFromRequest(req)
    req.workspaceId = workspaceId
    req.workspace = workspace
    return next()
  } catch (err) {
    return next(err)
  }
}
