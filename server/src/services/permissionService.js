import { UserMenuPermission, MenuMaster } from '../models/index.js'

/** @param {{resource:string, action:string}[]} rows */
export function permissionSetFromRows(rows) {
  const set = new Set()
  for (const r of rows) {
    set.add(`${r.resource}:${r.action}`)
  }
  return set
}

/**
 * Action vocabulary is real CRUD: 'view' | 'create' | 'update' | 'delete' (+ 'admin' for
 * company-admin-only config sub-pages, reachable only via the '*:admin' wildcard).
 * create/update/delete each imply 'view' (can't grant "modify" without "see"), but they
 * do NOT imply each other — a create-only role can't update or delete, and vice versa.
 * @param {Set<string>} set
 */
export function can(set, resource, action) {
  if (!set || set.size === 0) return false
  if (set.has('*:admin')) return true
  if (set.has(`${resource}:admin`)) return true
  if (action === 'view') {
    return (
      set.has(`${resource}:view`) ||
      set.has(`${resource}:create`) ||
      set.has(`${resource}:update`) ||
      set.has(`${resource}:delete`)
    )
  }
  return set.has(`${resource}:${action}`)
}

function mapMenuRows(rows) {
  const mapped = []
  for (const r of rows) {
    const m = r.menu
    if (!m?.resource) continue
    if (r.canView) mapped.push({ resource: m.resource, action: 'view' })
    if (r.canEdit) mapped.push({ resource: m.resource, action: 'create' })
    if (r.canUpdate) mapped.push({ resource: m.resource, action: 'update' })
    if (r.canDelete) mapped.push({ resource: m.resource, action: 'delete' })
  }
  return mapped
}

/**
 * Permissions are per-user (UserMenuPermission), not role-scoped — role/userRoleKind is
 * purely a label/tier now, it no longer carries menu-CRUD grants.
 *
 * When `workspaceId` is given, a workspace-scoped override (rows with that exact
 * workspaceId) takes over entirely if any exist; otherwise falls back to the user's
 * global grant (workspaceId IS NULL) — same behavior as before this param existed.
 * A wrong/unrecognized workspaceId just means "0 override rows found, fall back to
 * global" — harmless, since an override row can only exist because an admin already
 * created it for that exact (userId, workspaceId).
 */
export async function loadPermissionSetForUser({ isCompanyAdmin, userId, workspaceId }) {
  if (isCompanyAdmin) return new Set(['*:admin'])
  if (!userId) return new Set()

  if (workspaceId) {
    const overrideRows = await UserMenuPermission.findAll({
      where: { userId, workspaceId },
      attributes: ['canView', 'canEdit', 'canUpdate', 'canDelete'],
      include: [{ model: MenuMaster, as: 'menu', attributes: ['resource'] }],
    })
    if (overrideRows.length) return permissionSetFromRows(mapMenuRows(overrideRows))
  }

  const rows = await UserMenuPermission.findAll({
    where: { userId, workspaceId: null },
    attributes: ['canView', 'canEdit', 'canUpdate', 'canDelete'],
    include: [{ model: MenuMaster, as: 'menu', attributes: ['resource'] }],
  })
  return permissionSetFromRows(mapMenuRows(rows))
}
