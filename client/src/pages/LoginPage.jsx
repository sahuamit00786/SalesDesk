import { useLayoutEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import gsap from 'gsap'
import { BarChart3, Kanban, ShieldCheck } from 'lucide-react'
import { useLoginMutation } from '@/features/auth/authApi'
import { useAppSelector } from '@/app/hooks'
import { AuthScreenShell, authLinkClassName } from '@/components/auth/AuthScreenShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { loginSchema } from '@/utils/validators/loginSchema'
import { LeadNestLogo } from '@/components/shared/LeadNestLogo'

function LoginVisual() {
  const items = [
    { icon: Kanban, label: 'Pipeline-first CRM', text: 'Stages, owners, and SLAs stay aligned.' },
    { icon: BarChart3, label: 'Revenue signals', text: 'Forecast-ready views for managers.' },
    { icon: ShieldCheck, label: 'Workspace security', text: 'Role-aware access for every seat.' },
  ]
  return (
    <ul className="space-y-3">
      {items.map(({ icon: Icon, label, text }) => (
        <li
          key={label}
          className="flex gap-3 rounded-2xl border border-violet-100 bg-white/80 p-4 shadow-[0_8px_30px_rgba(124,58,237,0.08)] backdrop-blur-sm"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-semibold text-[#0a0714]">{label}</span>
            <span className="mt-0.5 block text-sm text-zinc-500">{text}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export function LoginPage() {
  const token = useAppSelector((s) => s.auth.accessToken)
  const user = useAppSelector((s) => s.auth.user)
  const location = useLocation()
  const navigate = useNavigate()
  const from = location.state?.from?.pathname || '/dashboard'

  const [email, setEmail] = useState(() => location.state?.email ?? '')
  const [password, setPassword] = useState('')
  const [login, { isLoading }] = useLoginMutation()
  const formRef = useRef(null)

  useLayoutEffect(() => {
    const root = formRef.current
    if (!root) return undefined
    const ctx = gsap.context(() => {
      const fields = root.querySelectorAll('[data-field]')
      gsap.fromTo(
        fields,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.42,
          stagger: 0.07,
          ease: 'power2.out',
          delay: 0.32,
        },
      )
    }, root)
    return () => ctx.revert()
  }, [])

  if (token) {
    const to = user?.needsOnboarding ? '/onboarding' : from
    return <Navigate to={to} replace />
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Check your inputs')
      return
    }
    try {
      await login(parsed.data).unwrap()
      toast.success('Welcome back')
    } catch (err) {
      const code = err?.data?.error?.code
      if (code === 'EMAIL_NOT_VERIFIED') {
        sessionStorage.setItem('pendingVerificationEmail', parsed.data.email)
        toast.error('Verify your email to continue.')
        navigate('/register?verify=1')
        return
      }
      const message = err?.data?.error?.message ?? err?.error ?? 'Unable to sign in'
      toast.error(message)
    }
  }

  return (
    <AuthScreenShell
      variant="login"
      brand={<LeadNestLogo variant="auth" />}
      title="Sign in to your workspace"
      subtitle="One place for leads, deals, and customer conversations — tuned for modern revenue teams."
      visual={<LoginVisual />}
    >
      <div className="space-y-1 border-b border-violet-100 pb-5">
        <h2 className="text-lg font-semibold text-[#0a0714]">Welcome back</h2>
        <p className="text-sm text-zinc-500">Use the email and password you registered with.</p>
      </div>
      <form ref={formRef} className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
        <div data-field className="space-y-2">
          <label className="text-sm font-medium text-ink" htmlFor="login-email">
            Work email
          </label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your work email"
            required
          />
        </div>
        <div data-field className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-medium text-ink" htmlFor="login-password">
              Password
            </label>
            <Link className={`${authLinkClassName} text-xs`} to="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>
        <div data-field>
          <Button variant="primary" type="submit" className="mt-1 w-full !bg-violet-700 hover:!bg-violet-600" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Continue'}
          </Button>
        </div>
      </form>
      <p className="mt-6 text-center text-xs text-zinc-500">
        New to LeadNest?{' '}
        <Link className={authLinkClassName} to="/register">
          Create an account
        </Link>
      </p>
    </AuthScreenShell>
  )
}
