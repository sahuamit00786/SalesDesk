import { useSelector } from 'react-redux'

/**
 * ONE place on the client that answers "how powerful is the current user?" —
 * mirrors server/src/services/roleHierarchy.js exactly. Replaces the
 * copy-pasted `isCompanyAdmin || userRoleKind === 'workspace_admin' || …`
 * blocks that had drifted across pages.
 *
 * Rank ladder (lower = more powerful):
 *   0 company_admin · 1 workspace_admin · 2 manager · 3 others
 *
 * These hooks drive UI ONLY (which filters/buttons render). The server
 * re-checks everything; hiding a control is never the security boundary.
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

export function rankOfUser(user) {
  if (user?.isCompanyAdmin) return ROLE_RANK.COMPANY_ADMIN
  return rankOfRoleKind(user?.companyRole?.userRoleKind)
}

/** Current user's rank (0–3). */
export function useRoleRank() {
  const user = useSelector((s) => s.auth.user)
  return rankOfUser(user)
}

/**
 * True for company_admin / workspace_admin / manager — the ranks that see
 * ALL leads in their scope and therefore get user/assignee filters,
 * workspace switchers, and team-comparative analytics.
 */
export function useIsElevated() {
  return useRoleRank() <= ROLE_RANK.MANAGER
}

/** True when the current user may manage (create/assign/edit) the given role kind. */
export function useCanManageRoleKind() {
  const myRank = useRoleRank()
  return (kind) => myRank < rankOfRoleKind(kind)
}
