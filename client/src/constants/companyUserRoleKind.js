export const COMPANY_USER_ROLE_KIND = {
  WORKSPACE_ADMIN: 'workspace_admin',
  MANAGER: 'manager',
  SALES: 'sales',
  CUSTOM: 'custom',
}

export const COMPANY_USER_ROLE_KIND_CREATE_OPTIONS = [
  { value: COMPANY_USER_ROLE_KIND.WORKSPACE_ADMIN, label: 'Workspace admin' },
  { value: COMPANY_USER_ROLE_KIND.MANAGER, label: 'Manager' },
  { value: COMPANY_USER_ROLE_KIND.SALES, label: 'Sales' },
]

/** Create flow uses the three kinds above; edit can also set Custom (e.g. legacy roles). */
export const COMPANY_USER_ROLE_KIND_ALL_OPTIONS = [
  ...COMPANY_USER_ROLE_KIND_CREATE_OPTIONS,
  { value: COMPANY_USER_ROLE_KIND.CUSTOM, label: 'Custom (legacy)' },
]

export function labelCompanyUserRoleKind(kind) {
  switch (kind) {
    case COMPANY_USER_ROLE_KIND.WORKSPACE_ADMIN:
      return 'Workspace admin'
    case COMPANY_USER_ROLE_KIND.MANAGER:
      return 'Manager'
    case COMPANY_USER_ROLE_KIND.SALES:
      return 'Sales'
    case COMPANY_USER_ROLE_KIND.CUSTOM:
      return 'Custom'
    default:
      return 'Custom'
  }
}

/** Matches server: 1 workspace admin, 2 manager, 3 sales; null for custom */
export function roleNoForUserRoleKind(kind) {
  switch (kind) {
    case COMPANY_USER_ROLE_KIND.WORKSPACE_ADMIN:
      return 1
    case COMPANY_USER_ROLE_KIND.MANAGER:
      return 2
    case COMPANY_USER_ROLE_KIND.SALES:
      return 3
    default:
      return null
  }
}
