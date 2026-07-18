import { CompanyRole } from '../models/index.js'

/**
 * ONE place that answers "who outranks whom?" for role/user management.
 *
 * Rank ladder (lower number = more powerful):
 *   0  company_admin    (users.is_company_admin = true; role row irrelevant)
 *   1  workspace_admin  (company_roles.user_role_kind = 'workspace_admin')
 *   2  manager          (user_role_kind = 'manager')
 *   3  others           (sales / telecaller / marketing / finance / hr /
 *                        auditor / support / custom / no role)
 *
 * The strict rule enforced everywhere:
 *   An actor may only create/assign/edit/deactivate roles and users of
 *   STRICTLY LOWER rank than their own. Equal rank is forbidden — a
 *   workspace_admin cannot create another workspace_admin, a manager
 *   cannot create a manager.
 *
 * Data visibility is NOT decided here — that stays in leadVisibility.js /
 * recordVisibility.js. This module only guards management writes.
 */

export const ROLE_RANK = {
  COMPANY_ADMIN: 0,
  WORKSPACE_ADMIN: 1,
  MANAGER: 2,
  OTHERS: 3,
}

export function rankOfRoleKind(kind) {
  if (kind === 'workspace_admin') return ROLE_RANK.WORKSPACE_ADMIN
  if (kind === 'manager') return ROLE_RANK.MANAGER
  return ROLE_RANK.OTHERS
}

/** Rank of the acting user. Relies on req.user.userRoleKind being fresh (loadPermissions refreshes it from DB). */
export function rankOfUser(user) {
  if (user?.isCompanyAdmin) return ROLE_RANK.COMPANY_ADMIN
  return rankOfRoleKind(user?.userRoleKind)
}

function forbidden(publicMessage) {
  const err = new Error('Forbidden')
  err.status = 403
  err.code = 'ROLE_HIERARCHY'
  err.publicMessage = publicMessage
  return err
}

/**
 * Throws 403 unless the actor STRICTLY outranks the given role kind.
 * Use before creating a role, assigning a role, or inviting into a role.
 */
export function assertCanManageRoleKind(actorUser, targetKind) {
  if (rankOfUser(actorUser) >= rankOfRoleKind(targetKind)) {
    throw forbidden('You cannot create or assign a role at or above your own level')
  }
}

/**
 * Throws 403 unless the actor STRICTLY outranks the target user.
 * Accepts a Sequelize User row; loads the target's role kind if not included.
 * Use before editing another user's role, permissions, workspaces, or
 * activation status.
 */
export async function assertCanManageUser(actorUser, targetUser) {
  let targetRank
  if (targetUser.isCompanyAdmin) {
    targetRank = ROLE_RANK.COMPANY_ADMIN
  } else if (targetUser.companyRoleId) {
    const role =
      targetUser.companyRole && targetUser.companyRole.userRoleKind !== undefined
        ? targetUser.companyRole
        : await CompanyRole.findByPk(targetUser.companyRoleId, { attributes: ['userRoleKind'] })
    targetRank = rankOfRoleKind(role?.userRoleKind || 'custom')
  } else {
    targetRank = ROLE_RANK.OTHERS
  }

  if (rankOfUser(actorUser) >= targetRank) {
    throw forbidden('You cannot manage a user at or above your own level')
  }
}

/**
 * Role kinds this actor is allowed to create/assign — for filtering role
 * dropdowns in the UI (returned as meta.creatableKinds by listRoles).
 */
export function creatableRoleKinds(actorUser, allKinds) {
  const myRank = rankOfUser(actorUser)
  return (allKinds || []).filter((k) => rankOfRoleKind(k) > myRank)
}

/** True when this user may see team-management UI at all (rank 0–2). */
export function canManageAnyRoles(user) {
  return rankOfUser(user) < ROLE_RANK.OTHERS
}
