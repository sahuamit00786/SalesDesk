import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Briefcase,
  Building2,
  Camera,
  Flag,
  Hash,
  Home,
  Mail,
  ShieldCheck,
  Upload,
  User,
} from '@/components/ui/icons'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { PhoneField } from '@/components/ui/PhoneField'
import { useWorkspacesQuery } from '@/features/workspace/workspaceApi'
import {
  usePatchUserProfileMutation,
  usePatchUserRoleMutation,
  useReplaceUserWorkspacesMutation,
  useTeamRolesQuery,
} from '@/features/team/teamApi'
import { cn } from '@/utils/cn'
import { labelCompanyUserRoleKind } from '@/constants/companyUserRoleKind'
import { IconInput, IconTextarea } from '@/components/ui/IconInput'

function isoCountryForPhone(countryField) {
  const c = String(countryField || '')
    .trim()
    .toUpperCase()
  return c.length === 2 ? c : 'IN'
}

const EMPTY_DRAFT = {
  name: '',
  department: '',
  jobTitle: '',
  businessPhone: '',
  whatsappNumber: '',
  profilePhotoUrl: '',
  street: '',
  city: '',
  country: '',
  postalCode: '',
}

function apiErrorMessage(err) {
  return err?.data?.error?.message ?? err?.error ?? 'Something went wrong'
}

function normalizeProfileDraft(draft) {
  return {
    name: draft.name?.trim() || null,
    department: draft.department?.trim() || null,
    jobTitle: draft.jobTitle?.trim() || null,
    businessPhone: draft.businessPhone?.trim() || null,
    whatsappNumber: draft.whatsappNumber?.trim() || null,
    profilePhotoUrl: draft.profilePhotoUrl?.trim() || null,
    street: draft.street?.trim() || null,
    city: draft.city?.trim() || null,
    country: draft.country?.trim() || null,
    postalCode: draft.postalCode?.trim() || null,
  }
}

function ProfilePhotoPicker({ value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div
        className={cn(
          'relative flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 bg-white shadow-inner',
          value ? 'border-brand-200' : 'border-dashed border-surface-border',
        )}
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <Camera className="h-7 w-7 text-ink-faint/90" strokeWidth={1.5} />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <label
          className={cn(
            'inline-flex cursor-pointer items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-xs font-semibold text-brand-800 shadow-sm transition hover:border-brand-300 hover:bg-white',
            disabled && 'pointer-events-none opacity-60',
          )}
        >
          <Upload className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          Choose from device
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0]
              const input = e.currentTarget
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => {
                const result = typeof reader.result === 'string' ? reader.result : ''
                onChange(result)
                input.value = ''
              }
              reader.readAsDataURL(file)
            }}
          />
        </label>
        <p className="text-[11px] leading-relaxed text-ink-muted">
          JPEG or PNG from your computer. Applies after you save.
        </p>
        {value ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange('')}
            className="text-[11px] font-medium text-danger hover:underline disabled:opacity-50"
          >
            Remove photo
          </button>
        ) : null}
      </div>
    </div>
  )
}

function workspaceChipClass(active, opts = {}) {
  const { disabled } = opts
  return cn(
    'rounded-xl border px-3.5 py-2 text-left text-xs font-medium transition-all duration-150',
    active
      ? 'border-brand-400 bg-white text-brand-900 shadow-sm ring-1 ring-brand-500/20'
      : 'border-surface-border bg-white text-ink-muted hover:border-brand-200',
    disabled && 'cursor-not-allowed opacity-50',
  )
}

export function TeamMemberAccessDrawer({ open, user, onClose, onSaved }) {
  const { data: rolesData } = useTeamRolesQuery(undefined, { skip: !open })
  const { data: wsData } = useWorkspacesQuery(undefined, { skip: !open })
  const [patchUserRole, { isLoading: patchingRole }] = usePatchUserRoleMutation()
  const [patchUserProfile, { isLoading: patchingProfile }] = usePatchUserProfileMutation()
  const [replaceUserWorkspaces, { isLoading: patchingWorkspaces }] = useReplaceUserWorkspacesMutation()

  const roles = (() => {
    const payload = rolesData?.data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.items)) return payload.items
    return []
  })()
  const workspaces = wsData?.data?.items || []

  const [roleId, setRoleId] = useState('')
  const [workspaceIds, setWorkspaceIds] = useState([])
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  useEffect(() => {
    if (!open || !user) return
    setRoleId(user.companyRole?.id ?? '')
    setWorkspaceIds((user.workspaces || []).map((w) => w.id))
    setDraft({
      name: user.name || '',
      department: user.department || '',
      jobTitle: user.jobTitle || '',
      businessPhone: user.businessPhone || '',
      whatsappNumber: user.whatsappNumber || '',
      profilePhotoUrl: user.profilePhotoUrl || '',
      street: user.street || '',
      city: user.city || '',
      country: user.country || '',
      postalCode: user.postalCode || '',
    })
  }, [open, user])

  function toggleWorkspace(id) {
    setWorkspaceIds((curr) => (curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]))
  }

  async function save() {
    if (!user) return
    if (!workspaceIds.length) {
      toast.error('At least one workspace is required')
      return
    }
    try {
      const currentProfile = normalizeProfileDraft(user || {})
      const nextProfile = normalizeProfileDraft(draft)
      if (!user.isCompanyAdmin && roleId && roleId !== (user.companyRole?.id ?? '')) {
        await patchUserRole({ id: user.id, companyRoleId: roleId }).unwrap()
      }
      const profileChanged =
        nextProfile.name !== currentProfile.name ||
        nextProfile.department !== currentProfile.department ||
        nextProfile.jobTitle !== currentProfile.jobTitle ||
        nextProfile.businessPhone !== currentProfile.businessPhone ||
        nextProfile.whatsappNumber !== currentProfile.whatsappNumber ||
        nextProfile.profilePhotoUrl !== currentProfile.profilePhotoUrl ||
        nextProfile.street !== currentProfile.street ||
        nextProfile.city !== currentProfile.city ||
        nextProfile.country !== currentProfile.country ||
        nextProfile.postalCode !== currentProfile.postalCode
      if (profileChanged) {
        await patchUserProfile({ id: user.id, ...nextProfile }).unwrap()
      }
      await replaceUserWorkspaces({ id: user.id, workspaceIds }).unwrap()
      toast.success('Member access updated')
      onSaved?.()
      onClose?.()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  const busy = patchingRole || patchingProfile || patchingWorkspaces

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      className="bg-white"
      title="Edit member"
      description={
        user
          ? 'Update role, workspaces, and profile — same fields as when inviting someone new.'
          : 'Update role, workspaces, and profile.'
      }
      footer={
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink-muted shadow-sm transition hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="h-10 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-[var(--brand-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      }
    >
      <div className="space-y-3.5">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Name</label>
          <IconInput
            wrapperClassName="mt-1.5"
            icon={User}
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((s) => ({ ...s, name: e.target.value }))}
            placeholder="Full name"
            disabled={patchingProfile}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Email</label>
          <IconInput
            wrapperClassName="mt-1.5"
            icon={Mail}
            type="email"
            value={user?.email || ''}
            readOnly
            disabled
            className="bg-white text-ink-muted"
          />
        </div>

        <div>
          <PhoneField
            label="Business phone"
            mode="e164"
            defaultCountry={isoCountryForPhone(draft.country)}
            value={draft.businessPhone}
            onChange={(v) => setDraft((s) => ({ ...s, businessPhone: v || '' }))}
            disabled={patchingProfile}
          />
        </div>
        <div>
          <PhoneField
            label="WhatsApp"
            mode="e164"
            defaultCountry={isoCountryForPhone(draft.country)}
            value={draft.whatsappNumber}
            onChange={(v) => setDraft((s) => ({ ...s, whatsappNumber: v || '' }))}
            disabled={patchingProfile}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Job title</label>
          <IconInput
            wrapperClassName="mt-1.5"
            icon={Briefcase}
            type="text"
            value={draft.jobTitle}
            onChange={(e) => setDraft((s) => ({ ...s, jobTitle: e.target.value }))}
            placeholder="e.g. Account Executive"
            disabled={patchingProfile}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">City</label>
            <IconInput
              wrapperClassName="mt-1.5"
              icon={Building2}
              type="text"
              value={draft.city}
              onChange={(e) => setDraft((s) => ({ ...s, city: e.target.value }))}
              placeholder="City"
              disabled={patchingProfile}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Country</label>
            <IconInput
              wrapperClassName="mt-1.5"
              icon={Flag}
              type="text"
              value={draft.country}
              onChange={(e) => setDraft((s) => ({ ...s, country: e.target.value }))}
              placeholder="Country"
              disabled={patchingProfile}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Pin code</label>
            <IconInput
              wrapperClassName="mt-1.5"
              icon={Hash}
              type="text"
              inputMode="numeric"
              value={draft.postalCode}
              onChange={(e) => setDraft((s) => ({ ...s, postalCode: e.target.value }))}
              placeholder="Postal / PIN code"
              disabled={patchingProfile}
            />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Address</label>
          <IconTextarea
            wrapperClassName="mt-1.5"
            icon={Home}
            rows={3}
            value={draft.street}
            onChange={(e) => setDraft((s) => ({ ...s, street: e.target.value }))}
            placeholder="Street, building, landmark…"
            disabled={patchingProfile}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Role</label>
          <div className="relative mt-1.5">
            <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 z-[1] h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" strokeWidth={1.75} />
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              disabled={busy || user?.isCompanyAdmin}
              className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-surface-border bg-white pl-9 pr-3 text-sm outline-none transition-shadow focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:bg-white disabled:text-ink-muted/70"
            >
              <option value="">Select role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.userRoleKind ? ` — ${labelCompanyUserRoleKind(r.userRoleKind)}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Profile photo</label>
          <div className="mt-1.5">
            <ProfilePhotoPicker
              value={draft.profilePhotoUrl}
              disabled={patchingProfile}
              onChange={(url) => setDraft((s) => ({ ...s, profilePhotoUrl: url }))}
            />
          </div>
        </div>
        <section className="py-1">
          <div className="space-y-2.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Workspaces</label>
            <div className="flex flex-wrap gap-2">
              {workspaces.map((w) => {
                const active = workspaceIds.includes(w.id)
                return (
                  <button
                    key={w.id}
                    type="button"
                    disabled={patchingWorkspaces}
                    onClick={() => toggleWorkspace(w.id)}
                    className={workspaceChipClass(active, { disabled: patchingWorkspaces })}
                  >
                    {w.name}
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      </div>
    </RightDrawer>
  )
}

export default TeamMemberAccessDrawer
