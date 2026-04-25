import { sequelize } from '../config/db.js'
import { Company } from './Company.js'
import { User } from './User.js'
import { Workspace } from './Workspace.js'
import { Team } from './Team.js'
import { TeamMember } from './TeamMember.js'
import { Invitation } from './Invitation.js'
import { Lead } from './Lead.js'
import { UserWorkspace } from './UserWorkspace.js'
import { MenuMaster } from './MenuMaster.js'
import { CompanyRole } from './CompanyRole.js'
import { CompanyRoleMenu } from './CompanyRoleMenu.js'

User.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })
Company.hasMany(User, { foreignKey: 'companyId', as: 'users' })

CompanyRole.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })
Company.hasMany(CompanyRole, { foreignKey: 'companyId', as: 'roles' })
User.belongsTo(CompanyRole, { foreignKey: 'companyRoleId', as: 'companyRole' })
CompanyRole.hasMany(User, { foreignKey: 'companyRoleId', as: 'users' })
CompanyRole.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })

MenuMaster.belongsTo(MenuMaster, { foreignKey: 'parentId', as: 'parent' })
MenuMaster.hasMany(MenuMaster, { foreignKey: 'parentId', as: 'children' })
CompanyRoleMenu.belongsTo(CompanyRole, { foreignKey: 'companyRoleId', as: 'companyRole' })
CompanyRole.hasMany(CompanyRoleMenu, { foreignKey: 'companyRoleId', as: 'menuLinks' })
CompanyRoleMenu.belongsTo(MenuMaster, { foreignKey: 'menuId', as: 'menu' })
MenuMaster.hasMany(CompanyRoleMenu, { foreignKey: 'menuId', as: 'roleLinks' })

Workspace.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })
Company.hasMany(Workspace, { foreignKey: 'companyId', as: 'workspaces' })
UserWorkspace.belongsTo(User, { foreignKey: 'userId', as: 'user' })
UserWorkspace.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
User.hasMany(UserWorkspace, { foreignKey: 'userId', as: 'workspaceMemberships' })
Workspace.hasMany(UserWorkspace, { foreignKey: 'workspaceId', as: 'userMemberships' })

Team.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })
Company.hasMany(Team, { foreignKey: 'companyId', as: 'teams' })

TeamMember.belongsTo(Team, { foreignKey: 'teamId', as: 'team' })
TeamMember.belongsTo(User, { foreignKey: 'userId', as: 'user' })
Team.hasMany(TeamMember, { foreignKey: 'teamId', as: 'members' })
User.hasMany(TeamMember, { foreignKey: 'userId', as: 'teamMemberships' })

Invitation.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })
Invitation.belongsTo(User, { foreignKey: 'invitedBy', as: 'inviter' })
Invitation.belongsTo(CompanyRole, { foreignKey: 'companyRoleId', as: 'companyRole' })

Lead.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })
Lead.belongsTo(User, { foreignKey: 'ownerUserId', as: 'owner' })
Company.hasMany(Lead, { foreignKey: 'companyId', as: 'leads' })

export {
  sequelize,
  User,
  Company,
  Workspace,
  MenuMaster,
  CompanyRole,
  CompanyRoleMenu,
  Team,
  TeamMember,
  UserWorkspace,
  Invitation,
  Lead,
}
