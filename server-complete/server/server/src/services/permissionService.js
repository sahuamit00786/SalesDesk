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

/**
 * Permissions are per-user (UserMenuPermission), not role-scoped — role/userRoleKind is
 * purely a label/tier now, it no longer carries menu-CRUD grants.
 */
export async function loadPermissionSetForUser({ isCompanyAdmin, userId }) {
  if (isCompanyAdmin) return new Set(['*:admin'])
  if (!userId) return new Set()
  const rows = await UserMenuPermission.findAll({
    where: { userId },
    attributes: ['canView', 'canEdit', 'canUpdate', 'canDelete'],
    include: [{ model: MenuMaster, as: 'menu', attributes: ['resource'] }],
  })
  const mapped = []
  for (const r of rows) {
    const m = r.menu
    if (!m?.resource) continue
    if (r.canView) mapped.push({ resource: m.resource, action: 'view' })
    if (r.canEdit) mapped.push({ resource: m.resource, action: 'create' })
    if (r.canUpdate) mapped.push({ resource: m.resource, action: 'update' })
    if (r.canDelete) mapped.push({ resource: m.resource, action: 'delete' })
  }
  return permissionSetFromRows(mapped)
}
