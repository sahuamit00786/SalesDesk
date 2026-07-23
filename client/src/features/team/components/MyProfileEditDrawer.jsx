import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Briefcase,
  Building2,
  Camera,
  Flag,
  Hash,
  Home,
  KeyRound,
  Mail,
  Upload,
  User,
} from '@/components/ui/icons'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { PhoneField } from '@/components/ui/PhoneField'
import { usePatchUserProfileMutation } from '@/features/team/teamApi'
import { useChangePasswordMutation } from '@/features/auth/authApi'
import { logout } from '@/features/auth/authSlice'
import { useAppDispatch } from '@/app/hooks'
import { cn } from '@/utils/cn'
import { IconInput, IconTextarea } from '@/components/ui/IconInput'

function isoCountryForPhone(countryField) {
  const c = String(countryField || '')
    .trim()
    .toUpperCase()
  return c.length === 2 ? c : 'IN'
}

const EMPTY_DRAFT = {
  name: '',
  jobTitle: '',
  businessPhone: '',
  whatsappNumber: '',
  profilePhotoUrl: '',
  street: '',
  city: '',
  country: '',
  postalCode: '',
}

const EMPTY_PASSWORD = { currentPassword: '', password: '', confirmPassword: '' }

function apiErrorMessage(err) {
  return err?.data?.error?.message ?? err?.data?.message ?? err?.error ?? 'Something went wrong'
}

function normalizeProfileDraft(draft) {
  return {
    name: draft.name?.trim() || null,
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

/** Self-service edit drawer: profile fields anyone may change about themselves, plus a
 * password section. Deliberately has no Role or Workspaces fields — those are admin-only
 * grants and must never be editable by the account they apply to (see TeamMemberAccessDrawer
 * for the admin-facing equivalent, and the server-side self-edit blocks in teamController). */
export function MyProfileEditDrawer({ open, user, onClose, onSaved }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [patchUserProfile, { isLoading: savingProfile }] = usePatchUserProfileMutation()
  const [changePassword, { isLoading: changingPassword }] = useChangePasswordMutation()

  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [pwd, setPwd] = useState(EMPTY_PASSWORD)
  const [showPwd, setShowPwd] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    setDraft({
      name: user.name || '',
      jobTitle: user.jobTitle || '',
      businessPhone: user.businessPhone || '',
      whatsappNumber: user.whatsappNumber || '',
      profilePhotoUrl: user.profilePhotoUrl || '',
      street: user.street || '',
      city: user.city || '',
      country: user.country || '',
      postalCode: user.postalCode || '',
    })
    setPwd(EMPTY_PASSWORD)
    setShowPwd(false)
  }, [open, user])

  async function saveProfile() {
    if (!user) return
    try {
      const currentProfile = normalizeProfileDraft(user)
      const nextProfile = normalizeProfileDraft(draft)
      const changed = Object.keys(nextProfile).some((key) => nextProfile[key] !== currentProfile[key])
      if (changed) {
        await patchUserProfile({ id: user.id, ...nextProfile }).unwrap()
        toast.success('Profile updated')
        onSaved?.()
      }
      onClose?.()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  async function savePassword() {
    if (!pwd.currentPassword || !pwd.password || !pwd.confirmPassword) {
      toast.error('Fill in your current and new password')
      return
    }
    if (pwd.password !== pwd.confirmPassword) {
      toast.error('New passwords must match')
      return
    }
    try {
      await changePassword(pwd).unwrap()
      toast.success('Password changed. Please sign in again.')
      dispatch(logout())
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  const busy = savingProfile || changingPassword

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      className="bg-white"
      title="Edit my profile"
      description="Update your own contact details, address, and password."
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
            onClick={saveProfile}
            className="h-10 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-[var(--brand-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingProfile ? 'Saving…' : 'Save changes'}
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
            disabled={savingProfile}
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
            disabled={savingProfile}
          />
        </div>
        <div>
          <PhoneField
            label="WhatsApp"
            mode="e164"
            defaultCountry={isoCountryForPhone(draft.country)}
            value={draft.whatsappNumber}
            onChange={(v) => setDraft((s) => ({ ...s, whatsappNumber: v || '' }))}
            disabled={savingProfile}
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
            disabled={savingProfile}
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
              disabled={savingProfile}
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
              disabled={savingProfile}
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
              disabled={savingProfile}
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
            disabled={savingProfile}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Profile photo</label>
          <div className="mt-1.5">
            <ProfilePhotoPicker
              value={draft.profilePhotoUrl}
              disabled={savingProfile}
              onChange={(url) => setDraft((s) => ({ ...s, profilePhotoUrl: url }))}
            />
          </div>
        </div>

        <div className="border-t border-surface-border pt-4">
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <KeyRound className="h-4 w-4 text-ink-muted" strokeWidth={1.75} />
              Change password
            </span>
            <span className="text-xs text-ink-muted">{showPwd ? 'Hide' : 'Show'}</span>
          </button>
          {showPwd ? (
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Current password
                </label>
                <IconInput
                  wrapperClassName="mt-1.5"
                  icon={KeyRound}
                  type="password"
                  autoComplete="current-password"
                  value={pwd.currentPassword}
                  onChange={(e) => setPwd((s) => ({ ...s, currentPassword: e.target.value }))}
                  placeholder="Current password"
                  disabled={changingPassword}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  New password
                </label>
                <IconInput
                  wrapperClassName="mt-1.5"
                  icon={KeyRound}
                  type="password"
                  autoComplete="new-password"
                  value={pwd.password}
                  onChange={(e) => setPwd((s) => ({ ...s, password: e.target.value }))}
                  placeholder="At least 10 characters"
                  disabled={changingPassword}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Confirm new password
                </label>
                <IconInput
                  wrapperClassName="mt-1.5"
                  icon={KeyRound}
                  type="password"
                  autoComplete="new-password"
                  value={pwd.confirmPassword}
                  onChange={(e) => setPwd((s) => ({ ...s, confirmPassword: e.target.value }))}
                  placeholder="Repeat new password"
                  disabled={changingPassword}
                />
              </div>
              <button
                type="button"
                disabled={changingPassword}
                onClick={savePassword}
                className="h-10 w-full rounded-xl border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-brand-800 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {changingPassword ? 'Updating…' : 'Update password'}
              </button>
              <p className="text-[11px] leading-relaxed text-ink-muted">
                You&apos;ll be signed out and asked to log in again with your new password.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </RightDrawer>
  )
}

export default MyProfileEditDrawer
