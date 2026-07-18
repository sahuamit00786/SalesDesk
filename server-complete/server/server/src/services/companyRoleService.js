import { CompanyRole } from '../models/index.js'
import {
  COMPANY_USER_ROLE_KIND_CREATE_VALUES,
  companyUserRoleKindLabel,
  roleNoForUserRoleKind,
} from '../constants/companyUserRoleKind.js'

/**
 * Ensures the company has one CompanyRole row per static role kind (Workspace admin, Manager,
 * Sales, Telecaller, Campaign manager, Marketing, Finance, HR, Auditor, Support). Roles are a
 * fixed catalog now — not user-created — so this seeds any missing kinds and never touches
 * existing rows (name edits, deletions, or the `custom`/legacy kind are left alone).
 * @param {import('sequelize').Model & { id: string }} company
 * @param {{ transaction?: import('sequelize').Transaction }} [opts]
 */
export async function ensureCompanyDefaultRoles(company, opts = {}) {
  const { transaction } = opts

  const existing = await CompanyRole.findAll({
    where: { companyId: company.id },
    attributes: ['userRoleKind'],
    transaction,
  })
  const existingKinds = new Set(existing.map((r) => r.userRoleKind))

  const missingKinds = COMPANY_USER_ROLE_KIND_CREATE_VALUES.filter((kind) => !existingKinds.has(kind))
  if (!missingKinds.length) return

  await CompanyRole.bulkCreate(
    missingKinds.map((kind) => ({
      companyId: company.id,
      name: companyUserRoleKindLabel(kind),
      userRoleKind: kind,
      roleNo: roleNoForUserRoleKind(kind),
      isDefault: true,
    })),
    { transaction },
  )
}
