import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { RequireOnboarded } from '@/components/auth/RequireOnboarded'
import { LoginPage } from '@/pages/LoginPage'
import { ModulePlaceholderPage } from '@/pages/ModulePlaceholderPage'
import { WorkspacePage } from '@/pages/WorkspacePage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { TeamPage } from '@/pages/TeamPage'
import { IntegrationsPage } from '@/pages/IntegrationsPage'
import { AcceptInvitePage } from '@/pages/AcceptInvitePage'
import { LeadsPage } from '@/pages/LeadsPage'
import { LeadConfigurationPage } from '@/pages/LeadConfigurationPage'
import { LeadDetailPage } from '@/features/leads/pages/LeadDetailPage'
import { DocumentsPage } from '@/pages/DocumentsPage'
import { ActivitiesPage } from '@/pages/ActivitiesPage'
import { TasksPage } from '@/pages/TasksPage'
import { EmailPage } from '@/pages/EmailPage'
import { OpportunitiesPage } from '@/pages/OpportunitiesPage'
import { WebFormsListPage } from '@/features/webforms/pages/WebFormsListPage'
import { FormBuilderPage } from '@/features/webforms/pages/FormBuilderPage'
import { OpportunityDetailPage } from '@/features/opportunities/pages/OpportunityDetailPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { MeetingsPage } from '@/features/meetings/pages/MeetingsPage'

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
  '/whatsapp',
  '/documents',
  '/automation',
  '/campaigns',
  '/forms',
  '/reports',
  '/forecasting',
  '/workspace',
  '/lead-configuration',
  '/team',
  '/integrations',
  '/meetings'
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
              path !== '/lead-configuration' &&
              path !== '/integrations' &&
              path !== '/documents' &&
              path !== '/forms' &&
              path !== '/activities' &&
              path !== '/tasks' &&
              path !== '/email' &&
              path !== '/meetings'
          ).map((path) => (
            <Route key={path} path={path} element={<ModulePlaceholderPage />} />
          ))}
          
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/opportunities" element={<OpportunitiesPage />} />
          <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/leads/:id" element={<LeadDetailPage />} />
          <Route path="/activities" element={<ActivitiesPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/email" element={<EmailPage />} />
          <Route path="/lead-configuration" element={<LeadConfigurationPage />} />
          <Route path="/team" element={<TeamPage />} />
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
