import { sequelize } from '../config/db.js'
import { Company } from './Company.js'
import { User } from './User.js'
import { Workspace } from './Workspace.js'
import { Team } from './Team.js'
import { TeamMember } from './TeamMember.js'
import { Invitation } from './Invitation.js'
import { Lead } from './Lead.js'
import { Deal } from './Deal.js'
import { DealActivity } from './DealActivity.js'
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
import { OpportunityStage } from './OpportunityStage.js'
import { DealStatus } from './DealStatus.js'
import { Meeting } from './Meeting.js'
import { CallLog } from './CallLog.js'
import { ActionItem } from './ActionItem.js'
import { AiMeetingSummary } from './AiMeetingSummary.js'
import { MeetingParticipant } from './MeetingParticipant.js'
import { MeetingTranscript } from './MeetingTranscript.js'
import { MeetingRecording } from './MeetingRecording.js'
import { MeetingNotification } from './MeetingNotification.js'
import { Reminder } from './Reminder.js'
import { EmailTemplate } from './EmailTemplate.js'
import { LeadEmailLog } from './LeadEmailLog.js'
import { EmailSuppression } from './EmailSuppression.js'
import { WorkspaceBillingProfile } from './WorkspaceBillingProfile.js'
import { QuotationTemplate } from './QuotationTemplate.js'
import { Quotation } from './Quotation.js'
import { QuotationItem } from './QuotationItem.js'
import { InvoiceTemplate } from './InvoiceTemplate.js'
import { Invoice } from './Invoice.js'
import { InvoiceItem } from './InvoiceItem.js'
import { InvoicePayment } from './InvoicePayment.js'
import { Campaign } from './Campaign.js'
import { CampaignTeamMember } from './CampaignTeamMember.js'
import { CampaignLead } from './CampaignLead.js'
import { Workflow } from './Workflow.js'
import { WorkflowVersion } from './WorkflowVersion.js'
import { WorkflowRun } from './WorkflowRun.js'
import { WorkflowRunStep } from './WorkflowRunStep.js'

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
Company.hasMany(Lead, { foreignKey: 'companyId', as: 'leads' })
Workspace.hasMany(Lead, { foreignKey: 'workspaceId', as: 'leads' })
LeadSource.hasMany(Lead, { foreignKey: 'sourceId', as: 'leads' })
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
Lead.belongsToMany(User, { through: LeadAssignment, foreignKey: 'leadId', otherKey: 'userId', as: 'assignedUsers' })

Deal.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Workspace.hasMany(Deal, { foreignKey: 'workspaceId', as: 'deals' })
Deal.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })
Company.hasMany(Deal, { foreignKey: 'companyId', as: 'deals' })
Deal.belongsTo(Lead, { foreignKey: 'opportunityLeadId', as: 'opportunity' })
Lead.hasMany(Deal, { foreignKey: 'opportunityLeadId', as: 'pipelineDeals' })
Deal.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' })
Deal.belongsTo(User, { foreignKey: 'ownerUserId', as: 'owner' })
User.hasMany(Deal, { foreignKey: 'assignedTo', as: 'assignedDeals' })
User.hasMany(Deal, { foreignKey: 'ownerUserId', as: 'ownedDeals' })
Deal.hasMany(DealActivity, { foreignKey: 'dealId', as: 'dealActivities' })
DealActivity.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' })
DealActivity.belongsTo(User, { foreignKey: 'userId', as: 'user' })
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
Lead.hasMany(Meeting,{
foreignKey:'lead_id'
})

Meeting.belongsTo(Lead,{
foreignKey:'lead_id'
})

// Meeting.hasMany(MeetingParticipant,{
// foreignKey:'meeting_id'
// })

Meeting.hasMany(MeetingTranscript,{
foreignKey:'meeting_id'
})

Meeting.hasOne(MeetingRecording,{
foreignKey:'meeting_id'
})

Meeting.hasOne(AiMeetingSummary,{
foreignKey:'meeting_id'
})

Meeting.hasMany(ActionItem,{
foreignKey:'meeting_id'
})

Meeting.hasMany(MeetingParticipant, {
  foreignKey: "meetingId",
  as: "participants",
});

MeetingParticipant.belongsTo(Meeting, {
  foreignKey: "meetingId",
});

Reminder.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })
Company.hasMany(Reminder, { foreignKey: 'companyId', as: 'reminders' })

Reminder.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Workspace.hasMany(Reminder, { foreignKey: 'workspaceId', as: 'reminders' })

Reminder.belongsTo(User, { foreignKey: 'ownerUserId', as: 'owner' })
User.hasMany(Reminder, { foreignKey: 'ownerUserId', as: 'ownedReminders' })

Reminder.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })
User.hasMany(Reminder, { foreignKey: 'createdBy', as: 'createdReminders' })

EmailTemplate.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })
Company.hasMany(EmailTemplate, { foreignKey: 'companyId', as: 'emailTemplates' })
EmailTemplate.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Workspace.hasMany(EmailTemplate, { foreignKey: 'workspaceId', as: 'emailTemplates' })
EmailTemplate.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })
User.hasMany(EmailTemplate, { foreignKey: 'createdBy', as: 'createdEmailTemplates' })

LeadEmailLog.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })
Company.hasMany(LeadEmailLog, { foreignKey: 'companyId', as: 'emailLogs' })
LeadEmailLog.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Workspace.hasMany(LeadEmailLog, { foreignKey: 'workspaceId', as: 'emailLogs' })
LeadEmailLog.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' })
Lead.hasMany(LeadEmailLog, { foreignKey: 'leadId', as: 'emailLogs' })
LeadEmailLog.belongsTo(EmailTemplate, { foreignKey: 'templateId', as: 'template' })
EmailTemplate.hasMany(LeadEmailLog, { foreignKey: 'templateId', as: 'sendLogs' })

EmailSuppression.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })
Company.hasMany(EmailSuppression, { foreignKey: 'companyId', as: 'emailSuppressions' })
EmailSuppression.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Workspace.hasMany(EmailSuppression, { foreignKey: 'workspaceId', as: 'emailSuppressions' })
EmailSuppression.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' })
Lead.hasMany(EmailSuppression, { foreignKey: 'leadId', as: 'emailSuppressions' })

Lead.hasMany(CallLog,{
foreignKey:'lead_id'
})

WorkspaceBillingProfile.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Workspace.hasOne(WorkspaceBillingProfile, { foreignKey: 'workspaceId', as: 'billingProfile' })
WorkspaceBillingProfile.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })

QuotationTemplate.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Workspace.hasMany(QuotationTemplate, { foreignKey: 'workspaceId', as: 'quotationTemplates' })
QuotationTemplate.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })

Quotation.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Workspace.hasMany(Quotation, { foreignKey: 'workspaceId', as: 'quotations' })
Quotation.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })
Quotation.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' })
Lead.hasMany(Quotation, { foreignKey: 'leadId', as: 'quotations' })
Quotation.belongsTo(QuotationTemplate, { foreignKey: 'quotationTemplateId', as: 'template' })
Quotation.belongsTo(User, { foreignKey: 'ownerUserId', as: 'owner' })
Quotation.belongsTo(Invoice, { foreignKey: 'convertedInvoiceId', as: 'convertedInvoice' })
QuotationItem.belongsTo(Quotation, { foreignKey: 'quotationId', as: 'quotation' })
Quotation.hasMany(QuotationItem, { foreignKey: 'quotationId', as: 'items' })

InvoiceTemplate.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Workspace.hasMany(InvoiceTemplate, { foreignKey: 'workspaceId', as: 'invoiceTemplates' })
InvoiceTemplate.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })

Invoice.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Workspace.hasMany(Invoice, { foreignKey: 'workspaceId', as: 'invoices' })
Invoice.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })
Invoice.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' })
Lead.hasMany(Invoice, { foreignKey: 'leadId', as: 'invoices' })
Invoice.belongsTo(InvoiceTemplate, { foreignKey: 'invoiceTemplateId', as: 'template' })
Invoice.belongsTo(Quotation, { foreignKey: 'quotationId', as: 'quotation' })
Quotation.hasMany(Invoice, { foreignKey: 'quotationId', as: 'invoicesFromQuote' })
Invoice.belongsTo(User, { foreignKey: 'ownerUserId', as: 'owner' })
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' })
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoiceId', as: 'items' })
InvoicePayment.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' })
Invoice.hasMany(InvoicePayment, { foreignKey: 'invoiceId', as: 'payments' })
InvoicePayment.belongsTo(User, { foreignKey: 'recordedByUserId', as: 'recordedBy' })

Campaign.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Campaign.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })
Campaign.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })
Workspace.hasMany(Campaign, { foreignKey: 'workspaceId', as: 'campaigns' })
Company.hasMany(Campaign, { foreignKey: 'companyId', as: 'campaigns' })

CampaignTeamMember.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' })
CampaignTeamMember.belongsTo(User, { foreignKey: 'userId', as: 'user' })
Campaign.hasMany(CampaignTeamMember, { foreignKey: 'campaignId', as: 'teamMembers' })
User.hasMany(CampaignTeamMember, { foreignKey: 'userId', as: 'campaignTeamMemberships' })

CampaignLead.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' })
CampaignLead.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' })
CampaignLead.belongsTo(User, { foreignKey: 'assignedUserId', as: 'campaignAssignee' })
Campaign.hasMany(CampaignLead, { foreignKey: 'campaignId', as: 'campaignLeads' })
Lead.hasMany(CampaignLead, { foreignKey: 'leadId', as: 'campaignLeads' })

Workflow.belongsTo(Workspace, { foreignKey: 'workspaceId', as: 'workspace' })
Workflow.belongsTo(Company, { foreignKey: 'companyId', as: 'company' })
Workflow.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })
Workspace.hasMany(Workflow, { foreignKey: 'workspaceId', as: 'workflows' })
Company.hasMany(Workflow, { foreignKey: 'companyId', as: 'workflows' })

WorkflowVersion.belongsTo(Workflow, { foreignKey: 'workflowId', as: 'workflow' })
Workflow.hasMany(WorkflowVersion, { foreignKey: 'workflowId', as: 'versions' })

WorkflowRun.belongsTo(Workflow, { foreignKey: 'workflowId', as: 'workflow' })
Workflow.hasMany(WorkflowRun, { foreignKey: 'workflowId', as: 'runs' })

WorkflowRunStep.belongsTo(WorkflowRun, { foreignKey: 'runId', as: 'run' })
WorkflowRun.hasMany(WorkflowRunStep, { foreignKey: 'runId', as: 'steps' })

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
  Deal,
  DealActivity,
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
  OpportunityStage,
  DealStatus,
  Meeting,
  MeetingParticipant,
  MeetingNotification,
  Reminder,
  MeetingRecording,
  MeetingTranscript,
  AiMeetingSummary,
  CallLog,
  EmailTemplate,
  LeadEmailLog,
  EmailSuppression,
  WorkspaceBillingProfile,
  QuotationTemplate,
  Quotation,
  QuotationItem,
  InvoiceTemplate,
  Invoice,
  InvoiceItem,
  InvoicePayment,
  Campaign,
  CampaignTeamMember,
  CampaignLead,
  Workflow,
  WorkflowVersion,
  WorkflowRun,
  WorkflowRunStep,
}
