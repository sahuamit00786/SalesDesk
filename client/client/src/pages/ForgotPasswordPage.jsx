import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { KeyRound, Mail } from '@/components/ui/icons'
import { AuthScreenShell, authLinkClassName } from '@/components/auth/AuthScreenShell'
import { LeadNestLogo } from '@/components/shared/LeadNestLogo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { useForgotPasswordMutation, useResetPasswordMutation } from '@/features/auth/authApi'
import { resetPasswordSchema } from '@/utils/validators/resetPasswordSchema'
import {
  passwordPolicyRules,
  passwordPolicySummary,
} from '@/utils/passwordPolicy'
import { Check } from '@/components/ui/icons'
import { cn } from '@/utils/cn'

function ForgotVisual() {
  return (
    <ul className="space-y-3">
      {[
        { icon: Mail, label: 'Check your inbox', text: 'We send a 6-digit code to your work email.' },
        { icon: KeyRound, label: 'Choose a new password', text: 'Use a strong password you have not used here before.' },
      ].map(({ icon: Icon, label, text }) => (
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

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [forgotPassword, { isLoading: sending }] = useForgotPasswordMutation()
  const [resetPassword, { isLoading: resetting }] = useResetPasswordMutation()

  const confirmPasswordMismatch =
    confirmPassword.length > 0 && password.length > 0 && confirmPassword !== password

  const onRequestCode = async (e) => {
    e.preventDefault()
    const addr = email.trim()
    if (!addr) {
      toast.error('Enter your email')
      return
    }
    try {
      const res = await forgotPassword({ email: addr }).unwrap()
      toast.success(res?.data?.message ?? 'If an account exists, a code was sent.')
      setStep('reset')
    } catch (err) {
      toast.error(err?.data?.error?.message ?? err?.error ?? 'Could not send reset code')
    }
  }

  const onReset = async (e) => {
    e.preventDefault()
    const parsed = resetPasswordSchema.safeParse({ email: email.trim(), otp, password, confirmPassword })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Check your inputs')
      return
    }
    try {
      const res = await resetPassword(parsed.data).unwrap()
      toast.success(res?.data?.message ?? 'Password updated')
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(err?.data?.error?.message ?? err?.error ?? 'Could not reset password')
    }
  }

  return (
    <AuthScreenShell
      variant="login"
      brand={<LeadNestLogo variant="auth" />}
      title={step === 'email' ? 'Reset your password' : 'Enter your reset code'}
      subtitle={
        step === 'email'
          ? 'Enter the email on your account. We will send a one-time code if it is registered.'
          : `Enter the 6-digit code sent to ${email || 'your email'} and choose a new password.`
      }
      visual={<ForgotVisual />}
    >
      {step === 'email' ? (
        <form className="space-y-4" onSubmit={onRequestCode}>
          <div className="space-y-1 border-b border-violet-100 pb-4">
            <h2 className="text-lg font-semibold text-[#0a0714]">Forgot password</h2>
            <p className="text-sm text-zinc-500">We never reveal whether an email exists — check your inbox either way.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink" htmlFor="forgot-email">Work email</label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <Button variant="primary" type="submit" className="w-full !bg-violet-700 hover:!bg-violet-600" disabled={sending}>
            {sending ? 'Sending…' : 'Send reset code'}
          </Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={onReset}>
          <div className="space-y-1 border-b border-violet-100 pb-4">
            <h2 className="text-lg font-semibold text-[#0a0714]">New password</h2>
            <p className="text-sm text-zinc-500">Codes expire after a short time.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink" htmlFor="reset-otp">6-digit code</label>
            <Input
              id="reset-otp"
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
          <div className="group/pw space-y-2">
            <label className="text-sm font-medium text-ink" htmlFor="reset-password">New password</label>
            <PasswordInput
              id="reset-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Create a strong password"
              required
            />
            <div
              className="hidden space-y-2 pt-0.5 group-focus-within/pw:block"
              onMouseDown={(e) => e.preventDefault()}
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
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink" htmlFor="reset-confirm">Confirm password</label>
            <PasswordInput
              id="reset-confirm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              aria-invalid={confirmPasswordMismatch}
              className={cn(confirmPasswordMismatch && 'border-danger ring-1 ring-danger/30')}
              required
            />
            {confirmPasswordMismatch ? (
              <p className="text-xs font-medium text-danger" role="alert">Passwords do not match.</p>
            ) : null}
          </div>
          <Button variant="primary" type="submit" className="w-full !bg-violet-700 hover:!bg-violet-600" disabled={resetting}>
            {resetting ? 'Updating…' : 'Update password'}
          </Button>
          <button
            type="button"
            className={cn(authLinkClassName, 'text-xs')}
            onClick={() => {
              setStep('email')
              setOtp('')
              setPassword('')
              setConfirmPassword('')
            }}
          >
            ← Use a different email
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-zinc-500">
        Remember your password?{' '}
        <Link className={authLinkClassName} to="/login">Sign in</Link>
      </p>
    </AuthScreenShell>
  )
}
