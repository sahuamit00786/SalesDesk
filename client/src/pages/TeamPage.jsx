import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Briefcase,
  Building2,
  Camera,
  Clock,
  Flag,
  Hash,
  Home,
  LayoutGrid,
  Mail,
  MapPin,
  MessageCircle,
  PencilLine,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Modal } from '@/components/ui/Modal'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { PhoneField } from '@/components/ui/PhoneField'
import { useWorkspacesQuery } from '@/features/workspace/workspaceApi'
import {
  useCancelInvitationMutation,
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useCreateInvitationMutation,
  useDeactivateUserMutation,
  usePatchRoleMutation,
  useTeamMenusQuery,
  usePatchUserRoleMutation,
  usePatchUserProfileMutation,
  useReplaceUserWorkspacesMutation,
  useTeamInvitationsQuery,
  useTeamRolesQuery,
  useTeamUsersQuery,
} from '@/features/team/teamApi'
import { cn } from '@/utils/cn'

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

function IconInput({ icon: Icon, className = '', wrapperClassName = '', ...props }) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" strokeWidth={1.75} />
      <input
        {...props}
        className={cn(
          'h-10 w-full rounded-xl border border-surface-border bg-white pl-9 pr-3 text-sm outline-none transition-shadow placeholder:text-ink-faint/80 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15',
          className,
        )}
      />
    </div>
  )
}

function IconTextarea({ icon: Icon, className = '', wrapperClassName = '', ...props }) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <Icon className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-ink-faint" strokeWidth={1.75} />
      <textarea
        {...props}
        className={cn(
          'min-h-[84px] w-full resize-y rounded-xl border border-surface-border bg-white px-3 py-2.5 pl-9 text-sm outline-none transition-shadow placeholder:text-ink-faint/80 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15',
          className,
        )}
      />
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

export function TeamPage() {
  const navigate = useNavigate()
  const { data: rolesData } = useTeamRolesQuery()
  const { data: menusData } = useTeamMenusQuery()
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useTeamUsersQuery()
  const { data: invitesData, isLoading: invitesLoading, refetch: refetchInvites } = useTeamInvitationsQuery()
  const { data: wsData } = useWorkspacesQuery()

  const [createInvitation, { isLoading: creatingInvite }] = useCreateInvitationMutation()
  const [createRole, { isLoading: creatingRole }] = useCreateRoleMutation()
  const [patchRole, { isLoading: patchingRoleMeta }] = usePatchRoleMutation()
  const [deleteRole, { isLoading: deletingRole }] = useDeleteRoleMutation()
  const [cancelInvitation, { isLoading: cancellingInvite }] = useCancelInvitationMutation()
  const [patchUserRole, { isLoading: patchingRole }] = usePatchUserRoleMutation()
  const [patchUserProfile, { isLoading: patchingProfile }] = usePatchUserProfileMutation()
  const [replaceUserWorkspaces, { isLoading: patchingWorkspaces }] = useReplaceUserWorkspacesMutation()
  const [deactivateUser, { isLoading: deactivatingUser }] = useDeactivateUserMutation()

  const roles = useMemo(() => {
    const payload = rolesData?.data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.items)) return payload.items
    return []
  }, [rolesData])
  const menuItems = useMemo(() => menusData?.data?.items || [], [menusData])
  const users = useMemo(() => usersData?.data?.items || [], [usersData])
  const invitations = useMemo(() => invitesData?.data?.items || [], [invitesData])
  const workspaces = useMemo(() => wsData?.data?.items || [], [wsData])

  const [inviteDrawerOpen, setInviteDrawerOpen] = useState(false)
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false)
  const [roleEditDrawerOpen, setRoleEditDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem(TEAM_TAB_STORAGE_KEY) || 'members'
    } catch {
      return 'members'
    }
  })
  const [inviteForm, setInviteForm] = useState(() => ({ ...EMPTY_INVITE_FORM }))
  const [roleForm, setRoleForm] = useState({ name: '', description: '', menuPermissions: [] })
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
  const userBusy = patchingRole || patchingProfile || patchingWorkspaces || deactivatingUser

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

  const menusBySection = useMemo(() => {
    const groups = new Map()
    for (const m of menuItems.filter((x) => x.route)) {
      const section = (m.key || '').split('.')[0] || 'other'
      if (!groups.has(section)) groups.set(section, [])
      groups.get(section).push(m)
    }
    return [...groups.entries()]
  }, [menuItems])

  function permissionFor(menuId) {
    return roleForm.menuPermissions.find((m) => m.menuId === menuId) || {
      menuId,
      canView: false,
      canEdit: false,
      canUpdate: false,
      canDelete: false,
    }
  }

  function togglePermission(menuId, key) {
    setRoleForm((f) => {
      const current = f.menuPermissions.find((m) => m.menuId === menuId) || {
        menuId,
        canView: false,
        canEdit: false,
        canUpdate: false,
        canDelete: false,
      }
      const next = { ...current, [key]: !current[key] }
      if (!next.canView && !next.canEdit && !next.canUpdate && !next.canDelete) {
        return { ...f, menuPermissions: f.menuPermissions.filter((m) => m.menuId !== menuId) }
      }
      const rest = f.menuPermissions.filter((m) => m.menuId !== menuId)
      return { ...f, menuPermissions: [...rest, next] }
    })
  }

  function setMenuPermissions(menuId, nextState) {
    setRoleForm((f) => {
      const rest = f.menuPermissions.filter((m) => m.menuId !== menuId)
      if (!nextState.canView && !nextState.canEdit && !nextState.canUpdate && !nextState.canDelete) {
        return { ...f, menuPermissions: rest }
      }
      return { ...f, menuPermissions: [...rest, nextState] }
    })
  }

  function setMenuAll(menuId, enabled) {
    setMenuPermissions(menuId, {
      menuId,
      canView: enabled,
      canEdit: enabled,
      canUpdate: enabled,
      canDelete: enabled,
    })
  }

  function renderMenuPermissionPicker() {
    return (
      <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-surface-border bg-white p-2">
        <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto">
          {menusBySection.map(([section, sectionMenus]) => (
            <div key={section} className="mb-3 last:mb-0">
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{section}</p>
              {sectionMenus.map((m) => {
                const p = permissionFor(m.id)
                const menuEnabled = p.canView || p.canEdit || p.canUpdate || p.canDelete
                return (
                  <div key={m.id} className="mb-2 w-full rounded-lg border border-surface-border p-2 last:mb-0">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={menuEnabled}
                        onChange={(e) => setMenuAll(m.id, e.target.checked)}
                        className="h-4 w-4 rounded border-surface-border text-brand-600 focus:ring-brand-500/30"
                      />
                      <span className="text-xs font-medium text-ink">{m.label}</span>
                    </label>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {[
                        ['canView', 'View'],
                        ['canEdit', 'Edit'],
                        ['canUpdate', 'Update'],
                        ['canDelete', 'Delete'],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            togglePermission(m.id, key)
                          }}
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-[11px]',
                            p[key]
                              ? 'border-brand-300 bg-white text-brand-800 shadow-sm'
                              : 'border-surface-border bg-white text-ink-muted',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  function closeInviteDrawer() {
    setInviteDrawerOpen(false)
    setInviteForm({ ...EMPTY_INVITE_FORM })
  }

  async function submitInvite(e) {
    e.preventDefault()
    if (!inviteForm.email.trim()) return toast.error('Enter an email')
    if (!inviteForm.companyRoleId) return toast.error('Choose a role')
    if (!inviteForm.workspaceIds.length) return toast.error('Assign at least one workspace')
    try {
      const prof = normalizeProfileDraft(inviteForm)
      await createInvitation({
        email: inviteForm.email.trim(),
        companyRoleId: inviteForm.companyRoleId,
        workspaceIds: inviteForm.workspaceIds,
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
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-border bg-white px-3 py-2">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'members', label: 'Members' },
              { id: 'invitations', label: 'Invitations' },
              { id: 'roles', label: 'Roles' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'h-8 rounded-lg border px-3 text-xs font-medium transition',
                  activeTab === tab.id
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-surface-border bg-white text-ink-muted hover:border-surface-border hover:bg-white',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRoleDrawerOpen(true)}
              aria-label="Create role"
              title="Create role"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 text-xs font-medium text-brand-700 shadow-sm hover:bg-white"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Create role
            </button>
            <button
              type="button"
              onClick={() => setInviteDrawerOpen(true)}
              aria-label="Add user"
              title="Add user"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 text-xs font-medium text-brand-700 shadow-sm hover:bg-white"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add user
            </button>
          </div>
        </div>

        {activeTab === 'members' ? (
          <section className="rounded-xl border border-surface-border bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search by name or email"
                className="h-9 min-w-[220px] flex-1 rounded-lg border border-surface-border bg-white px-3 text-sm text-ink outline-none focus:border-brand-400"
              />
              <select
                value={memberRoleFilter}
                onChange={(e) => setMemberRoleFilter(e.target.value)}
                className="h-9 rounded-lg border border-surface-border bg-white px-3 text-xs text-ink-muted"
              >
                <option value="all">All roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <select
                value={memberStatusFilter}
                onChange={(e) => setMemberStatusFilter(e.target.value)}
                className="h-9 rounded-lg border border-surface-border bg-white px-3 text-xs text-ink-muted"
              >
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </section>
        ) : null}

        {activeTab === 'members' ? (
        <section className="overflow-hidden rounded-xl border border-surface-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-xs">
              <thead className="sticky top-0 z-10 bg-white text-ink-muted">
                <tr>
                  <th className="px-2.5 py-2 text-left text-[11px]">Name</th>
                  <th className="px-2.5 py-2 text-left text-[11px]">Job title</th>
                  <th className="px-2.5 py-2 text-left text-[11px]">Department</th>
                  <th className="px-2.5 py-2 text-left text-[11px]">Last login</th>
                  <th className="px-2.5 py-2 text-left text-[11px]">Role</th>
                  <th className="px-2.5 py-2 text-left text-[11px]">Workspaces</th>
                  <th className="px-2.5 py-2 text-left text-[11px]">Status</th>
                  <th className="px-2.5 py-2 text-right text-[11px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-ink-muted">Loading members…</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-ink-muted">No members found.</td></tr>
                ) : (
                  filteredUsers.map((u) => {
                    const currentWs = (u.workspaces || []).map((w) => w.id)
                    return (
                      <tr
                        key={u.id}
                        className="group cursor-pointer border-t border-surface-border transition-colors hover:bg-brand-50/40"
                        onClick={() => navigate(`/team/${u.id}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            navigate(`/team/${u.id}`)
                          }
                        }}
                      >
                        <td className="px-2.5 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-surface-border bg-brand-50 text-[11px] font-semibold text-brand-700">
                              {u.profilePhotoUrl ? (
                                <img src={u.profilePhotoUrl} alt={u.name || 'User'} className="h-full w-full object-cover" />
                              ) : (
                                <span>{(u.name || u.email || '?').trim().charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-ink group-hover:text-brand-700">{u.name || 'Unnamed user'}</p>
                              <p className="text-xs text-ink-faint">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2.5 py-2 text-ink-muted">{u.jobTitle || '—'}</td>
                        <td className="px-2.5 py-2 text-ink-muted">{u.department || '—'}</td>
                        <td className="px-2.5 py-2 text-ink-muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</td>
                        <td className="px-2.5 py-2 text-ink-muted">{u.companyRole?.name || 'No role'}</td>
                        <td className="px-2.5 py-2">
                          <WorkspacePills selectedIds={currentWs} all={workspaces} />
                        </td>
                        <td className="px-2.5 py-2">
                          <span className={cn('rounded-full border px-2 py-0.5 text-xs', u.isActive ? 'border-emerald-200 bg-white text-emerald-700' : 'border-surface-border bg-white text-ink-muted')}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex gap-1 opacity-100 transition">
                            <button
                              type="button"
                              disabled={userBusy || !u.isActive}
                              onClick={(e) => {
                                e.stopPropagation()
                                openAccessDrawer(u)
                              }}
                              aria-label="Edit workspace access"
                              title={!u.isActive ? 'Inactive users cannot be edited' : 'Edit workspace access'}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-white text-brand-700 shadow-sm hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <PencilLine className="h-3.5 w-3.5" />
                            </button>
                            {u.isActive ? (
                              <button
                                type="button"
                                disabled={userBusy}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  doDeactivate(u)
                                }}
                                aria-label="Deactivate user"
                                title="Deactivate user"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-danger hover:bg-red-100"
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
        ) : null}

        {activeTab === 'invitations' ? (
        <section className="overflow-hidden rounded-xl border border-surface-border bg-white">
            <div className="p-4">
              {invitesLoading ? (
                <p className="text-sm text-ink-muted">Loading invites…</p>
              ) : invitations.length === 0 ? (
                <p className="text-sm text-ink-muted">No pending invitations.</p>
              ) : (
                <ul className="space-y-2">
                  {invitations.map((inv) => (
                    <li
                      key={inv.id}
                      className="rounded-2xl border border-surface-border bg-white p-4 shadow-sm transition hover:border-surface-border"
                    >
                      <p className="text-sm font-semibold text-ink">{inv.email}</p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {inv.companyRole?.name || 'Role pending'} · Expires {new Date(inv.expiresAt).toLocaleString()}
                      </p>
                      {hasInviteProfilePrefill(inv.profilePrefill) ? (
                        <p className="mt-2 rounded-lg border border-surface-border bg-white px-2.5 py-1.5 text-[11px] font-medium leading-snug text-ink-muted">
                          Profile details included — they’ll be applied when they accept the invite and finish signup.
                        </p>
                      ) : null}
                      <button
                        type="button"
                        disabled={cancellingInvite}
                        onClick={() => setCancelInviteDialog({ open: true, invite: inv })}
                        aria-label="Cancel invite"
                        title="Cancel invite"
                        className="mt-2 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-danger hover:bg-red-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
        </section>
        ) : null}

        {activeTab === 'roles' ? (
        <section className="overflow-hidden rounded-xl border border-surface-border bg-white">
            <div className="overflow-x-auto">
              {roles.length === 0 ? (
                <p className="px-4 py-6 text-sm text-ink-muted">No custom roles yet.</p>
              ) : (
                <table className="w-full min-w-[860px] text-xs">
                  <thead className="sticky top-0 z-10 bg-white text-ink-muted">
                    <tr>
                      <th className="px-2.5 py-2 text-left text-[11px]">Role</th>
                      <th className="px-2.5 py-2 text-left text-[11px]">Description</th>
                      <th className="px-2.5 py-2 text-left text-[11px]">
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Menus
                        </span>
                      </th>
                      <th className="px-2.5 py-2 text-left text-[11px]">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          Users
                        </span>
                      </th>
                      <th className="px-2.5 py-2 text-right text-[11px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((r) => (
                      <tr key={r.id} className="group border-t border-surface-border hover:bg-white">
                        <td className="px-2.5 py-2">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-ink">{r.name}</p>
                            {r.isDefault ? (
                              <span className="rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px] text-ink-muted">
                                Default
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-2.5 py-2 text-ink-muted">{r.description || 'No description'}</td>
                        <td className="px-2.5 py-2">
                          <span className="rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px] text-ink-muted">
                            {r.menuCount || 0}
                          </span>
                        </td>
                        <td className="px-2.5 py-2">
                          <span className="rounded-full border border-surface-border bg-white px-2 py-0.5 text-[11px] text-ink-muted">
                            {r.assignedUsers || 0}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 text-right">
                          <div className="inline-flex gap-1 opacity-100 transition">
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
                                  menuPermissions: r.menuPermissions || [],
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
                              onClick={async () => {
                                setDeleteRoleDialog({
                                  open: true,
                                  roleId: r.id,
                                  roleName: r.name,
                                  fallbackRoleId: roles.find((x) => x.id !== r.id && !x.isDefault)?.id || roles.find((x) => x.id !== r.id)?.id || '',
                                })
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
        </section>
        ) : null}

      </div>

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
              className="h-10 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="h-10 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 disabled:opacity-60"
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
            <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Workspaces</label>
            <div className="flex flex-wrap gap-2">
              {workspaces.map((w) => {
                const active = inviteForm.workspaceIds.includes(w.id)
                return (
                  <button
                    key={w.id}
                    type="button"
                    disabled={inviteBusy}
                    onClick={() =>
                      setInviteForm((f) => ({
                        ...f,
                        workspaceIds: active ? f.workspaceIds.filter((id) => id !== w.id) : [...f.workspaceIds, w.id],
                      }))
                    }
                    className={workspaceChipClass(active, { disabled: inviteBusy })}
                  >
                    {w.name}
                  </button>
                )
              })}
            </div>
          </DrawerSection>
        </form>
      </RightDrawer>

      <RightDrawer
        open={roleEditDrawerOpen}
        onClose={() => setRoleEditDrawerOpen(false)}
        title="Edit role"
        description="Update role details and menu access."
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
                try {
                  await patchRole({
                    id: editingRoleId,
                    name: roleForm.name.trim(),
                    description: roleForm.description.trim() || null,
                    menuPermissions: roleForm.menuPermissions.length ? roleForm.menuPermissions : undefined,
                  }).unwrap()
                  toast.success('Role updated')
                  setRoleEditDrawerOpen(false)
                } catch (err) {
                  toast.error(apiErrorMessage(err))
                }
              }}
              className="h-10 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white"
            >
              {patchingRoleMeta ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        }
      >
        <div className="flex h-full min-h-0 flex-col gap-4">
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
          <div className="flex min-h-0 flex-1 flex-col">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Allowed sidebar menus</label>
            {renderMenuPermissionPicker()}
          </div>
        </div>
      </RightDrawer>

      <RightDrawer
        open={roleDrawerOpen}
        onClose={() => setRoleDrawerOpen(false)}
        title="Create custom role"
        description="Define role name and choose sidebar menus this role can access."
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRoleDrawerOpen(false)} className="h-10 rounded-xl border border-surface-border px-4 text-sm">
              Cancel
            </button>
            <button
              type="button"
              disabled={creatingRole}
              onClick={async () => {
                if (!roleForm.name.trim()) return toast.error('Role name is required')
                if (!roleForm.menuPermissions.length) return toast.error('Select at least one menu permission')
                try {
                  await createRole({
                    name: roleForm.name.trim(),
                    description: roleForm.description.trim() || null,
                    menuPermissions: roleForm.menuPermissions,
                  }).unwrap()
                  toast.success('Role created')
                  setRoleForm({ name: '', description: '', menuPermissions: [] })
                  setRoleDrawerOpen(false)
                } catch (err) {
                  toast.error(apiErrorMessage(err))
                }
              }}
              className="h-10 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white"
            >
              {creatingRole ? 'Creating…' : 'Create role'}
            </button>
          </div>
        }
      >
        <div className="flex h-full min-h-0 flex-col gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Role name</label>
            <input
              type="text"
              value={roleForm.name}
              onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-surface-border bg-white px-3 py-2 text-sm"
              placeholder="e.g. SDR"
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
          <div className="flex min-h-0 flex-1 flex-col">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Allowed sidebar menus</label>
            {renderMenuPermissionPicker()}
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
