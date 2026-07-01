import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  BellRing,
  Building2,
  Check,
  Gauge,
  LineChart,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { useRegisterMutation, useResendVerificationMutation, useVerifyEmailMutation } from '@/features/auth/authApi'
import { useAppSelector } from '@/app/hooks'
import { AuthScreenShell, authLinkClassName } from '@/components/auth/AuthScreenShell'
import { LeadNestLogo } from '@/components/shared/LeadNestLogo'
import { useAuthStepAnimation } from '@/hooks/useAuthStepAnimation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { registerSchema, otpSchema } from '@/utils/validators/registerSchema'
import { passwordPolicyRules, passwordPolicySummary } from '@/utils/passwordPolicy'
import { cn } from '@/utils/cn'

function RegisterVisual() {
  const bullets = [
    { icon: UsersRound, text: 'Lead routing, ownership, and handoffs without spreadsheets.' },
    { icon: LineChart, text: 'Pipeline health, velocity, and conversion in one timeline.' },
    { icon: Gauge, text: 'Automations that nudge reps when deals stall or SLAs slip.' },
    { icon: BellRing, text: 'Activity history you can trust for audits and coaching.' },
  ]
  return (
    <div className="rounded-2xl border border-violet-100 bg-white/80 p-5 shadow-[0_8px_30px_rgba(124,58,237,0.08)] backdrop-blur-sm">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
        <Sparkles className="h-4 w-4" aria-hidden />
        Lead management
      </p>
      <h3 className="mt-3 text-xl font-semibold text-[#0a0714]">Why teams choose LeadNest</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">
        Capture inquiries, qualify fast, and keep every stakeholder aligned from first touch to closed-won.
      </p>
      <ul className="mt-5 space-y-3 text-sm text-zinc-600">
        {bullets.map(({ icon: Icon, text }) => (
          <li key={text} className="flex gap-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function RegisterPage() {
  const token = useAppSelector((s) => s.auth.accessToken)
  const user = useAppSelector((s) => s.auth.user)
  const [searchParams] = useSearchParams()
  const verifyOnly = searchParams.get('verify') === '1'

  const [step, setStep] = useState(() => (verifyOnly ? 'otp' : 'details'))
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState(() =>
    verifyOnly ? sessionStorage.getItem('pendingVerificationEmail') || '' : '',
  )
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [emailAlreadyRegistered, setEmailAlreadyRegistered] = useState(false)

  const [register, { isLoading: registering }] = useRegisterMutation()
  const [verifyEmail, { isLoading: verifying }] = useVerifyEmailMutation()
  const [resendVerification, { isLoading: resending }] = useResendVerificationMutation()

  const stepRef = useRef(null)
  const formRef = useRef(null)
  useAuthStepAnimation(step, stepRef)

  useEffect(() => {
    const root = formRef.current
    if (!root || step !== 'details') return
    const fields = Array.from(root.querySelectorAll('[data-field]'))
    fields.forEach((el) => {
      el.style.opacity = '0'
      el.style.transform = 'translateY(12px)'
      el.style.transition = 'none'
    })
    const timer = setTimeout(() => {
      fields.forEach((el, i) => {
        el.style.transition = `opacity 0.4s ease ${0.28 + i * 0.06}s, transform 0.4s ease ${0.28 + i * 0.06}s`
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
      })
    }, 16)
    return () => clearTimeout(timer)
  }, [step])

  const goToOtp = useCallback((addr) => {
    setEmail(addr)
    sessionStorage.setItem('pendingVerificationEmail', addr)
    setStep('otp')
    setOtp('')
  }, [])

  const confirmPasswordMismatch =
    confirmPassword.length > 0 && password.length > 0 && confirmPassword !== password

  if (token) {
    const to = user?.needsOnboarding ? '/onboarding' : '/dashboard'
    return <Navigate to={to} replace />
  }

  const onRegister = async (e) => {
    e.preventDefault()
    const parsed = registerSchema.safeParse({
      name,
      companyName,
      email,
      password,
      confirmPassword,
    })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Check your inputs')
      return
    }
    const body = {
      name: parsed.data.name,
      companyName: parsed.data.companyName,
      email: parsed.data.email,
      password: parsed.data.password,
      confirmPassword: parsed.data.confirmPassword,
    }
    try {
      setEmailAlreadyRegistered(false)
      const res = await register(body).unwrap()
      toast.success(res?.data?.message ?? 'Check your email for the code.')
      goToOtp(parsed.data.email)
    } catch (err) {
      const code = err?.data?.error?.code
      if (code === 'CONFLICT') {
        setEmailAlreadyRegistered(true)
        return
      }
      const message = err?.data?.error?.message ?? err?.error ?? 'Unable to register'
      toast.error(message)
    }
  }

  const onVerify = async (e) => {
    e.preventDefault()
    const parsed = otpSchema.safeParse({ otp })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Enter the 6-digit code')
      return
    }
    try {
      const res = await verifyEmail({ email, otp: parsed.data.otp }).unwrap()
      sessionStorage.removeItem('pendingVerificationEmail')
      toast.success(res?.data?.message ?? 'Verified')
    } catch (err) {
      const message = err?.data?.error?.message ?? err?.error ?? 'Verification failed'
      toast.error(message)
    }
  }

  const onResend = async () => {
    if (!email) {
      toast.error('Email missing — start registration again.')
      return
    }
    try {
      const res = await resendVerification({ email }).unwrap()
      toast.success(res?.data?.message ?? 'Code sent')
    } catch (err) {
      const message = err?.data?.error?.message ?? err?.error ?? 'Could not resend'
      toast.error(message)
    }
  }

  return (
    <AuthScreenShell
      variant="register"
      brand={<LeadNestLogo variant="auth" />}
      title="Create your revenue workspace"
      subtitle="Tell us about your company, confirm your email with a one-time code, and you are in."
      visual={<RegisterVisual />}
    >
      {!emailAlreadyRegistered ? (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5 text-xs text-zinc-600">
          <Building2 className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />
          <span>
            You are registering for <span className="font-semibold text-[#0a0714]">LeadNest</span> — lead
            capture, qualification, and deal tracking in one place.
          </span>
        </div>
      ) : null}

      {emailAlreadyRegistered ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/80 px-4 py-5 text-center">
          <h2 className="text-lg font-semibold text-[#0a0714]">This email already has an account</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Sign in with <span className="font-medium text-ink">{email.trim()}</span> or use a different email to create a new company workspace.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              to="/login"
              state={{ email: email.trim() }}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-violet-700 px-5 text-sm font-semibold text-white hover:bg-violet-600"
            >
              Sign in
            </Link>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-violet-200 bg-white px-5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
              onClick={() => {
                setEmailAlreadyRegistered(false)
                setEmail('')
              }}
            >
              Use another email
            </button>
          </div>
        </div>
      ) : null}

      {!emailAlreadyRegistered ? (
      <>
      <div ref={stepRef} className="space-y-1 border-b border-violet-100 pb-4">
        <h2 className="text-lg font-semibold text-[#0a0714]">
          {step === 'details' ? 'Company & account' : 'Verify your email'}
        </h2>
        <p className="text-sm text-zinc-500">
          {step === 'details'
            ? 'We will send a 6-digit code to your inbox (Google SMTP from the server).'
            : `Enter the code sent to ${email || 'your inbox'}.`}
        </p>
      </div>

      {step === 'details' ? (
        <form ref={formRef} className="mt-5 flex flex-col gap-4" onSubmit={onRegister}>
          <div data-field className="space-y-2">
            <label className="text-sm font-medium text-ink" htmlFor="reg-name">
              Full name
            </label>
            <Input
              id="reg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Enter your full name"
              required
            />
          </div>
          <div data-field className="space-y-2">
            <label className="text-sm font-medium text-ink" htmlFor="reg-company">
              Company name
            </label>
            <Input
              id="reg-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              autoComplete="organization"
              placeholder="Enter your company name"
              required
            />
          </div>
          <div data-field className="space-y-2">
            <label className="text-sm font-medium text-ink" htmlFor="reg-email">
              Work email
            </label>
            <Input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="Enter your work email"
              required
            />
          </div>
          <div data-field className="group/pw space-y-2">
            <label className="text-sm font-medium text-ink" htmlFor="reg-password">
              Password
            </label>
            <PasswordInput
              id="reg-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="e.g. MyTeam#2026!Secure"
              required
            />
            <div
              className="hidden space-y-2 pt-0.5 group-focus-within/pw:block"
              onMouseDown={(e) => e.preventDefault()}
              aria-live="polite"
            >
              <p className="text-[11px] leading-snug text-zinc-500">{passwordPolicySummary()}</p>
              <ul className="flex flex-col gap-1.5 rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2.5 text-[11px] text-zinc-600">
                {passwordPolicyRules.map((rule) => {
                  const ok = rule.test(password)
                  return (
                    <li key={rule.id} className="flex items-center gap-2">
                      <span
                        className={
                          ok
                            ? 'flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700'
                            : 'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-violet-200 text-zinc-300'
                        }
                        aria-hidden
                      >
                        {ok ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                      </span>
                      <span className={ok ? 'text-ink' : undefined}>{rule.label}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
          <div data-field className="space-y-2">
            <label className="text-sm font-medium text-ink" htmlFor="reg-confirm">
              Confirm password
            </label>
            <PasswordInput
              id="reg-confirm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              aria-invalid={confirmPasswordMismatch}
              aria-describedby={confirmPasswordMismatch ? 'reg-confirm-error' : undefined}
              className={cn(confirmPasswordMismatch && 'border-danger ring-1 ring-danger/30')}
              required
            />
            {confirmPasswordMismatch ? (
              <p id="reg-confirm-error" className="text-xs font-medium text-danger" role="alert">
                Passwords do not match.
              </p>
            ) : null}
          </div>
          <div data-field>
            <Button variant="primary" type="submit" className="mt-1 w-full !bg-violet-700 hover:!bg-violet-600" disabled={registering}>
              {registering ? 'Creating account…' : 'Continue'}
            </Button>
          </div>
        </form>
      ) : (
        <form className="mt-5 flex flex-col gap-4" onSubmit={onVerify}>
          {email ? (
            <p className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2 text-xs text-zinc-600">
              Code sent to <span className="font-medium text-[#0a0714]">{email}</span>
            </p>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink" htmlFor="otp-email">
                Work email
              </label>
              <Input
                id="otp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your work email"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink" htmlFor="otp-code">
              6-digit code
            </label>
            <Input
              id="otp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="text-center font-mono text-lg tracking-[0.35em]"
              required
            />
          </div>
          <Button variant="primary" type="submit" className="w-full !bg-violet-700 hover:!bg-violet-600" disabled={verifying}>
            {verifying ? 'Verifying…' : 'Verify & sign in'}
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
            <button
              type="button"
              className={cn(authLinkClassName, 'disabled:opacity-50')}
              onClick={() => {
                setStep('details')
                setOtp('')
              }}
            >
              ← Edit details
            </button>
            <button
              type="button"
              className={cn(authLinkClassName, 'disabled:opacity-50')}
              onClick={onResend}
              disabled={resending}
            >
              {resending ? 'Sending…' : 'Resend code'}
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-zinc-500">
        Already have an account?{' '}
        <Link className={authLinkClassName} to="/login">
          Sign in
        </Link>
      </p>
      </>
      ) : null}
    </AuthScreenShell>
  )
}
