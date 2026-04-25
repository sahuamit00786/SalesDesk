import { useLayoutEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import gsap from 'gsap'
import { BarChart3, Kanban, ShieldCheck } from 'lucide-react'
import { useLoginMutation } from '@/features/auth/authApi'
import { useAppSelector } from '@/app/hooks'
import { AuthScreenShell } from '@/components/auth/AuthScreenShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { loginSchema } from '@/utils/validators/loginSchema'

function LoginVisual() {
  const items = [
    { icon: Kanban, label: 'Pipeline-first CRM', text: 'Stages, owners, and SLAs stay aligned.' },
    { icon: BarChart3, label: 'Revenue signals', text: 'Forecast-ready views for managers.' },
    { icon: ShieldCheck, label: 'Workspace security', text: 'Role-aware access for every seat.' },
  ]
  return (
    <ul className="space-y-4 text-sm text-white/80">
      {items.map(({ icon: Icon, label, text }) => (
        <li key={label} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/20 text-brand-100">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <span>
            <span className="block font-semibold text-white">{label}</span>
            <span className="mt-0.5 block text-white/65">{text}</span>
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
  const from = location.state?.from?.pathname || '/'

  const [email, setEmail] = useState('')
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
      eyebrow="SalesDesk"
      title="Sign in to your workspace"
      subtitle="One place for leads, deals, and customer conversations — tuned for modern revenue teams."
      visual={<LoginVisual />}
    >
      <div className="space-y-1 border-b border-white/10 pb-5">
        <h2 className="text-lg font-semibold text-white">Welcome back</h2>
        <p className="text-sm text-white/60">Use the email and password you registered with.</p>
      </div>
      <form ref={formRef} className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
        <div data-field className="space-y-2">
          <label className="text-sm font-medium text-white/90" htmlFor="login-email">
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
            className="border-white/15 bg-white/10 text-white placeholder:text-white/40"
            required
          />
        </div>
        <div data-field className="space-y-2">
          <label className="text-sm font-medium text-white/90" htmlFor="login-password">
            Password
          </label>
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="border-white/15 bg-white/10 text-white placeholder:text-white/40"
            toggleButtonClassName="text-white/45 hover:bg-white/10 hover:text-white"
            required
          />
        </div>
        <div data-field>
          <Button variant="primary" type="submit" className="mt-1 w-full" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Continue'}
          </Button>
        </div>
      </form>
      <p className="mt-6 text-center text-xs text-white/55">
        New to SalesDesk?{' '}
        <Link className="font-semibold text-brand-200 hover:text-white" to="/register">
          Create an account
        </Link>
      </p>
    </AuthScreenShell>
  )
}
