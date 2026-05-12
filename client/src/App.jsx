import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { RequireOnboarded } from '@/components/auth/RequireOnboarded'
import { LoginPage } from '@/pages/LoginPage'
import { ModulePlaceholderPage } from '@/pages/ModulePlaceholderPage'
import { WorkspacePage } from '@/pages/WorkspacePage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { RegisterPage } from '@/pages/RegisterPage'
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
import { WorkflowsListPage } from '@/pages/WorkflowsListPage'
import { WorkflowNewPage } from '@/pages/WorkflowNewPage'
import { WorkflowEditorPage } from '@/pages/WorkflowEditorPage'

const APP_PATHS = [
  '/',
  '/leads',
  '/contacts',
  '/companies',
  '/pipeline',
  '/deals',
  '/opportunities',
  '/activities',
  '/tasks',
  '/calls',
  '/email',
  '/templates',
  '/whatsapp',
  '/documents',
  '/automation',
  '/campaigns',
  '/forms',
  '/reports',
  '/forecasting',
  '/workspace',
  '/lead-configuration',
  '/lead-distribution',
  '/team',
  '/integrations',
  '/meetings',
  '/calendar',
  '/quotations',
  '/quotations/templates',
  '/quotations/new',
  '/invoices',
  '/invoices/templates',
  '/invoices/new',
]

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route element={<RequireAuth />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route element={<RequireOnboarded />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            {APP_PATHS.filter(
              (path) =>
                path !== '/' &&
                path !== '/workspace' &&
                path !== '/team' &&
                path !== '/leads' &&
                path !== '/opportunities' &&
                path !== '/pipeline' &&
                path !== '/deals' &&
                path !== '/lead-configuration' &&
                path !== '/lead-distribution' &&
                path !== '/integrations' &&
                path !== '/documents' &&
                path !== '/forms' &&
                path !== '/activities' &&
                path !== '/tasks' &&
                path !== '/email' &&
                path !== '/templates' &&
                path !== '/meetings' &&
                path !== '/calendar' &&
                path !== '/quotations' &&
                path !== '/quotations/templates' &&
                path !== '/quotations/new' &&
                path !== '/invoices' &&
                path !== '/invoices/templates' &&
                path !== '/invoices/new' &&
                path !== '/campaigns' &&
                path !== '/campaigns/new' &&
                path !== '/automation' &&
                path !== '/automation/new',
            ).map((path) => (
              <Route key={path} path={path} element={<ModulePlaceholderPage />} />
            ))}

            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/lead-distribution" element={<LeadDistributionPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/deals" element={<DealsPage />} />
            <Route path="/deals/:id" element={<DealDetailPage />} />
            <Route path="/opportunities" element={<OpportunitiesPage />} />
            <Route path="/opportunities/:id" element={<LeadDetailPage />} />
            <Route path="/meetings" element={<MeetingsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/campaigns" element={<CampaignsListPage />} />
            <Route path="/campaigns/new" element={<CampaignNewPage />} />
            <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
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
            <Route path="/team" element={<TeamPage />} />
            <Route path="/team/:userId" element={<TeamMemberProfilePage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/forms" element={<WebFormsListPage />} />
            <Route path="/forms/:id/builder" element={<FormBuilderPage />} />
            <Route path="/analytics" element={<Navigate to="/reports" replace />} />
            <Route path="/settings" element={<Navigate to="/workspace" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
