/** Map<menuKey, {canView, canCreate, canUpdate, canDelete}> built from user.allowedMenus. */
export function buildPermissionMap(allowedMenus) {
  const map = new Map()
  for (const m of allowedMenus || []) {
    if (!m?.key) continue
    map.set(m.key, {
      canView: Boolean(m.canView),
      canCreate: Boolean(m.canCreate),
      canUpdate: Boolean(m.canUpdate),
      canDelete: Boolean(m.canDelete),
    })
  }
  return map
}

/**
 * @param {Map} permissionMap from buildPermissionMap
 * @param {string} menuKey e.g. 'manage.quotations'
 * @param {'view'|'create'|'update'|'delete'} action
 */
export function hasMenuPermission(permissionMap, menuKey, action, { isCompanyAdmin = false } = {}) {
  if (isCompanyAdmin) return true
  const perms = permissionMap?.get(menuKey)
  if (!perms) return false
  switch (action) {
    case 'view':
      return perms.canView || perms.canCreate || perms.canUpdate || perms.canDelete
    case 'create':
      return perms.canCreate
    case 'update':
      return perms.canUpdate
    case 'delete':
      return perms.canDelete
    default:
      return false
  }
}
