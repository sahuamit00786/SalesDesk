import { CompanyRole, User } from '../models/index.js'

export const HR_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
}

export async function resolveHrRole(user) {
  if (!user) return HR_ROLES.EMPLOYEE
  if (user.isCompanyAdmin) return HR_ROLES.ADMIN
  if (user.companyRoleId) {
    const role = await CompanyRole.findByPk(user.companyRoleId, { attributes: ['userRoleKind'] })
    const kind = String(role?.userRoleKind || '').toLowerCase()
    if (kind === 'manager' || kind === 'workspace_admin') return HR_ROLES.MANAGER
  }
  return HR_ROLES.EMPLOYEE
}

export function isHrAdmin(role) {
  return role === HR_ROLES.ADMIN
}

export function isHrManagerOrAdmin(role) {
  return role === HR_ROLES.ADMIN || role === HR_ROLES.MANAGER
}

/** Manager sees users in same department string; admin sees all active company users. */
export async function companyUserScopeWhere(req, hrRole) {
  const companyId = req.user.companyId
  const base = { companyId, isActive: true }
  if (isHrAdmin(hrRole)) return base
  if (hrRole === HR_ROLES.MANAGER) {
    const me = await User.findByPk(req.user.id, { attributes: ['department'] })
    const dept = String(me?.department || '').trim()
    if (dept) return { ...base, department: dept }
  }
  return { ...base, id: req.user.id }
}
