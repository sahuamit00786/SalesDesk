import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { RequireOnboarded } from '@/components/auth/RequireOnboarded'
import { LoginPage } from '@/pages/LoginPage'
import { ModulePlaceholderPage } from '@/pages/ModulePlaceholderPage'
import { WorkspacePage } from '@/pages/WorkspacePage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { TeamPage } from '@/pages/TeamPage'
import { AcceptInvitePage } from '@/pages/AcceptInvitePage'

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
  '/products',
  '/quotes',
  '/invoices',
  '/documents',
  '/automation',
  '/campaigns',
  '/forms',
  '/reports',
  '/forecasting',
  '/workspace',
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
          {APP_PATHS.filter((path) => path !== '/workspace' && path !== '/team').map((path) => (
            <Route key={path} path={path} element={<ModulePlaceholderPage />} />
          ))}
          <Route path="/team" element={<TeamPage />} />
          <Route path="/analytics" element={<Navigate to="/reports" replace />} />
          <Route path="/settings" element={<Navigate to="/workspace" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
