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
  CUSTOM: 'custom',
}

export const COMPANY_USER_ROLE_KIND_CREATE_OPTIONS = [
  { value: COMPANY_USER_ROLE_KIND.WORKSPACE_ADMIN, label: 'Workspace admin' },
  { value: COMPANY_USER_ROLE_KIND.MANAGER, label: 'Manager' },
  { value: COMPANY_USER_ROLE_KIND.SALES, label: 'Sales' },
  { value: COMPANY_USER_ROLE_KIND.TELECALLER, label: 'Telecaller' },
  { value: COMPANY_USER_ROLE_KIND.CAMPAIGN_MANAGER, label: 'Campaign manager' },
  { value: COMPANY_USER_ROLE_KIND.MARKETING, label: 'Marketing' },
  { value: COMPANY_USER_ROLE_KIND.FINANCE, label: 'Finance' },
  { value: COMPANY_USER_ROLE_KIND.HR, label: 'HR' },
  { value: COMPANY_USER_ROLE_KIND.AUDITOR, label: 'Auditor' },
  { value: COMPANY_USER_ROLE_KIND.SUPPORT, label: 'Support' },
]

/** Create flow uses the kinds above; edit can also set Custom (e.g. legacy roles). */
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
