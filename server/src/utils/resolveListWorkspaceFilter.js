/**
 * Workspace scope for GET /leads and similar list endpoints.
 *
 * - Company admins: only `?workspaceId=` (explicit filter). The global `x-workspace-id`
 *   header is ignored so they see all company leads by default.
 * - Other users: `?workspaceId=` or `x-workspace-id` (active workspace from the client).
 *
 * @param {import('express').Request} req
 * @returns {string} UUID or empty string when not narrowing by workspace
 */
export function resolveListWorkspaceFilterId(req) {
  const qRaw = req.query?.workspaceId
  const q = qRaw != null && String(qRaw).trim() !== '' ? String(qRaw).trim() : ''
  const hRaw = req.headers['x-workspace-id']
  const h = hRaw != null && String(hRaw).trim() !== '' ? String(hRaw).trim() : ''
  if (req.user?.isCompanyAdmin) return q
  return q || h
}
