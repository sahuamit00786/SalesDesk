import { Company, Workspace, CompanyRole, UserWorkspace } from '../models/index.js'

/** Workspaces nested under company (ordered oldest first = primary). */
const workspacesUnderCompany = {
  model: Workspace,
  as: 'workspaces',
  required: false,
  separate: true,
  order: [['createdAt', 'ASC']],
}

/** User → company → workspaces (for auth payloads and PATCH /company/me). */
export const userCompanyWithWorkspacesInclude = {
  model: Company,
  as: 'company',
  required: false,
  include: [workspacesUnderCompany],
}

/** Role is now just a label/tier (userRoleKind) — no menu permissions attached. */
export const companyRoleInclude = {
  model: CompanyRole,
  as: 'companyRole',
  required: false,
  attributes: ['id', 'name', 'description', 'isDefault', 'userRoleKind', 'roleNo'],
}

export const userWorkspaceMembershipInclude = {
  model: UserWorkspace,
  as: 'workspaceMemberships',
  required: false,
  attributes: ['workspaceId'],
  include: [
    {
      model: Workspace,
      as: 'workspace',
      required: false,
      attributes: ['id', 'name', 'description', 'archivedAt', 'themeColor', 'sidebarTextColor'],
    },
  ],
}

/** Standard includes for session user payloads (company + workspaces + role). */
export const userAuthIncludes = [
  userCompanyWithWorkspacesInclude,
  companyRoleInclude,
  userWorkspaceMembershipInclude,
]
