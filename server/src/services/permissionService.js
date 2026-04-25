import { CompanyRoleMenu, MenuMaster } from '../models/index.js'

/** @param {{resource:string, action:string}[]} rows */
export function permissionSetFromRows(rows) {
  const set = new Set()
  for (const r of rows) {
    set.add(`${r.resource}:${r.action}`)
  }
  return set
}

/** @param {Set<string>} set */
export function can(set, resource, action) {
  if (!set || set.size === 0) return false
  if (set.has('*:admin')) return true
  if (set.has(`${resource}:admin`)) return true
  if (set.has(`${resource}:edit`) && action === 'view') return true
  if (set.has(`${resource}:update`) && (action === 'view' || action === 'edit')) return true
  return set.has(`${resource}:${action}`)
}

export async function loadPermissionSetForUser({ isCompanyAdmin, companyRoleId }) {
  if (isCompanyAdmin) return new Set(['*:admin'])
  if (!companyRoleId) return new Set()
  const rows = await CompanyRoleMenu.findAll({
    where: { companyRoleId },
    attributes: ['canView', 'canEdit', 'canUpdate', 'canDelete'],
    include: [{ model: MenuMaster, as: 'menu', attributes: ['resource', 'action'] }],
  })
  const mapped = []
  for (const r of rows) {
    const m = r.menu
    if (!m?.resource) continue
    if (r.canView) mapped.push({ resource: m.resource, action: 'view' })
    if (r.canEdit) mapped.push({ resource: m.resource, action: 'edit' })
    if (r.canUpdate) mapped.push({ resource: m.resource, action: 'update' })
    if (r.canDelete) mapped.push({ resource: m.resource, action: 'delete' })
  }
  return permissionSetFromRows(mapped)
}
