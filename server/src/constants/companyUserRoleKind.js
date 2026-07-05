/** Classifies a company-defined role for reporting and invites (not the same as menu permissions). */
export const COMPANY_USER_ROLE_KIND = {
  WORKSPACE_ADMIN: 'workspace_admin',
  MANAGER: 'manager',
  SALES: 'sales',
  TELECALLER: 'telecaller',
  CAMPAIGN_MANAGER: 'campaign_manager',
  MARKETING: 'marketing',
  FINANCE: 'finance',
  HR: 'hr',
  AUDITOR: 'auditor',
  SUPPORT: 'support',
  /** Legacy / migrated rows before this field existed */
  CUSTOM: 'custom',
}

/** Values allowed when creating a new role from the product UI */
export const COMPANY_USER_ROLE_KIND_CREATE_VALUES = [
  COMPANY_USER_ROLE_KIND.WORKSPACE_ADMIN,
  COMPANY_USER_ROLE_KIND.MANAGER,
  COMPANY_USER_ROLE_KIND.SALES,
  COMPANY_USER_ROLE_KIND.TELECALLER,
  COMPANY_USER_ROLE_KIND.CAMPAIGN_MANAGER,
  COMPANY_USER_ROLE_KIND.MARKETING,
  COMPANY_USER_ROLE_KIND.FINANCE,
  COMPANY_USER_ROLE_KIND.HR,
  COMPANY_USER_ROLE_KIND.AUDITOR,
  COMPANY_USER_ROLE_KIND.SUPPORT,
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
    case COMPANY_USER_ROLE_KIND.TELECALLER:
      return 'Telecaller'
    case COMPANY_USER_ROLE_KIND.CAMPAIGN_MANAGER:
      return 'Campaign manager'
    case COMPANY_USER_ROLE_KIND.MARKETING:
      return 'Marketing'
    case COMPANY_USER_ROLE_KIND.FINANCE:
      return 'Finance'
    case COMPANY_USER_ROLE_KIND.HR:
      return 'HR'
    case COMPANY_USER_ROLE_KIND.AUDITOR:
      return 'Auditor'
    case COMPANY_USER_ROLE_KIND.SUPPORT:
      return 'Support'
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
