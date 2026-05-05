import { sequelize } from '../config/db.js'
import { Company } from './Company.js'
import { User } from './User.js'
import { Workspace } from './Workspace.js'
import { Team } from './Team.js'
import { TeamMember } from './TeamMember.js'
import { Invitation } from './Invitation.js'
import { Lead } from './Lead.js'
import { Activity } from './Activity.js'
import { Tag } from './Tag.js'
import { LeadTag } from './LeadTag.js'
import { SavedView } from './SavedView.js'
import { AssignmentRule } from './AssignmentRule.js'
import { CustomField } from './CustomField.js'
import { CustomFieldValue } from './CustomFieldValue.js'
import { LeadFile } from './LeadFile.js'
import { LeadTask } from './LeadTask.js'
import { LeadTaskSubtask } from './LeadTaskSubtask.js'
import { LeadTaskComment } from './LeadTaskComment.js'
import { LeadFollowup } from './LeadFollowup.js'
import { LeadSource } from './LeadSource.js'
import { LeadStage } from './LeadStage.js'
import { LeadStatusCategory } from './LeadStatusCategory.js'
import { LeadStatus } from './LeadStatus.js'
import { LeadAssignment } from './LeadAssignment.js'
import { LeadEmail } from './LeadEmail.js'
import { CompanyGoogleToken } from './CompanyGoogleToken.js'
import { ActivityType } from './ActivityType.js'
import { ActivityReminder } from './ActivityReminder.js'
import { ActivityBookingLink } from './ActivityBookingLink.js'
import { CountryPhoneCode } from './CountryPhoneCode.js'
import { UserWorkspace } from './UserWorkspace.js'
import { MenuMaster } from './MenuMaster.js'
import { CompanyRole } from './CompanyRole.js'
import { CompanyRoleMenu } from './CompanyRoleMenu.js'
import { Document } from './Document.js'
import { DocumentLink } from './DocumentLink.js'
import { Folder } from './Folder.js'
import { DocumentShare } from './DocumentShare.js'
import { DocumentFolderLink } from './DocumentFolderLink.js'
import { WebForm } from './WebForm.js'
import { WebFormField } from './WebFormField.js'
import { WebFormSubmission } from './WebFormSubmission.js'
import { WebFormEmailTemplate } from './WebFormEmailTemplate.js'
import { Opportunity } from './Opportunity.js'
import { OpportunityStage } from './OpportunityStage.js'

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

Lead.belongsTo(Company, { foreignKey: 'companyId', as: 'companyRef' })
Lead.belongsTo(User, { foreignKey: 'ownerUserId', as: 'owner' })
Lead.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' })
Lead.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Lead.belongsTo(LeadSource, { foreignKey: 'sourceId', as: 'leadSource' })
Lead.belongsTo(LeadStage, { foreignKey: 'leadStageId', as: 'leadStage' })
Lead.belongsTo(LeadStatus, { foreignKey: 'leadStatusId', as: 'leadStatusLookup' })
Company.hasMany(Lead, { foreignKey: 'companyId', as: 'leads' })
Workspace.hasMany(Lead, { foreignKey: 'workspaceId', as: 'leads' })
LeadSource.hasMany(Lead, { foreignKey: 'sourceId', as: 'leads' })
LeadStage.hasMany(Lead, { foreignKey: 'leadStageId', as: 'leads' })
LeadStatus.hasMany(Lead, { foreignKey: 'leadStatusId', as: 'leads' })
Lead.hasMany(Activity, { foreignKey: 'leadId', as: 'activities' })
Activity.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' })
Activity.belongsTo(User, { foreignKey: 'userId', as: 'user' })
Activity.hasMany(ActivityReminder, { foreignKey: 'activityId', as: 'reminders' })
ActivityReminder.belongsTo(Activity, { foreignKey: 'activityId', as: 'activity' })
ActivityReminder.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })
User.hasMany(ActivityReminder, { foreignKey: 'createdBy', as: 'activityReminders' })
ActivityType.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })
Company.hasMany(ActivityType, { foreignKey: 'companyId', as: 'activityTypes' })
ActivityBookingLink.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })
Company.hasMany(ActivityBookingLink, { foreignKey: 'companyId', as: 'activityBookingLinks' })
ActivityBookingLink.belongsTo(User, { foreignKey: 'userId', as: 'user' })
User.hasMany(ActivityBookingLink, { foreignKey: 'userId', as: 'activityBookingLinks' })
Lead.belongsToMany(Tag, { through: LeadTag, foreignKey: 'leadId', otherKey: 'tagId', as: 'tags' })
Tag.belongsToMany(Lead, { through: LeadTag, foreignKey: 'tagId', otherKey: 'leadId', as: 'leads' })
SavedView.belongsTo(User, { foreignKey: 'userId', as: 'user' })
SavedView.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Workspace.hasMany(SavedView, { foreignKey: 'workspaceId', as: 'savedViews' })
CustomField.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Workspace.hasMany(CustomField, { foreignKey: 'workspaceId', as: 'customFields' })
CustomField.hasMany(CustomFieldValue, { foreignKey: 'customFieldId', as: 'values' })
CustomFieldValue.belongsTo(CustomField, { foreignKey: 'customFieldId', as: 'customField' })
Lead.hasMany(CustomFieldValue, { foreignKey: 'leadId', as: 'customFieldValues' })
CustomFieldValue.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' })
Lead.hasMany(LeadFile, { foreignKey: 'leadId', as: 'files' })
LeadFile.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' })
Lead.hasMany(LeadTask, { foreignKey: 'leadId', as: 'tasks' })
LeadTask.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' })
Lead.hasMany(LeadEmail, { foreignKey: 'leadId', as: 'emails' })
LeadEmail.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' })
LeadEmail.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })
User.hasMany(LeadEmail, { foreignKey: 'createdBy', as: 'leadEmails' })
CompanyGoogleToken.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })
CompanyGoogleToken.belongsTo(User, { foreignKey: 'userId', as: 'user' })
Company.hasMany(CompanyGoogleToken, { foreignKey: 'companyId', as: 'googleTokens' })
User.hasMany(CompanyGoogleToken, { foreignKey: 'userId', as: 'googleTokens' })
LeadTask.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })
LeadTask.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' })
User.hasMany(LeadTask, { foreignKey: 'createdBy', as: 'createdLeadTasks' })
User.hasMany(LeadTask, { foreignKey: 'assignedTo', as: 'assignedLeadTasks' })
LeadTask.hasMany(LeadTaskSubtask, { foreignKey: 'leadTaskId', as: 'subtasks' })
LeadTaskSubtask.belongsTo(LeadTask, { foreignKey: 'leadTaskId', as: 'task' })
LeadTask.hasMany(LeadTaskComment, { foreignKey: 'leadTaskId', as: 'comments' })
LeadTaskComment.belongsTo(LeadTask, { foreignKey: 'leadTaskId', as: 'task' })
LeadTaskComment.belongsTo(User, { foreignKey: 'userId', as: 'author' })
User.hasMany(LeadTaskComment, { foreignKey: 'userId', as: 'leadTaskComments' })
Lead.hasMany(LeadFollowup, { foreignKey: 'leadId', as: 'followups' })
LeadFollowup.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' })
LeadFollowup.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })
User.hasMany(LeadFollowup, { foreignKey: 'createdBy', as: 'createdLeadFollowups' })
AssignmentRule.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Workspace.hasMany(AssignmentRule, { foreignKey: 'workspaceId', as: 'assignmentRules' })
LeadStatus.belongsTo(LeadStatusCategory, { foreignKey: 'categoryId', as: 'category' })
LeadStatusCategory.hasMany(LeadStatus, { foreignKey: 'categoryId', as: 'statuses' })
Lead.belongsToMany(User, { through: LeadAssignment, foreignKey: 'leadId', otherKey: 'userId', as: 'assignedUsers' })
User.belongsToMany(Lead, { through: LeadAssignment, foreignKey: 'userId', otherKey: 'leadId', as: 'assignedLeads' })
Document.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' })
User.hasMany(Document, { foreignKey: 'uploadedBy', as: 'uploadedDocuments' })
Document.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Workspace.hasMany(Document, { foreignKey: 'workspaceId', as: 'documents' })
Document.belongsTo(Folder, { foreignKey: 'folderId', as: 'folder' })
Folder.hasMany(Document, { foreignKey: 'folderId', as: 'documents' })
Folder.belongsTo(Folder, { foreignKey: 'parentFolderId', as: 'parentFolder' })
Folder.hasMany(Folder, { foreignKey: 'parentFolderId', as: 'children' })
Folder.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })
User.hasMany(Folder, { foreignKey: 'createdBy', as: 'createdFolders' })
Folder.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Workspace.hasMany(Folder, { foreignKey: 'workspaceId', as: 'folders' })
Document.hasMany(DocumentLink, { foreignKey: 'documentId', as: 'links' })
DocumentLink.belongsTo(Document, { foreignKey: 'documentId', as: 'document' })
Document.hasMany(DocumentShare, { foreignKey: 'documentId', as: 'shares' })
DocumentShare.belongsTo(Document, { foreignKey: 'documentId', as: 'document' })
Document.belongsToMany(Folder, { through: DocumentFolderLink, foreignKey: 'documentId', otherKey: 'folderId', as: 'linkedFolders' })
Folder.belongsToMany(Document, { through: DocumentFolderLink, foreignKey: 'folderId', otherKey: 'documentId', as: 'linkedDocuments' })
DocumentFolderLink.belongsTo(Document, { foreignKey: 'documentId', as: 'document' })
DocumentFolderLink.belongsTo(Folder, { foreignKey: 'folderId', as: 'folder' })
Document.hasMany(DocumentFolderLink, { foreignKey: 'documentId', as: 'folderLinks' })
Folder.hasMany(DocumentFolderLink, { foreignKey: 'folderId', as: 'documentLinks' })
WebForm.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Workspace.hasMany(WebForm, { foreignKey: 'workspaceId', as: 'webForms' })
WebForm.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })
User.hasMany(WebForm, { foreignKey: 'createdBy', as: 'createdWebForms' })
WebForm.hasMany(WebFormField, { foreignKey: 'formId', as: 'fields' })
WebFormField.belongsTo(WebForm, { foreignKey: 'formId', as: 'form' })
WebForm.hasMany(WebFormSubmission, { foreignKey: 'formId', as: 'submissions' })
WebFormSubmission.belongsTo(WebForm, { foreignKey: 'formId', as: 'form' })
WebFormSubmission.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' })
Lead.hasMany(WebFormSubmission, { foreignKey: 'leadId', as: 'webFormSubmissions' })
WebFormEmailTemplate.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Workspace.hasMany(WebFormEmailTemplate, { foreignKey: 'workspaceId', as: 'webFormEmailTemplates' })
WebFormEmailTemplate.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })
User.hasMany(WebFormEmailTemplate, { foreignKey: 'createdBy', as: 'createdWebFormEmailTemplates' })
Opportunity.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })
Company.hasMany(Opportunity, { foreignKey: 'companyId', as: 'opportunities' })
Opportunity.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Workspace.hasMany(Opportunity, { foreignKey: 'workspaceId', as: 'opportunities' })
Opportunity.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' })
Lead.hasMany(Opportunity, { foreignKey: 'leadId', as: 'opportunities' })
Opportunity.belongsTo(User, { foreignKey: 'ownerUserId', as: 'owner' })
User.hasMany(Opportunity, { foreignKey: 'ownerUserId', as: 'ownedOpportunities' })
Opportunity.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })
Opportunity.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' })

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
  Activity,
  Tag,
  LeadTag,
  SavedView,
  AssignmentRule,
  CustomField,
  CustomFieldValue,
  LeadFile,
  LeadTask,
  LeadTaskSubtask,
  LeadTaskComment,
  LeadFollowup,
  LeadSource,
  LeadStage,
  LeadStatusCategory,
  LeadStatus,
  LeadAssignment,
  LeadEmail,
  CompanyGoogleToken,
  ActivityType,
  ActivityReminder,
  ActivityBookingLink,
  CountryPhoneCode,
  Document,
  DocumentLink,
  Folder,
  DocumentShare,
  DocumentFolderLink,
  WebForm,
  WebFormField,
  WebFormSubmission,
  WebFormEmailTemplate,
  Opportunity,
  OpportunityStage,
}
