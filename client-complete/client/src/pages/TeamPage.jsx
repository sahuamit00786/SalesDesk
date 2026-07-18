import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Briefcase,
  Building2,
  Camera,
  Flag,
  Hash,
  Home,
  Lock,
  Mail,
  PencilLine,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
  Clock,
} from '@/components/ui/icons'
import { COMPANY_USER_ROLE_KIND_ALL_OPTIONS, labelCompanyUserRoleKind } from '@/constants/companyUserRoleKind'
import { Modal } from '@/components/ui/Modal'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { PhoneField } from '@/components/ui/PhoneField'
import { useAppSelector } from '@/app/hooks'
import { useWorkspacesQuery } from '@/features/workspace/workspaceApi'
import { selectResolvedActiveWorkspaceId } from '@/features/workspace/workspaceSlice'
import {
  useCancelInvitationMutation,
  useDeleteRoleMutation,
  useCreateInvitationMutation,
  useDeactivateUserMutation,
  useReactivateUserMutation,
  usePatchRoleMutation,
  usePatchUserRoleMutation,
  usePatchUserProfileMutation,
  useReplaceUserWorkspacesMutation,
  useTeamInvitationsQuery,
  useTeamRolesQuery,
  useTeamUsersQuery,
} from '@/features/team/teamApi'
import { cn } from '@/utils/cn'
import { PageShell } from '@/components/layout/PageShell'
import { PageStack } from '@/components/layout/PageStack'
import { PageFilterBar } from '@/components/layout/PageFilterBar'
import { PageContentPanel } from '@/components/layout/PageContentPanel'
import { PageTabButton } from '@/components/layout/PageTabButton'
import { inputFieldClassName } from '@/components/ui/Input'
import { DataGrid } from '@/components/shared/DataGrid'
import { IconInput, IconTextarea } from '@/components/ui/IconInput'

function isoCountryForPhone(countryField) {
  const c = String(countryField || '')
    .trim()
    .toUpperCase()
  return c.length === 2 ? c : 'IN'
}

const TEAM_TAB_STORAGE_KEY = 'leadflow.team.activeTab'

const EMPTY_INVITE_FORM = {
  name: '',
  email: '',
  companyRoleId: '',
  workspaceIds: [],
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

function formatUkDateTime(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
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

function WorkspacePills({ selectedIds, all }) {
  if (!selectedIds?.length) return <span className="block text-xs text-ink-faint">No workspace</span>
  const selected = all.filter((w) => selectedIds.includes(w.id))
  return (
    <div className="flex flex-wrap gap-1">
      {selected.map((w) => (
        <span key={w.id} className="rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px] text-ink-muted">
          {w.name}
        </span>
      ))}
    </div>
  )
}

function DrawerSection({ title, subtitle, icon: Icon, children }) {
  return (
    <section className="py-1">
      <div className="space-y-2.5">{children}</div>
    </section>
  )
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
          JPEG or PNG from your computer. Applies after you save (invite: when they accept).
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

function hasInviteProfilePrefill(prefill) {
  return Boolean(prefill && typeof prefill === 'object' && Object.keys(prefill).length > 0)
}

/** List API only returns non-expired pending invites; still show relative urgency in Status. */
function invitationStatusPill(inv) {
  const exp = inv.expiresAt ? new Date(inv.expiresAt).getTime() : 0
  const msLeft = exp - Date.now()
  if (msLeft < 48 * 60 * 60 * 1000) {
    return { label: 'Expiring soon', className: 'border-amber-200 bg-amber-50 text-amber-900' }
  }
  return { label: 'Pending', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' }
}

export function TeamPage() {
  const navigate = useNavigate()
  const { data: rolesData } = useTeamRolesQuery()
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useTeamUsersQuery()
  const { data: invitesData, isLoading: invitesLoading, refetch: refetchInvites } = useTeamInvitationsQuery()
  const { data: wsData } = useWorkspacesQuery()

  const [createInvitation, { isLoading: creatingInvite }] = useCreateInvitationMutation()
  const [patchRole, { isLoading: patchingRoleMeta }] = usePatchRoleMutation()
  const [deleteRole, { isLoading: deletingRole }] = useDeleteRoleMutation()
  const [cancelInvitation, { isLoading: cancellingInvite }] = useCancelInvitationMutation()
  const [patchUserRole, { isLoading: patchingRole }] = usePatchUserRoleMutation()
  const [patchUserProfile, { isLoading: patchingProfile }] = usePatchUserProfileMutation()
  const [replaceUserWorkspaces, { isLoading: patchingWorkspaces }] = useReplaceUserWorkspacesMutation()
  const [deactivateUser, { isLoading: deactivatingUser }] = useDeactivateUserMutation()
  const [reactivateUser, { isLoading: reactivatingUser }] = useReactivateUserMutation()

  const roles = useMemo(() => {
    const payload = rolesData?.data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.items)) return payload.items
    return []
  }, [rolesData])
  const users = useMemo(() => usersData?.data?.items || [], [usersData])
  const invitations = useMemo(() => invitesData?.data?.items || [], [invitesData])
  const workspaces = useMemo(() => wsData?.data?.items || [], [wsData])
  const activeWorkspaceId = useAppSelector(selectResolvedActiveWorkspaceId)
  const inviteWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null,
    [workspaces, activeWorkspaceId],
  )

  const [inviteDrawerOpen, setInviteDrawerOpen] = useState(false)
  const [roleEditDrawerOpen, setRoleEditDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem(TEAM_TAB_STORAGE_KEY) || 'members'
    } catch {
      return 'members'
    }
  })
  const [inviteForm, setInviteForm] = useState(() => ({ ...EMPTY_INVITE_FORM }))
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    userRoleKind: '',
  })
  const [editingRoleId, setEditingRoleId] = useState(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberRoleFilter, setMemberRoleFilter] = useState('all')
  const [memberStatusFilter, setMemberStatusFilter] = useState('all')
  const [deleteRoleDialog, setDeleteRoleDialog] = useState({ open: false, roleId: null, roleName: '', fallbackRoleId: '' })
  const [accessDrawerOpen, setAccessDrawerOpen] = useState(false)
  const [accessUserId, setAccessUserId] = useState(null)
  const [accessRoleId, setAccessRoleId] = useState('')
  const [accessWorkspaceIds, setAccessWorkspaceIds] = useState([])
  const [accessProfileDraft, setAccessProfileDraft] = useState({
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
  })
  const [deactivateDialog, setDeactivateDialog] = useState({ open: false, user: null })
  const [cancelInviteDialog, setCancelInviteDialog] = useState({ open: false, invite: null })

  const inviteBusy = creatingInvite
  const userBusy = patchingRole || patchingProfile || patchingWorkspaces || deactivatingUser || reactivatingUser

  useEffect(() => {
    try {
      localStorage.setItem(TEAM_TAB_STORAGE_KEY, activeTab)
    } catch {
      // ignore storage issues
    }
  }, [activeTab])

  const filteredUsers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase()
    return users.filter((u) => {
      const matchesSearch = !q || `${u.name || ''} ${u.email || ''}`.toLowerCase().includes(q)
      const matchesRole = memberRoleFilter === 'all' || u.companyRole?.id === memberRoleFilter
      const matchesStatus =
        memberStatusFilter === 'all' ||
        (memberStatusFilter === 'active' && u.isActive) ||
        (memberStatusFilter === 'inactive' && !u.isActive)
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, memberSearch, memberRoleFilter, memberStatusFilter])

  const memberColumns = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        minWidth: 180,
        renderCell: ({ row: u }) => (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-surface-border bg-slate-100 text-[11px] font-semibold text-brand-700">
              {u.profilePhotoUrl ? (
                <img src={u.profilePhotoUrl} alt={u.name || 'User'} className="h-full w-full object-cover" />
              ) : (
                <span>{(u.name || u.email || '?').trim().charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <p className="font-medium text-ink">{u.name || 'Unnamed user'}</p>
              <p className="text-[10px] leading-snug text-ink-faint">{u.email}</p>
            </div>
          </div>
        ),
      },
      { field: 'jobTitle', headerName: 'Job title', width: 120, valueGetter: (_v, u) => u.jobTitle || '—' },
      {
        field: 'lastLoginAt',
        headerName: 'Last login',
        width: 150,
        valueGetter: (_v, u) => formatUkDateTime(u.lastLoginAt) || 'Never',
      },
      {
        field: 'role',
        headerName: 'Role',
        width: 140,
        renderCell: ({ row: u }) => (
          <div className="flex flex-col gap-0.5">
            <span>{u.companyRole?.name || 'No role'}</span>
            {/* {u.companyRole?.userRoleKind ? (
              <span className="w-fit rounded-full border border-surface-border bg-white px-2 py-0.5 text-[10px] text-ink-faint">
                {labelCompanyUserRoleKind(u.companyRole.userRoleKind)}
              </span>
            ) : null} */}
          </div>
        ),
      },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 90,
        renderCell: ({ row: u }) => (
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-xs',
              u.isActive ? 'border-emerald-200 bg-white text-emerald-700' : 'border-surface-border bg-white text-ink-muted',
            )}
          >
            {u.isActive ? 'Active' : 'Inactive'}
          </span>
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 140,
        sortable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row: u }) => (
          <div className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              disabled={userBusy}
              onClick={() => openAccessDrawer(u)}
              aria-label="Edit member access"
              title="Edit role, workspaces, and profile"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-white text-brand-700 shadow-sm hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PencilLine className="h-3.5 w-3.5" />
            </button>
            {u.isActive ? (
              <button
                type="button"
                disabled={userBusy}
                onClick={() => doDeactivate(u)}
                aria-label="Deactivate user"
                title="Deactivate user"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-danger hover:bg-red-100"
              >
                <UserMinus className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={userBusy}
                onClick={async () => {
                  try {
                    await reactivateUser({ id: u.id }).unwrap()
                    toast.success('Member reactivated')
                    await refetchUsers()
                  } catch (err) {
                    toast.error(apiErrorMessage(err))
                  }
                }}
                aria-label="Reactivate user"
                title="Restore access for this member"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              >
                <UserCheck className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(`/team/${u.id}/permissions`)}
              aria-label="Menu permissions"
              title="Manage menu permissions"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-white text-brand-700 shadow-sm hover:bg-white"
            >
              <Lock className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [userBusy],
  )

  const inviteColumns = useMemo(
    () => [
      {
        field: 'email',
        headerName: 'Email',
        flex: 1,
        minWidth: 160,
        renderCell: ({ row: inv }) => <span className="font-medium text-ink">{inv.email}</span>,
      },
      {
        field: 'role',
        headerName: 'Role',
        width: 140,
        valueGetter: (_v, inv) => inv.companyRole?.name || '—',
      },
      {
        field: 'roleType',
        headerName: 'Role type',
        width: 120,
        renderCell: ({ row: inv }) =>
          inv.companyRole?.userRoleKind ? (
            <span className="inline-flex rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px] text-ink-muted">
              {labelCompanyUserRoleKind(inv.companyRole.userRoleKind)}
            </span>
          ) : (
            <span className="text-ink-faint">—</span>
          ),
      },
      {
        field: 'workspaces',
        headerName: 'Workspaces',
        flex: 1,
        minWidth: 120,
        sortable: false,
        renderCell: ({ row: inv }) => (
          <WorkspacePills selectedIds={inv.workspaceIds || []} all={workspaces} />
        ),
      },
      {
        field: 'invitedBy',
        headerName: 'Invited by',
        width: 160,
        renderCell: ({ row: inv }) =>
          inv.invitedBy ? (
            <div className="flex flex-col gap-0.5">
              <span className="line-clamp-1 font-medium text-ink">{inv.invitedBy.name || '—'}</span>
              <span className="line-clamp-1 text-[11px] text-ink-faint">{inv.invitedBy.email || ''}</span>
            </div>
          ) : (
            <span className="text-ink-faint">—</span>
          ),
      },
      {
        field: 'createdAt',
        headerName: 'Sent',
        width: 150,
        valueGetter: (_v, inv) => (inv.createdAt ? new Date(inv.createdAt).toLocaleString() : '—'),
      },
      {
        field: 'expiresAt',
        headerName: 'Expires',
        width: 150,
        valueGetter: (_v, inv) => (inv.expiresAt ? new Date(inv.expiresAt).toLocaleString() : '—'),
      },
      {
        field: 'profile',
        headerName: 'Profile',
        width: 100,
        renderCell: ({ row: inv }) =>
          hasInviteProfilePrefill(inv.profilePrefill) ? (
            <span className="inline-flex rounded-full border border-brand-200 bg-white px-2 py-0.5 text-[11px] font-medium text-brand-800">
              Included
            </span>
          ) : (
            <span className="text-ink-faint">—</span>
          ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 110,
        renderCell: ({ row: inv }) => {
          const status = invitationStatusPill(inv)
          return (
            <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium', status.className)}>
              {status.label}
            </span>
          )
        },
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 60,
        sortable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row: inv }) => (
          <button
            type="button"
            disabled={cancellingInvite}
            onClick={() => setCancelInviteDialog({ open: true, invite: inv })}
            aria-label="Cancel invitation"
            title="Cancel invitation"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-danger hover:bg-red-100 disabled:opacity-50"
          >
            <X className="h-3 w-3" />
          </button>
        ),
      },
    ],
    [workspaces, cancellingInvite],
  )

  const roleColumns = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Role',
        flex: 1,
        minWidth: 140,
        renderCell: ({ row: r }) => (
          <div className="flex items-center gap-2">
            <p className="font-medium text-ink">{r.name}</p>
            {r.isDefault ? (
              <span className="rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px] text-ink-muted">
                Default
              </span>
            ) : null}
          </div>
        ),
      },
      {
        field: 'userRoleKind',
        headerName: 'Role type',
        width: 120,
        valueGetter: (_v, r) => labelCompanyUserRoleKind(r.userRoleKind),
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 1,
        minWidth: 140,
        valueGetter: (_v, r) => r.description || 'No description',
      },
      {
        field: 'assignedUsers',
        headerName: 'Users',
        width: 80,
        renderCell: ({ row: r }) => (
          <span className="inline-flex items-center gap-1 rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px] text-ink-muted">
            <Users className="h-3.5 w-3.5" />
            {r.assignedUsers || 0}
          </span>
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 100,
        sortable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row: r }) => (
          <div className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label="Edit role"
              title={r.isDefault ? 'Default role cannot be edited' : 'Edit role'}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-white text-brand-700 shadow-sm hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={r.isDefault}
              onClick={() => {
                setEditingRoleId(r.id)
                setRoleForm({
                  name: r.name,
                  description: r.description || '',
                  userRoleKind: r.userRoleKind || 'custom',
                })
                setRoleEditDrawerOpen(true)
              }}
            >
              <PencilLine className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Delete role"
              title={r.isDefault ? 'Default role cannot be deleted' : 'Delete role'}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-danger hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={deletingRole || r.isDefault}
              onClick={() => {
                setDeleteRoleDialog({
                  open: true,
                  roleId: r.id,
                  roleName: r.name,
                  fallbackRoleId:
                    roles.find((x) => x.id !== r.id && !x.isDefault)?.id ||
                    roles.find((x) => x.id !== r.id)?.id ||
                    '',
                })
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [deletingRole, roles],
  )

  function closeInviteDrawer() {
    setInviteDrawerOpen(false)
    setInviteForm({ ...EMPTY_INVITE_FORM })
  }

  async function submitInvite(e) {
    e.preventDefault()
    if (!inviteForm.email.trim()) return toast.error('Enter an email')
    if (!inviteForm.companyRoleId) return toast.error('Choose a role')
    const wsIds = inviteWorkspace?.id ? [inviteWorkspace.id] : inviteForm.workspaceIds
    if (!wsIds.length) return toast.error('Select a workspace in the sidebar first')
    try {
      const prof = normalizeProfileDraft(inviteForm)
      await createInvitation({
        name: inviteForm.name.trim() || undefined,
        email: inviteForm.email.trim(),
        companyRoleId: inviteForm.companyRoleId,
        workspaceIds: wsIds,
        department: prof.department ?? undefined,
        jobTitle: prof.jobTitle ?? undefined,
        businessPhone: prof.businessPhone ?? undefined,
        whatsappNumber: prof.whatsappNumber ?? undefined,
        profilePhotoUrl: prof.profilePhotoUrl ?? undefined,
        street: prof.street ?? undefined,
        city: prof.city ?? undefined,
        country: prof.country ?? undefined,
        postalCode: prof.postalCode ?? undefined,
      }).unwrap()
      toast.success('Invitation sent')
      closeInviteDrawer()
      refetchInvites()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  function openAccessDrawer(user) {
    const currentWs = (user.workspaces || []).map((w) => w.id)
    setAccessUserId(user.id)
    setAccessRoleId(user.companyRole?.id ?? '')
    setAccessWorkspaceIds(currentWs)
    setAccessProfileDraft({
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
    setAccessDrawerOpen(true)
  }

  function closeAccessDrawer() {
    setAccessDrawerOpen(false)
    setAccessUserId(null)
    setAccessRoleId('')
    setAccessWorkspaceIds([])
    setAccessProfileDraft({
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
    })
  }

  function toggleDraftWorkspace(workspaceId) {
    setAccessWorkspaceIds((currentIds) =>
      currentIds.includes(workspaceId)
        ? currentIds.filter((id) => id !== workspaceId)
        : [...currentIds, workspaceId],
    )
  }

  async function saveAccessChanges() {
    if (!accessUser) return
    if (!accessWorkspaceIds.length) {
      toast.error('At least one workspace is required')
      return
    }
    try {
      const currentProfile = normalizeProfileDraft(accessUser || {})
      const nextProfile = normalizeProfileDraft(accessProfileDraft)
      if (!accessUser.isCompanyAdmin && accessRoleId && accessRoleId !== (accessUser.companyRole?.id ?? '')) {
        await patchUserRole({ id: accessUser.id, companyRoleId: accessRoleId }).unwrap()
      }
      if (
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
      ) {
        await patchUserProfile({ id: accessUser.id, ...nextProfile }).unwrap()
      }
      await replaceUserWorkspaces({ id: accessUser.id, workspaceIds: accessWorkspaceIds }).unwrap()
      toast.success('Member access updated')
      closeAccessDrawer()
      refetchUsers()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  async function doDeactivate(user) {
    setDeactivateDialog({ open: true, user })
  }

  async function confirmDeactivateUser() {
    if (!deactivateDialog.user) return
    try {
      await deactivateUser({ id: deactivateDialog.user.id, reassignOwnerUserId: null }).unwrap()
      toast.success('User deactivated')
      setDeactivateDialog({ open: false, user: null })
      refetchUsers()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  async function confirmCancelInvitation() {
    if (!cancelInviteDialog.invite) return
    try {
      await cancelInvitation(cancelInviteDialog.invite.id).unwrap()
      toast.success('Invitation canceled')
      setCancelInviteDialog({ open: false, invite: null })
      refetchInvites()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  const accessUser = users.find((u) => u.id === accessUserId) || null

  return (
    <PageShell fullWidth>
      <PageStack>
        {/* Tabs */}
            <section className="flex items-center justify-between border-b border-surface-border bg-white px-4 sm:px-6">
              <div className="-mb-px flex gap-4">
                {[
                  { id: 'members', label: 'Members' },
                  { id: 'invitations', label: 'Invitations' },
                  { id: 'roles', label: 'Roles' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'border-brand-600 text-ink'
                        : 'border-transparent text-ink-muted hover:text-ink'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const wsId = inviteWorkspace?.id
                  setInviteForm({
                    ...EMPTY_INVITE_FORM,
                    workspaceIds: wsId ? [wsId] : [],
                  })
                  setInviteDrawerOpen(true)
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 text-xs font-medium text-brand-700 shadow-sm hover:bg-white"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add user
              </button>
            </section>

            {/* Members Search & Filters */}
            {activeTab === 'members' ? (
              <section className="border-b border-surface-border bg-white px-4 py-3 sm:px-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search by name or email"
                    className={cn(inputFieldClassName, 'min-w-[220px] flex-1 text-sm')}
                  />
                  <select
                    value={memberRoleFilter}
                    onChange={(e) => setMemberRoleFilter(e.target.value)}
                    className={cn(inputFieldClassName, 'w-auto min-w-[140px] text-xs')}
                  >
                    <option value="all">All roles</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                        {r.userRoleKind ? ` — ${labelCompanyUserRoleKind(r.userRoleKind)}` : ''}
                      </option>
                    ))}
                  </select>
                  <select
                    value={memberStatusFilter}
                    onChange={(e) => setMemberStatusFilter(e.target.value)}
                    className={cn(inputFieldClassName, 'w-auto min-w-[120px] text-xs')}
                  >
                    <option value="all">All status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </section>
            ) : null}

            {/* Data Grids */}
            <section className="rounded-2xl border border-surface-border bg-white shadow-sm">
              {activeTab === 'members' ? (
                <DataGrid
                  gridColumns
                  columns={memberColumns}
                  data={filteredUsers}
                  loading={usersLoading}
                  searchable={false}
                  showColumnToggle={false}
                  showExportCsv={false}
                  onRowClick={(params) => navigate(`/team/${params.row.id}`)}
                  emptyTitle="No members found"
                  maxHeightClass="max-h-[min(65vh,600px)]"
                  className="rounded-2xl border-0 shadow-none"
                />
              ) : null}

              {activeTab === 'invitations' ? (
                <DataGrid
                  gridColumns
                  columns={inviteColumns}
                  data={invitations}
                  loading={invitesLoading}
                  searchable={false}
                  showColumnToggle={false}
                  showExportCsv={false}
                  emptyTitle="No pending invitations"
                  maxHeightClass="max-h-[min(65vh,600px)]"
                  className="rounded-2xl border-0 shadow-none"
                />
              ) : null}

              {activeTab === 'roles' ? (
                <DataGrid
                  gridColumns
                  columns={roleColumns}
                  data={roles}
                  searchable={false}
                  showColumnToggle={false}
                  showExportCsv={false}
                  emptyTitle="No custom roles yet"
                  maxHeightClass="max-h-[min(65vh,600px)]"
                  className="rounded-2xl border-0 shadow-none"
                />
              ) : null}
            </section>
      </PageStack>

      <RightDrawer
        open={accessDrawerOpen}
        onClose={closeAccessDrawer}
        className="bg-white"
        title="Edit member"
        description={
          accessUser
            ? 'Update role, workspaces, and profile — same fields as when inviting someone new.'
            : 'Update role, workspaces, and profile.'
        }
        footer={
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeAccessDrawer}
              className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink-muted shadow-sm transition hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={patchingWorkspaces || patchingRole || patchingProfile}
              onClick={saveAccessChanges}
              className="h-10 rounded-xl bg-slate-800 px-5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {patchingWorkspaces || patchingRole || patchingProfile ? 'Saving…' : 'Save changes'}
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
              value={accessProfileDraft.name}
              onChange={(e) => setAccessProfileDraft((s) => ({ ...s, name: e.target.value }))}
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
              value={accessUser?.email || ''}
              readOnly
              disabled
              className="bg-white text-ink-muted"
            />
          </div>

          <div>
            <PhoneField
              label="Business phone"
              mode="e164"
              defaultCountry={isoCountryForPhone(accessProfileDraft.country)}
              value={accessProfileDraft.businessPhone}
              onChange={(v) => setAccessProfileDraft((s) => ({ ...s, businessPhone: v || '' }))}
              disabled={patchingProfile}
            />
          </div>
          <div>
            <PhoneField
              label="WhatsApp"
              mode="e164"
              defaultCountry={isoCountryForPhone(accessProfileDraft.country)}
              value={accessProfileDraft.whatsappNumber}
              onChange={(v) => setAccessProfileDraft((s) => ({ ...s, whatsappNumber: v || '' }))}
              disabled={patchingProfile}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Job title</label>
            <IconInput
              wrapperClassName="mt-1.5"
              icon={Briefcase}
              type="text"
              value={accessProfileDraft.jobTitle}
              onChange={(e) => setAccessProfileDraft((s) => ({ ...s, jobTitle: e.target.value }))}
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
                value={accessProfileDraft.city}
                onChange={(e) => setAccessProfileDraft((s) => ({ ...s, city: e.target.value }))}
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
                value={accessProfileDraft.country}
                onChange={(e) => setAccessProfileDraft((s) => ({ ...s, country: e.target.value }))}
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
                value={accessProfileDraft.postalCode}
                onChange={(e) => setAccessProfileDraft((s) => ({ ...s, postalCode: e.target.value }))}
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
              value={accessProfileDraft.street}
              onChange={(e) => setAccessProfileDraft((s) => ({ ...s, street: e.target.value }))}
              placeholder="Street, building, landmark…"
              disabled={patchingProfile}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Role</label>
            <div className="relative mt-1.5">
              <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 z-[1] h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" strokeWidth={1.75} />
              <select
                value={accessRoleId}
                onChange={(e) => setAccessRoleId(e.target.value)}
                disabled={patchingWorkspaces || patchingRole || patchingProfile || accessUser?.isCompanyAdmin}
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
                value={accessProfileDraft.profilePhotoUrl}
                disabled={patchingProfile}
                onChange={(url) => setAccessProfileDraft((s) => ({ ...s, profilePhotoUrl: url }))}
              />
            </div>
          </div>
          <DrawerSection>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Workspaces</label>
            <div className="flex flex-wrap gap-2">
              {workspaces.map((w) => {
                const active = accessWorkspaceIds.includes(w.id)
                return (
                  <button
                    key={w.id}
                    type="button"
                    disabled={patchingWorkspaces}
                    onClick={() => toggleDraftWorkspace(w.id)}
                    className={workspaceChipClass(active, { disabled: patchingWorkspaces })}
                  >
                    {w.name}
                  </button>
                )
              })}
            </div>
          </DrawerSection>
        </div>
      </RightDrawer>

      <RightDrawer
        open={inviteDrawerOpen}
        onClose={closeInviteDrawer}
        className="bg-white"
        title="Add team member"
        description="Invite by email. Profile details you fill are applied automatically when they accept and finish signup."
        footer={
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeInviteDrawer}
              className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink-muted shadow-sm transition hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="invite-member-form"
              disabled={inviteBusy}
              className="h-10 rounded-xl bg-slate-800 px-5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-slate-800 disabled:opacity-60"
            >
              {inviteBusy ? 'Sending…' : 'Send invitation'}
            </button>
          </div>
        }
      >
        <form id="invite-member-form" className="space-y-3.5" onSubmit={submitInvite}>
          <DrawerSection>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Name</label>
              <IconInput
                wrapperClassName="mt-1.5"
                icon={User}
                type="text"
                value={inviteForm.name}
                onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
                disabled={inviteBusy}
                className="bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Email</label>
              <IconInput
                wrapperClassName="mt-1.5"
                icon={Mail}
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@company.com"
                disabled={inviteBusy}
                className="bg-white"
              />
            </div>
            <div>
              <PhoneField
                label="Business phone"
                mode="e164"
                defaultCountry={isoCountryForPhone(inviteForm.country)}
                value={inviteForm.businessPhone}
                onChange={(v) => setInviteForm((f) => ({ ...f, businessPhone: v || '' }))}
                disabled={inviteBusy}
              />
            </div>
            <div>
              <PhoneField
                label="WhatsApp"
                mode="e164"
                defaultCountry={isoCountryForPhone(inviteForm.country)}
                value={inviteForm.whatsappNumber}
                onChange={(v) => setInviteForm((f) => ({ ...f, whatsappNumber: v || '' }))}
                disabled={inviteBusy}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Job title</label>
              <IconInput
                wrapperClassName="mt-1.5"
                icon={Briefcase}
                type="text"
                value={inviteForm.jobTitle}
                onChange={(e) => setInviteForm((f) => ({ ...f, jobTitle: e.target.value }))}
                placeholder="e.g. Account Executive"
                disabled={inviteBusy}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">City</label>
                <IconInput
                  wrapperClassName="mt-1.5"
                  icon={Building2}
                  type="text"
                  value={inviteForm.city}
                  onChange={(e) => setInviteForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="City"
                  disabled={inviteBusy}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Country</label>
                <IconInput
                  wrapperClassName="mt-1.5"
                  icon={Flag}
                  type="text"
                  value={inviteForm.country}
                  onChange={(e) => setInviteForm((f) => ({ ...f, country: e.target.value }))}
                  placeholder="Country"
                  disabled={inviteBusy}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Pin code</label>
                <IconInput
                  wrapperClassName="mt-1.5"
                  icon={Hash}
                  type="text"
                  inputMode="numeric"
                  value={inviteForm.postalCode}
                  onChange={(e) => setInviteForm((f) => ({ ...f, postalCode: e.target.value }))}
                  placeholder="Postal / PIN code"
                  disabled={inviteBusy}
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Address</label>
              <IconTextarea
                wrapperClassName="mt-1.5"
                icon={Home}
                rows={3}
                value={inviteForm.street}
                onChange={(e) => setInviteForm((f) => ({ ...f, street: e.target.value }))}
                placeholder="Street, building, landmark…"
                disabled={inviteBusy}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Role</label>
              <div className="relative mt-1.5">
                <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 z-[1] h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" strokeWidth={1.75} />
                <select
                  value={inviteForm.companyRoleId}
                  onChange={(e) => setInviteForm((f) => ({ ...f, companyRoleId: e.target.value }))}
                  disabled={inviteBusy}
                  className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-surface-border bg-white pl-9 pr-3 text-sm outline-none transition-shadow focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 disabled:opacity-70"
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
                  value={inviteForm.profilePhotoUrl}
                  disabled={inviteBusy}
                  onChange={(url) => setInviteForm((f) => ({ ...f, profilePhotoUrl: url }))}
                />
              </div>
            </div>
          </DrawerSection>

          <DrawerSection>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Workspace</label>
            {inviteWorkspace ? (
              <p className="mt-1.5 rounded-xl border border-surface-border bg-surface-subtle px-3.5 py-2.5 text-sm text-ink">
                {inviteWorkspace.name}
                <span className="mt-1 block text-xs text-ink-faint">
                  New members are added to this workspace. Use member access to assign more workspaces later.
                </span>
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-ink-faint">Select a workspace in the sidebar first.</p>
            )}
          </DrawerSection>
        </form>
      </RightDrawer>

      <RightDrawer
        open={roleEditDrawerOpen}
        onClose={() => setRoleEditDrawerOpen(false)}
        title="Edit role"
        description="Role type is a label used for reporting — menu access is granted per person from their profile page, not here."
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRoleEditDrawerOpen(false)} className="h-10 rounded-xl border border-surface-border px-4 text-sm">
              Cancel
            </button>
            <button
              type="button"
              disabled={patchingRoleMeta}
              onClick={async () => {
                if (!editingRoleId) return
                if (!roleForm.userRoleKind) return toast.error('Select a role type')
                try {
                  await patchRole({
                    id: editingRoleId,
                    name: roleForm.name.trim(),
                    description: roleForm.description.trim() || null,
                    userRoleKind: roleForm.userRoleKind,
                  }).unwrap()
                  toast.success('Role updated')
                  setRoleEditDrawerOpen(false)
                } catch (err) {
                  toast.error(apiErrorMessage(err))
                }
              }}
              className="h-10 rounded-xl bg-slate-800 px-4 text-sm font-medium text-white"
            >
              {patchingRoleMeta ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        }
      >
        <div className="flex h-full min-h-0 flex-col gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Role type</label>
            <p className="mt-1 text-[11px] leading-snug text-ink-muted">
              Workspace admin, Manager, or Sales — or Custom for legacy roles. Workspaces and menu access are assigned per person, not here.
            </p>
            <select
              value={roleForm.userRoleKind}
              onChange={(e) => setRoleForm((f) => ({ ...f, userRoleKind: e.target.value }))}
              className="mt-2 h-10 w-full cursor-pointer rounded-xl border border-surface-border bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15"
            >
              {COMPANY_USER_ROLE_KIND_ALL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Role name</label>
            <input
              type="text"
              value={roleForm.name}
              onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-surface-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Description</label>
            <textarea
              rows={3}
              value={roleForm.description}
              onChange={(e) => setRoleForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-surface-border bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
      </RightDrawer>

      <Modal
        open={deactivateDialog.open}
        onClose={() => setDeactivateDialog({ open: false, user: null })}
        title="Deactivate member"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeactivateDialog({ open: false, user: null })}
              className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink-muted hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeactivateUser}
              disabled={deactivatingUser}
              className="h-10 rounded-xl bg-danger px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {deactivatingUser ? 'Deactivating…' : 'Deactivate'}
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Deactivate <span className="font-medium text-ink">{deactivateDialog.user?.name || deactivateDialog.user?.email}</span>?
          They will lose access until reactivated.
        </p>
      </Modal>

      <Modal
        open={cancelInviteDialog.open}
        onClose={() => setCancelInviteDialog({ open: false, invite: null })}
        title="Cancel invitation"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCancelInviteDialog({ open: false, invite: null })}
              className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink-muted hover:bg-white"
            >
              Keep invite
            </button>
            <button
              type="button"
              onClick={confirmCancelInvitation}
              disabled={cancellingInvite}
              className="h-10 rounded-xl bg-danger px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {cancellingInvite ? 'Canceling…' : 'Cancel invite'}
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Cancel pending invitation for <span className="font-medium text-ink">{cancelInviteDialog.invite?.email}</span>?
        </p>
      </Modal>

      <Modal
        open={deleteRoleDialog.open}
        onClose={() => setDeleteRoleDialog({ open: false, roleId: null, roleName: '', fallbackRoleId: '' })}
        title="Delete role"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteRoleDialog({ open: false, roleId: null, roleName: '', fallbackRoleId: '' })}
              className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink-muted hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deletingRole || !deleteRoleDialog.fallbackRoleId}
              onClick={async () => {
                try {
                  await deleteRole({
                    id: deleteRoleDialog.roleId,
                    fallbackCompanyRoleId: deleteRoleDialog.fallbackRoleId,
                  }).unwrap()
                  toast.success('Role deleted')
                  setDeleteRoleDialog({ open: false, roleId: null, roleName: '', fallbackRoleId: '' })
                } catch (err) {
                  toast.error(apiErrorMessage(err))
                }
              }}
              className="h-10 rounded-xl bg-danger px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {deletingRole ? 'Deleting…' : 'Delete role'}
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Reassign users from <span className="font-medium text-ink">{deleteRoleDialog.roleName}</span> before deleting.
        </p>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Fallback role</label>
          <select
            value={deleteRoleDialog.fallbackRoleId}
            onChange={(e) => setDeleteRoleDialog((d) => ({ ...d, fallbackRoleId: e.target.value }))}
            className="mt-2 h-10 w-full rounded-xl border border-surface-border bg-white px-3 text-sm"
          >
            <option value="">Select fallback role</option>
            {roles
              .filter((r) => r.id !== deleteRoleDialog.roleId)
              .map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
          </select>
        </div>
      </Modal>

    </PageShell>
  )
}
