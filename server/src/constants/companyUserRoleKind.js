/** Classifies a company-defined role for reporting and invites (not the same as menu permissions). */
export const COMPANY_USER_ROLE_KIND = {
  WORKSPACE_ADMIN: 'workspace_admin',
  MANAGER: 'manager',
  SALES: 'sales',
  /** Legacy / migrated rows before this field existed */
  CUSTOM: 'custom',
}

/** Values allowed when creating a new role from the product UI */
export const COMPANY_USER_ROLE_KIND_CREATE_VALUES = [
  COMPANY_USER_ROLE_KIND.WORKSPACE_ADMIN,
  COMPANY_USER_ROLE_KIND.MANAGER,
  COMPANY_USER_ROLE_KIND.SALES,
]

export const ALL_COMPANY_USER_ROLE_KIND_VALUES = [
  ...COMPANY_USER_ROLE_KIND_CREATE_VALUES,
  COMPANY_USER_ROLE_KIND.CUSTOM,
]

export const companyUserRoleKindLabel = (kind) => {
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

/** Persisted on `company_roles.role_no`; null for `custom` or unknown. */
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
