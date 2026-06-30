import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { RequireOnboarded } from '@/components/auth/RequireOnboarded'
import { SessionSync } from '@/components/auth/SessionSync'
import { LoginPage } from '@/pages/LoginPage'
import { WorkspacePage } from '@/pages/WorkspacePage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { TeamPage } from '@/pages/TeamPage'
import { TeamMemberProfilePage } from '@/features/team/pages/TeamMemberProfilePage'
import { IntegrationsPage } from '@/pages/IntegrationsPage'
import { AcceptInvitePage } from '@/pages/AcceptInvitePage'
import { LeadsPage } from '@/pages/LeadsPage'
import { LeadConfigurationPage } from '@/pages/LeadConfigurationPage'
import { LeadDistributionPage } from '@/pages/LeadDistributionPage'
import { LeadDetailPage } from '@/features/leads/pages/LeadDetailPage'
import { DocumentsPage } from '@/pages/DocumentsPage'
import { ActivitiesPage } from '@/pages/ActivitiesPage'
import { TasksPage } from '@/pages/TasksPage'
import { EmailPage } from '@/pages/EmailPage'
import { OpportunitiesPage } from '@/pages/OpportunitiesPage'
import { PipelinePage } from '@/pages/PipelinePage'
import { DealsPage } from '@/pages/DealsPage'
import { DealDetailPage } from '@/pages/DealDetailPage'
import { WebFormsListPage } from '@/features/webforms/pages/WebFormsListPage'
import { FormBuilderPage } from '@/features/webforms/pages/FormBuilderPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { MeetingsPage } from '@/features/meetings/pages/MeetingsPage'
import CalendarPage from '@/pages/CalendarPage'
import TemplatesPage from '@/pages/TemplatesPage'
import { QuotationsPage } from '@/pages/QuotationsPage'
import { QuotationTemplatesPage } from '@/pages/QuotationTemplatesPage'
import { InvoicesPage } from '@/pages/InvoicesPage'
import { InvoiceTemplatesPage } from '@/pages/InvoiceTemplatesPage'
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
import { AttendancePage } from '@/pages/AttendancePage'
import { LeavePage } from '@/pages/LeavePage'
import { LeaveRequestsPage } from '@/pages/LeaveRequestsPage'
import { LeaveApprovalPage } from '@/pages/LeaveApprovalPage'
import { LeaveConfigPage } from '@/pages/LeaveConfigPage'
import { HRDashboardPage } from '@/pages/HRDashboardPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { ReportDetailPage } from '@/pages/ReportDetailPage'
import { DealPaymentsPage } from '@/pages/DealPaymentsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LeadFlowLandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route element={<RequireAuth />}>
        <Route element={<SessionSync />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route element={<RequireOnboarded />}>
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
            <Route path="/email" element={<EmailPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/quotations" element={<QuotationsPage />} />
            <Route path="/quotations/new" element={<NewQuotationPage />} />
            <Route path="/quotations/templates" element={<QuotationTemplatesPage />} />
            <Route path="/quotations/:id/print" element={<QuotationPrintPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/new" element={<NewInvoicePage />} />
            <Route path="/invoices/templates" element={<InvoiceTemplatesPage />} />
            <Route path="/invoices/:id/print" element={<InvoicePrintPage />} />
            <Route path="/lead-configuration" element={<LeadConfigurationPage />} />
            <Route path="/hr" element={<HRDashboardPage />} />
            <Route path="/hr/reports" element={<Navigate to="/reports/leave" replace />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/leave" element={<LeavePage />} />
            <Route path="/leave/requests" element={<LeaveRequestsPage />} />
            <Route path="/leave/approval" element={<LeaveApprovalPage />} />
            <Route path="/leave/config" element={<LeaveConfigPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/team/:userId" element={<TeamMemberProfilePage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
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
            <Route path="/calls" element={<Navigate to="/meetings" replace />} />
        </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
