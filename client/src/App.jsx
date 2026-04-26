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
import { WebFormsListPage } from '@/features/webforms/pages/WebFormsListPage'
import { FormBuilderPage } from '@/features/webforms/pages/FormBuilderPage'

const APP_PATHS = [
  '/',
  '/leads',
  '/contacts',
  '/companies',
  '/pipeline',
  '/deals',
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
          <Route path="/workspace" element={<WorkspacePage />} />
          {APP_PATHS.filter((path) => path !== '/workspace' && path !== '/team' && path !== '/leads' && path !== '/lead-configuration' && path !== '/integrations' && path !== '/documents' && path !== '/forms').map((path) => (
            <Route key={path} path={path} element={<ModulePlaceholderPage />} />
          ))}
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/leads/:id" element={<LeadDetailPage />} />
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
