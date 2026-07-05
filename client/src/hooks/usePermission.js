import { useMemo } from 'react'
import { useAppSelector } from '@/app/hooks'
import { buildPermissionMap, hasMenuPermission } from '@/utils/permissionAccess'

/**
 * @param {string} menuKey e.g. 'manage.quotations'
 * @param {'view'|'create'|'update'|'delete'} action
 * @returns {boolean}
 */
export function usePermission(menuKey, action) {
  const user = useAppSelector((s) => s.auth.user)
  const permissionMap = useMemo(() => buildPermissionMap(user?.allowedMenus), [user?.allowedMenus])
  return hasMenuPermission(permissionMap, menuKey, action, { isCompanyAdmin: Boolean(user?.isCompanyAdmin) })
}
