/**
 * Workspace scope for GET /leads and similar list endpoints.
 *
 * Returns the workspace UUID to filter by, or empty string for no filter.
 * Uses `?workspaceId=` query param first, then `x-workspace-id` header.
 * Applies to all users including company admins — everyone sees the selected workspace.
 *
 * @param {import('express').Request} req
 * @returns {string} UUID or empty string when not narrowing by workspace
 */
export function resolveListWorkspaceFilterId(req) {
  const qRaw = req.query?.workspaceId
  const q = qRaw != null && String(qRaw).trim() !== '' ? String(qRaw).trim() : ''
  const hRaw = req.headers['x-workspace-id']
  const h = hRaw != null && String(hRaw).trim() !== '' ? String(hRaw).trim() : ''
  return q || h
}
