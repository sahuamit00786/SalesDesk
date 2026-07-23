import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { RequireOnboarded } from '@/components/auth/RequireOnboarded'
import { RequireWorkspace } from '@/components/auth/RequireWorkspace'
import { SessionSync } from '@/components/auth/SessionSync'
import { LoginPage } from '@/pages/LoginPage'
import { SelectWorkspacePage } from '@/pages/SelectWorkspacePage'
import { WorkspacePage } from '@/pages/WorkspacePage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { TeamPage } from '@/pages/TeamPage'
import { TeamMemberProfilePage } from '@/features/team/pages/TeamMemberProfilePage'
import { TeamMemberPermissionsPage } from '@/features/team/pages/TeamMemberPermissionsPage'
import { IntegrationsPage } from '@/pages/IntegrationsPage'
import { AcceptInvitePage } from '@/pages/AcceptInvitePage'
import { LeadsPage } from '@/pages/LeadsPage'
import { LeadConfigurationPage } from '@/pages/LeadConfigurationPage'
import { LeadDistributionPage } from '@/pages/LeadDistributionPage'
import { LeadDetailPage } from '@/features/leads/pages/LeadDetailPage'
import { DocumentsPage } from '@/pages/DocumentsPage'
import { ActivitiesPage } from '@/pages/ActivitiesPage'
import { TasksPage } from '@/pages/TasksPage'
import { FollowupsPage } from '@/pages/FollowupsPage'
import { EmailPage } from '@/pages/EmailPage'
import { CopilotPage } from '@/pages/CopilotPage'
import { OpportunitiesPage } from '@/pages/OpportunitiesPage'
import { PipelinePage } from '@/pages/PipelinePage'
import { DealsPage } from '@/pages/DealsPage'
import { DealDetailPage } from '@/pages/DealDetailPage'
import { WebFormsListPage } from '@/features/webforms/pages/WebFormsListPage'
import { FormBuilderPage } from '@/features/webforms/pages/FormBuilderPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { MeetingsPage } from '@/features/meetings/pages/MeetingsPage'
import { CallsPage } from '@/pages/CallsPage'
import CalendarPage from '@/pages/CalendarPage'
import TemplatesPage from '@/pages/TemplatesPage'
import { QuotationsPage } from '@/pages/QuotationsPage'
import { InvoicesPage } from '@/pages/InvoicesPage'
import { SalesDocTemplatesPage } from '@/pages/SalesDocTemplatesPage'
import { DocumentSettingsPage } from '@/pages/DocumentSettingsPage'
import { NewInvoicePage } from '@/pages/NewInvoicePage'
import { NewQuotationPage } from '@/pages/NewQuotationPage'
import QuotationPrintPage from '@/pages/QuotationPrintPage'
import InvoicePrintPage from '@/pages/InvoicePrintPage'
import { CampaignsListPage } from '@/pages/CampaignsListPage'
import { CampaignNewPage } from '@/pages/CampaignNewPage'
import { CampaignDetailPage } from '@/pages/CampaignDetailPage'
import { CampaignReportPage } from '@/pages/CampaignReportPage'
import { WorkflowsListPage } from '@/pages/WorkflowsListPage'
import { WorkflowNewPage } from '@/pages/WorkflowNewPage'
import { WorkflowEditorPage } from '@/pages/WorkflowEditorPage'
import { LeadFlowLandingPage } from '@/pages/LeadFlowLandingPage'
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage'
import { TermsOfServicePage } from '@/pages/TermsOfServicePage'
import { AboutPage } from '@/pages/AboutPage'
import { ContactPage } from '@/pages/ContactPage'
// HR modules disabled
// import { AttendancePage } from '@/pages/AttendancePage'
// import { LeavePage } from '@/pages/LeavePage'
// import { LeaveRequestsPage } from '@/pages/LeaveRequestsPage'
// import { LeaveApprovalPage } from '@/pages/LeaveApprovalPage'
// import { LeaveConfigPage } from '@/pages/LeaveConfigPage'
// import { HRDashboardPage } from '@/pages/HRDashboardPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { ReportDetailPage } from '@/pages/ReportDetailPage'
import { DealPaymentsPage } from '@/pages/DealPaymentsPage'
import { KnowledgeBasePage } from '@/features/knowledge/pages/KnowledgeBasePage'
import { SystemWorkflowPage } from '@/pages/SystemWorkflowPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LeadFlowLandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/systemworkflow" element={<SystemWorkflowPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<SessionSync />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        {/* Outside RequireOnboarded: that guard bounces non-admins off any path
            missing from allowedMenus, and the picker is not a menu. */}
        <Route path="/select-workspace" element={<SelectWorkspacePage />} />
        <Route element={<RequireOnboarded />}>
          <Route element={<RequireWorkspace />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/lead-distribution" element={<LeadDistributionPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/deals" element={<DealsPage />} />
            <Route path="/deals/:id" element={<DealDetailPage />} />
            <Route path="/deal-payments" element={<DealPaymentsPage />} />
            <Route path="/opportunities" element={<OpportunitiesPage />} />
            <Route path="/opportunities/:id" element={<LeadDetailPage />} />
            <Route path="/meetings" element={<MeetingsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/campaigns" element={<CampaignsListPage />} />
            <Route path="/campaigns/new" element={<CampaignNewPage />} />
            <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
            <Route path="/campaigns/:id/report" element={<CampaignReportPage />} />
            <Route path="/automation" element={<WorkflowsListPage />} />
            <Route path="/automation/new" element={<WorkflowNewPage />} />
            <Route path="/automation/:id" element={<WorkflowEditorPage />} />
            <Route path="/leads/:id" element={<LeadDetailPage />} />
            <Route path="/activities" element={<ActivitiesPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/followups" element={<FollowupsPage />} />
            <Route path="/email" element={<EmailPage />} />
            <Route path="/copilot" element={<CopilotPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/quotations" element={<QuotationsPage />} />
            <Route path="/quotations/new" element={<NewQuotationPage />} />
            <Route path="/quotations/templates" element={<Navigate to="/sales-docs/templates?tab=quotation" replace />} />
            <Route path="/quotations/:id/print" element={<QuotationPrintPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/new" element={<NewInvoicePage />} />
            <Route path="/invoices/templates" element={<Navigate to="/sales-docs/templates?tab=invoice" replace />} />
            <Route path="/invoices/:id/print" element={<InvoicePrintPage />} />
            <Route path="/sales-docs/templates" element={<SalesDocTemplatesPage />} />
            <Route path="/document-settings" element={<DocumentSettingsPage />} />
            <Route path="/lead-configuration" element={<LeadConfigurationPage />} />
            {/* HR modules disabled */}
            {/* <Route path="/hr" element={<HRDashboardPage />} /> */}
            {/* <Route path="/hr/reports" element={<Navigate to="/reports/leave" replace />} /> */}
            {/* <Route path="/attendance" element={<AttendancePage />} /> */}
            {/* <Route path="/leave" element={<LeavePage />} /> */}
            {/* <Route path="/leave/requests" element={<LeaveRequestsPage />} /> */}
            {/* <Route path="/leave/approval" element={<LeaveApprovalPage />} /> */}
            {/* <Route path="/leave/config" element={<LeaveConfigPage />} /> */}
            <Route path="/team" element={<TeamPage />} />
            <Route path="/my-profile" element={<TeamMemberProfilePage />} />
            <Route path="/team/:userId" element={<TeamMemberProfilePage />} />
            <Route path="/team/:userId/permissions" element={<TeamMemberPermissionsPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/forms" element={<WebFormsListPage />} />
            <Route path="/forms/:id/builder" element={<FormBuilderPage />} />
            <Route path="/reports" element={<AnalyticsPage />} />
            <Route path="/reports/:type" element={<ReportDetailPage />} />
            <Route path="/analytics" element={<Navigate to="/reports" replace />} />
            <Route path="/email-tracking" element={<Navigate to="/reports/email" replace />} />
            <Route path="/settings" element={<Navigate to="/workspace" replace />} />
            <Route path="/contacts" element={<Navigate to="/leads" replace />} />
            <Route path="/companies" element={<Navigate to="/leads" replace />} />
            <Route path="/whatsapp" element={<Navigate to="/email" replace />} />
            <Route path="/calls" element={<CallsPage />} />
          </Route>
        </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
