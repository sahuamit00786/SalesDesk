import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail, CheckCircle, UserPlus } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { OnboardingFieldSection } from '@/features/onboarding/components/OnboardingFieldSection'
import { OnboardingStepHeader } from '@/features/onboarding/components/OnboardingStepHeader'
import { useGetGoogleEmailStatusQuery, useGetGoogleEmailConnectUrlMutation } from '@/features/leads/leadsApi'
import { useCreateInvitationMutation, useTeamRolesQuery } from '@/features/team/teamApi'
import { cn } from '@/utils/cn'

export function ActivateStep({ user, onGoogleConnected }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const justConnected = searchParams.get('connected') === '1'

  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useGetGoogleEmailStatusQuery()
  const [getConnectUrl, { isLoading: connecting }] = useGetGoogleEmailConnectUrlMutation()
  const { data: rolesData } = useTeamRolesQuery()
  const [createInvitation, { isLoading: inviting }] = useCreateInvitationMutation()

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoleId, setInviteRoleId] = useState('')
  const [inviteSent, setInviteSent] = useState(false)

  const roles = useMemo(() => {
    const payload = rolesData?.data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.items)) return payload.items
    return []
  }, [rolesData])
  const workspaceId = user?.company?.workspaces?.[0]?.id

  const defaultRoleId = useMemo(() => {
    const sales = roles.find((r) => r.userRoleKind === 'sales' || r.name?.toLowerCase().includes('sales'))
    const nonAdmin = roles.find((r) => !r.isDefault && r.roleNo !== 1)
    return sales?.id || nonAdmin?.id || roles[0]?.id || ''
  }, [roles])

  useEffect(() => {
    if (!inviteRoleId && defaultRoleId) setInviteRoleId(defaultRoleId)
  }, [defaultRoleId, inviteRoleId])

  useEffect(() => {
    if (justConnected) {
      refetchStatus()
      onGoogleConnected?.()
      const next = new URLSearchParams(searchParams)
      next.delete('connected')
      setSearchParams(next, { replace: true })
    }
  }, [justConnected, onGoogleConnected, refetchStatus, searchParams, setSearchParams])

  const googleConnected = Boolean(statusData?.data?.connected)

  async function connectGoogle() {
    try {
      const response = await getConnectUrl('/onboarding').unwrap()
      const url = response?.data?.url
      if (url) window.location.href = url
    } catch (err) {
      toast.error(err?.data?.error?.message ?? 'Could not start Google connection')
    }
  }

  async function sendInvite() {
    const email = inviteEmail.trim()
    if (!email) {
      toast.error('Enter an email address')
      return
    }
    if (!inviteRoleId) {
      toast.error('Choose a role')
      return
    }
    if (!workspaceId) {
      toast.error('No workspace available')
      return
    }
    try {
      await createInvitation({
        email,
        companyRoleId: inviteRoleId,
        workspaceIds: [workspaceId],
      }).unwrap()
      toast.success('Invitation sent')
      setInviteSent(true)
      setInviteEmail('')
    } catch (err) {
      toast.error(err?.data?.error?.message ?? err?.data?.publicMessage ?? 'Could not send invitation')
    }
  }

  return (
    <div className="space-y-10">
      <OnboardingStepHeader
        title="Activate your workspace"
        subtitle="Invite a teammate or connect Google — both are optional. You can do this later from Team and Integrations."
      />

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <OnboardingFieldSection title="Invite a teammate" icon={UserPlus}>
          <p className="-mt-2 text-sm text-ink-muted">
            Send one invite now so your team can collaborate on leads and pipeline.
          </p>
          <div className="max-w-lg space-y-3">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              autoComplete="email"
              className="h-11"
            />
            <Select value={inviteRoleId} onChange={(e) => setInviteRoleId(e.target.value)} className="h-11">
              <option value="">Select role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={inviting || !inviteEmail.trim()}
                onClick={sendInvite}
              >
                {inviting ? 'Sending…' : 'Send invitation'}
              </Button>
              {inviteSent ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <CheckCircle size={18} />
                  Sent
                </span>
              ) : null}
            </div>
          </div>
        </OnboardingFieldSection>

        <OnboardingFieldSection title="Connect Google" icon={Mail}>
          <p className="-mt-2 text-sm text-ink-muted">
            Sync email and calendar for outreach, inbox, and meeting workflows.
          </p>
          <div className="max-w-lg space-y-3">
            <div
              className={cn(
                'rounded-xl border px-4 py-3 text-sm',
                googleConnected
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-brand-200/60 bg-white/70 text-ink-muted',
              )}
            >
              {statusLoading
                ? 'Checking connection…'
                : googleConnected
                  ? `Connected as ${statusData?.data?.email || 'Google account'}`
                  : 'Not connected yet'}
            </div>
            {!googleConnected ? (
              <Button type="button" variant="secondary" disabled={connecting} onClick={connectGoogle}>
                {connecting ? 'Redirecting…' : 'Connect Google'}
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckCircle size={18} />
                Connected
              </span>
            )}
          </div>
        </OnboardingFieldSection>
      </div>
    </div>
  )
}
