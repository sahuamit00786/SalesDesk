import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Building2, Check, ShieldCheck, Users } from 'lucide-react'
import { useAppSelector } from '@/app/hooks'
import { AuthScreenShell, authLinkClassName } from '@/components/auth/AuthScreenShell'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Button } from '@/components/ui/Button'
import { useAcceptInvitationMutation, useGetInvitationPreviewQuery } from '@/features/auth/authApi'
import { LeadNestLogo } from '@/components/shared/LeadNestLogo'
import {
  passwordPolicyRules,
  passwordPolicySummary,
} from '@/utils/passwordPolicy'
import { cn } from '@/utils/cn'

function InviteVisual({ preview }) {
  if (!preview) return null
  const items = [
    preview.companyName ? { icon: Building2, label: 'Organization', text: preview.companyName } : null,
    preview.roleName ? { icon: ShieldCheck, label: 'Role', text: preview.roleName } : null,
    preview.workspaceNames?.length
      ? { icon: Users, label: 'Workspaces', text: preview.workspaceNames.join(', ') }
      : null,
  ].filter(Boolean)

  if (!items.length) return null

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
            <span className="block text-xs font-semibold uppercase tracking-wide text-violet-600">{label}</span>
            <span className="mt-0.5 block text-sm font-medium text-[#0a0714]">{text}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export function AcceptInvitePage() {
  const token = useAppSelector((s) => s.auth.accessToken)
  const [params] = useSearchParams()
  const invitationId = params.get('invitationId') || ''
  const tokenParam = params.get('token') || ''
  const hasInviteParams = Boolean(invitationId && tokenParam)

  const { data: previewRes, isLoading: loadingPreview, isError: previewError } = useGetInvitationPreviewQuery(
    { invitationId, token: tokenParam },
    { skip: !hasInviteParams },
  )
  const preview = previewRes?.data

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptInvitation, { isLoading }] = useAcceptInvitationMutation()

  const nameLocked = Boolean(preview?.nameFromInvite && preview?.name)

  useEffect(() => {
    if (!preview?.name) return
    setName(preview.name)
  }, [preview?.name])

  const confirmPasswordMismatch =
    confirmPassword.length > 0 && password.length > 0 && confirmPassword !== password

  const subtitle = useMemo(() => {
    if (!preview?.companyName) return 'Set your password to activate your account and join the team.'
    return `You have been invited to join ${preview.companyName}. Set your password to get started.`
  }, [preview?.companyName])

  if (token) return <Navigate to="/dashboard" replace />

  if (!hasInviteParams) {
    return (
      <AuthScreenShell
        variant="register"
        brand={<LeadNestLogo variant="auth" />}
        title="Invalid invitation link"
        subtitle="Ask your admin to send a new invitation email."
        visual={null}
      >
        <p className="text-sm text-zinc-500">
          This link is missing required parameters. Open the full link from your invitation email.
        </p>
        <p className="mt-6 text-center text-xs text-zinc-500">
          <Link className={authLinkClassName} to="/login">Sign in</Link>
        </p>
      </AuthScreenShell>
    )
  }

  if (loadingPreview) {
    return (
      <AuthScreenShell
        variant="register"
        brand={<LeadNestLogo variant="auth" />}
        title="Loading invitation…"
        subtitle="Verifying your invite link."
        visual={null}
      >
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
        </div>
      </AuthScreenShell>
    )
  }

  if (previewError || !preview) {
    return (
      <AuthScreenShell
        variant="register"
        brand={<LeadNestLogo variant="auth" />}
        title="Invitation unavailable"
        subtitle="This invitation may have expired or already been used."
        visual={null}
      >
        <p className="text-sm text-zinc-500">Contact your workspace admin for a new invite.</p>
        <p className="mt-6 text-center text-xs text-zinc-500">
          <Link className={authLinkClassName} to="/login">Sign in</Link>
        </p>
      </AuthScreenShell>
    )
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!invitationId || !tokenParam) {
      toast.error('Invalid invite link')
      return
    }
    if (!name.trim()) {
      toast.error('Enter your full name')
      return
    }
    if (password.length < 10) {
      toast.error('Password must be at least 10 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords must match')
      return
    }
    try {
      await acceptInvitation({
        invitationId,
        token: tokenParam,
        name: name.trim(),
        password,
        confirmPassword,
      }).unwrap()
      toast.success('Invitation accepted. You are signed in.')
    } catch (err) {
      toast.error(err?.data?.error?.message ?? err?.error ?? 'Could not accept invitation')
    }
  }

  return (
    <AuthScreenShell
      variant="register"
      brand={<LeadNestLogo variant="auth" />}
      title="Join your team"
      subtitle={subtitle}
      visual={<InviteVisual preview={preview} />}
    >
      <div className="mb-5 space-y-1 border-b border-violet-100 pb-4">
        <h2 className="text-lg font-semibold text-[#0a0714]">Activate your account</h2>
        <p className="text-sm text-zinc-500">Your email and name are from the invitation. Choose a password to continue.</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-ink" htmlFor="invite-email">Work email</label>
          <Input
            id="invite-email"
            type="email"
            value={preview.email || ''}
            readOnly
            disabled
            className="bg-violet-50/50 text-ink-muted"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-ink" htmlFor="invite-name">Full name</label>
          <Input
            id="invite-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            readOnly={nameLocked}
            disabled={nameLocked}
            autoComplete="name"
            placeholder="Your full name"
            className={nameLocked ? 'bg-violet-50/50 text-ink' : undefined}
          />
        </div>
        <div className="group/pw space-y-2">
          <label className="text-sm font-medium text-ink" htmlFor="invite-password">Password</label>
          <PasswordInput
            id="invite-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Create a strong password"
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
          <label className="text-sm font-medium text-ink" htmlFor="invite-confirm-password">Confirm password</label>
          <PasswordInput
            id="invite-confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Re-enter password"
            aria-invalid={confirmPasswordMismatch}
            className={cn(confirmPasswordMismatch && 'border-danger ring-1 ring-danger/30')}
          />
          {confirmPasswordMismatch ? (
            <p className="text-xs font-medium text-danger" role="alert">Passwords do not match.</p>
          ) : null}
        </div>
        <Button variant="primary" type="submit" className="w-full !bg-violet-700 hover:!bg-violet-600" disabled={isLoading}>
          {isLoading ? 'Activating…' : 'Accept invitation'}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-500">
        Already have an account?{' '}
        <Link className={authLinkClassName} to="/login">Sign in</Link>
      </p>
    </AuthScreenShell>
  )
}
