import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAppSelector } from '@/app/hooks'
import { AuthScreenShell } from '@/components/auth/AuthScreenShell'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Button } from '@/components/ui/Button'
import { useAcceptInvitationMutation } from '@/features/auth/authApi'

export function AcceptInvitePage() {
  const token = useAppSelector((s) => s.auth.accessToken)
  const [params] = useSearchParams()
  const invitationId = params.get('invitationId') || ''
  const tokenParam = params.get('token') || ''
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptInvitation, { isLoading }] = useAcceptInvitationMutation()

  if (token) return <Navigate to="/" replace />

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
      eyebrow="SalesDesk"
      title="Accept invitation"
      subtitle="Set your profile and password to activate your account."
      visual={null}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/90" htmlFor="invite-name">Full name</label>
          <Input
            id="invite-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-white/15 bg-white/10 text-white placeholder:text-white/40"
            placeholder="Your full name"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/90" htmlFor="invite-password">Password</label>
          <PasswordInput
            id="invite-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-white/15 bg-white/10 text-white placeholder:text-white/40"
            toggleButtonClassName="text-white/45 hover:bg-white/10 hover:text-white"
            placeholder="Create a strong password"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/90" htmlFor="invite-confirm-password">Confirm password</label>
          <PasswordInput
            id="invite-confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="border-white/15 bg-white/10 text-white placeholder:text-white/40"
            toggleButtonClassName="text-white/45 hover:bg-white/10 hover:text-white"
            placeholder="Re-enter password"
          />
        </div>
        <Button variant="primary" type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Activating…' : 'Accept invitation'}
        </Button>
      </form>
    </AuthScreenShell>
  )
}
