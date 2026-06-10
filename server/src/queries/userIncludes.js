import { Company, Workspace, CompanyRole, UserWorkspace, CompanyRoleMenu, MenuMaster } from '../models/index.js'

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

export const companyRoleInclude = {
  model: CompanyRole,
  as: 'companyRole',
  required: false,
  attributes: ['id', 'name', 'description', 'isDefault', 'userRoleKind', 'roleNo'],
  include: [
    {
      model: CompanyRoleMenu,
      as: 'menuLinks',
      required: false,
      attributes: ['menuId'],
      include: [
        {
          model: MenuMaster,
          as: 'menu',
          required: false,
          attributes: ['id', 'key', 'label', 'route', 'parentId'],
        },
      ],
    },
  ],
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
export const userAuthIncludes = [userCompanyWithWorkspacesInclude, companyRoleInclude, userWorkspaceMembershipInclude]
