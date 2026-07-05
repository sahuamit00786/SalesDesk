import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { MenuPermissionPicker } from '@/features/team/components/MenuPermissionPicker'
import {
  useGetTeamUserQuery,
  useGetUserMenuPermissionsQuery,
  usePutUserMenuPermissionsMutation,
} from '@/features/team/teamApi'
import { labelCompanyUserRoleKind } from '@/constants/companyUserRoleKind'
import { useAppSelector } from '@/app/hooks'

function isApiPermissionError(err) {
  const status = err?.status ?? err?.originalStatus
  return status === 401 || status === 403
}

function apiErrorMessage(err) {
  if (!err) return ''
  if (isApiPermissionError(err)) return "You don't have permission to view this section."
  return err?.data?.error?.message || err?.data?.message || 'Failed to load.'
}

function initialsFor(text = '') {
  const parts = String(text || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function menuPermissionsFromItems(items) {
  return items
    .filter((i) => i.canView || i.canEdit || i.canUpdate || i.canDelete)
    .map((i) => ({
      menuId: i.menuId,
      canView: i.canView,
      canEdit: i.canEdit,
      canUpdate: i.canUpdate,
      canDelete: i.canDelete,
    }))
}

export function TeamMemberPermissionsPage() {
  const { userId } = useParams()
  const isCompanyAdmin = useAppSelector((s) => Boolean(s.auth.user?.isCompanyAdmin))

  const { data: userResp, isLoading: userLoading } = useGetTeamUserQuery(userId, { skip: !userId })
  const user = userResp?.data || null

  const { data, isLoading, error, refetch } = useGetUserMenuPermissionsQuery(userId, { skip: !userId })
  const [putPermissions, { isLoading: saving }] = usePutUserMenuPermissionsMutation()
  const items = useMemo(() => data?.data?.items || [], [data])

  const menuItems = useMemo(
    () => items.map((i) => ({ id: i.menuId, key: i.key, label: i.label, route: i.route, parentId: i.parentId })),
    [items],
  )

  const [draft, setDraft] = useState(null)
  const [syncedItems, setSyncedItems] = useState(items)
  const [dirty, setDirty] = useState(false)

  // Reset the local draft whenever fresh server data arrives, without an effect — React's
  // sanctioned "adjust state during render" pattern (avoids setState-in-effect cascades).
  if (items !== syncedItems) {
    setSyncedItems(items)
    setDraft(menuPermissionsFromItems(items))
    setDirty(false)
  }

  async function handleSave() {
    try {
      await putPermissions({ id: userId, menuPermissions: draft || [] }).unwrap()
      toast.success('Permissions updated')
      setDirty(false)
      refetch()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  return (
    <PageShell fullWidth>
      <div className="px-2 pb-4 pt-1 sm:px-3">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to={`/team/${userId}`}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-white text-ink-muted shadow-sm hover:border-brand-200 hover:text-brand-700"
              aria-label="Back to member profile"
              title="Back to member profile"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            </Link>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-brand-500 bg-brand-100"
            >
              {user?.profilePhotoUrl ? (
                <img src={user.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-brand-800">{initialsFor(user?.name || user?.email || '')}</span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[16px] font-semibold text-ink">
                {userLoading ? 'Loading…' : user?.name || 'Team member'} — Menu permissions
              </h1>
              <p className="truncate text-xs text-ink-muted">
                {user?.companyRole?.name
                  ? `${user.companyRole.name}${
                      user.companyRole.userRoleKind ? ` · ${labelCompanyUserRoleKind(user.companyRole.userRoleKind)}` : ''
                    }`
                  : user?.email}
              </p>
            </div>
          </div>
          {isCompanyAdmin ? (
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={handleSave}
              className="h-10 shrink-0 rounded-xl bg-slate-800 px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save permissions'}
            </button>
          ) : null}
        </div>

        {!isCompanyAdmin ? (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            Only company admins can change another user's menu permissions. You're viewing this read-only.
          </div>
        ) : null}

        {isLoading ? (
          <div className="h-[500px] animate-pulse rounded-2xl border border-[#C9BDE8] bg-[#F9F7FC]" />
        ) : error ? (
          isApiPermissionError(error) ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/60 px-6 py-10 text-center">
              <Lock className="h-5 w-5 text-amber-700" strokeWidth={2} />
              <p className="text-sm font-medium text-amber-900">Restricted</p>
              <p className="text-xs text-amber-800">{apiErrorMessage(error)}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-sm text-rose-800">
              {apiErrorMessage(error)}
            </div>
          )
        ) : (
          <MenuPermissionPicker
            menuItems={menuItems}
            value={draft || []}
            onChange={(next) => {
              if (!isCompanyAdmin) return
              setDraft(next)
              setDirty(true)
            }}
          />
        )}
      </div>
    </PageShell>
  )
}

export default TeamMemberPermissionsPage
