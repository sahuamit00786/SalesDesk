import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { PencilLine, ShieldCheck, Trash2, UserMinus, UserPlus, Users, X } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Modal } from '@/components/ui/Modal'
import { RightDrawer } from '@/components/ui/RightDrawer'
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
  useReplaceUserWorkspacesMutation,
  useTeamInvitationsQuery,
  useTeamRolesQuery,
  useTeamUsersQuery,
} from '@/features/team/teamApi'
import { cn } from '@/utils/cn'

const TEAM_TAB_STORAGE_KEY = 'leadflow.team.activeTab'

function apiErrorMessage(err) {
  return err?.data?.error?.message ?? err?.error ?? 'Something went wrong'
}

function WorkspacePills({ selectedIds, all }) {
  if (!selectedIds?.length) return <span className="block text-xs text-ink-faint">No workspace</span>
  const selected = all.filter((w) => selectedIds.includes(w.id))
  return (
    <div className="flex flex-wrap gap-1">
      {selected.map((w) => (
        <span key={w.id} className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-ink-muted">
          {w.name}
        </span>
      ))}
    </div>
  )
}

export function TeamPage() {
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
  const [inviteForm, setInviteForm] = useState({ email: '', companyRoleId: '', workspaceIds: [] })
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
  const [deactivateDialog, setDeactivateDialog] = useState({ open: false, user: null })
  const [cancelInviteDialog, setCancelInviteDialog] = useState({ open: false, invite: null })

  const inviteBusy = creatingInvite
  const userBusy = patchingRole || patchingWorkspaces || deactivatingUser

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
                              ? 'border-brand-300 bg-brand-50 text-brand-800'
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
    setInviteForm({ email: '', companyRoleId: '', workspaceIds: [] })
  }

  async function submitInvite(e) {
    e.preventDefault()
    if (!inviteForm.email.trim()) return toast.error('Enter an email')
    if (!inviteForm.companyRoleId) return toast.error('Choose a role')
    if (!inviteForm.workspaceIds.length) return toast.error('Assign at least one workspace')
    try {
      await createInvitation({
        email: inviteForm.email.trim(),
        companyRoleId: inviteForm.companyRoleId,
        workspaceIds: inviteForm.workspaceIds,
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
    setAccessDrawerOpen(true)
  }

  function closeAccessDrawer() {
    setAccessDrawerOpen(false)
    setAccessUserId(null)
    setAccessRoleId('')
    setAccessWorkspaceIds([])
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
      if (!accessUser.isCompanyAdmin && accessRoleId && accessRoleId !== (accessUser.companyRole?.id ?? '')) {
        await patchUserRole({ id: accessUser.id, companyRoleId: accessRoleId }).unwrap()
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
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-border bg-white/90 px-3 py-2">
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
                  'h-8 rounded-lg px-3 text-xs font-medium transition',
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-subtle text-ink-muted hover:bg-surface-muted',
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
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-medium text-brand-700 hover:bg-brand-100"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Create role
            </button>
            <button
              type="button"
              onClick={() => setInviteDrawerOpen(true)}
              aria-label="Add user"
              title="Add user"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-medium text-brand-700 hover:bg-brand-100"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add user
            </button>
          </div>
        </div>

        {activeTab === 'members' ? (
          <section className="rounded-xl border border-surface-border bg-white/90 px-4 py-3">
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
          <div className="border-b border-surface-border px-5 py-3">
            <h2 className="font-medium text-ink">Members</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-xs">
              <thead className="sticky top-0 z-10 bg-white text-ink-muted">
                <tr>
                  <th className="px-2.5 py-2 text-left text-[11px]">Name</th>
                  <th className="px-2.5 py-2 text-left text-[11px]">Role</th>
                  <th className="px-2.5 py-2 text-left text-[11px]">Workspaces</th>
                  <th className="px-2.5 py-2 text-left text-[11px]">Status</th>
                  <th className="px-2.5 py-2 text-right text-[11px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-ink-muted">Loading members…</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-ink-muted">No members found.</td></tr>
                ) : (
                  filteredUsers.map((u) => {
                    const currentWs = (u.workspaces || []).map((w) => w.id)
                    return (
                      <tr key={u.id} className="group border-t border-surface-border hover:bg-brand-50">
                        <td className="px-2.5 py-2">
                          <p className="font-medium text-ink">{u.name || 'Unnamed user'}</p>
                          <p className="text-xs text-ink-faint">{u.email}</p>
                        </td>
                        <td className="px-2.5 py-2 text-ink-muted">{u.companyRole?.name || 'No role'}</td>
                        <td className="px-2.5 py-2">
                          <WorkspacePills selectedIds={currentWs} all={workspaces} />
                        </td>
                        <td className="px-2.5 py-2">
                          <span className={cn('rounded-full px-2 py-0.5 text-xs', u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-muted text-ink-muted')}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 text-right">
                          <div className="inline-flex gap-1 opacity-100 transition">
                            <button
                              type="button"
                              disabled={userBusy || !u.isActive}
                              onClick={() => openAccessDrawer(u)}
                              aria-label="Edit workspace access"
                              title={!u.isActive ? 'Inactive users cannot be edited' : 'Edit workspace access'}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="border-b border-surface-border px-5 py-3">
              <h2 className="font-medium text-ink">Pending invitations</h2>
            </div>
            <div className="p-4">
              {invitesLoading ? (
                <p className="text-sm text-ink-muted">Loading invites…</p>
              ) : invitations.length === 0 ? (
                <p className="text-sm text-ink-muted">No pending invitations.</p>
              ) : (
                <ul className="space-y-2">
                  {invitations.map((inv) => (
                    <li key={inv.id} className="rounded-xl border border-surface-border p-3">
                      <p className="text-sm font-medium text-ink">{inv.email}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {inv.companyRole?.name || 'Role pending'} · Expires {new Date(inv.expiresAt).toLocaleString()}
                      </p>
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
        <section className="overflow-hidden rounded-xl border border-surface-border bg-white/90">
            <div className="border-b border-surface-border px-5 py-3">
              <h2 className="font-medium text-ink">Roles</h2>
            </div>
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
                      <tr key={r.id} className="group border-t border-surface-border hover:bg-brand-50">
                        <td className="px-2.5 py-2">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-ink">{r.name}</p>
                            {r.isDefault ? (
                              <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-ink-muted">
                                Default
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-2.5 py-2 text-ink-muted">{r.description || 'No description'}</td>
                        <td className="px-2.5 py-2">
                          <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-ink-muted">
                            {r.menuCount || 0}
                          </span>
                        </td>
                        <td className="px-2.5 py-2">
                          <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-ink-muted">
                            {r.assignedUsers || 0}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 text-right">
                          <div className="inline-flex gap-1 opacity-100 transition">
                            <button
                              type="button"
                              aria-label="Edit role"
                              title={r.isDefault ? 'Default role cannot be edited' : 'Edit role'}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
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
        title="Edit member access"
        description={
          accessUser
            ? `Update role and workspace access for ${accessUser.name || accessUser.email}.`
            : 'Update role and workspace access for this member.'
        }
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeAccessDrawer}
              className="h-10 rounded-xl border border-surface-border px-4 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={patchingWorkspaces || patchingRole}
              onClick={saveAccessChanges}
              className="h-10 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white"
            >
              {patchingWorkspaces || patchingRole ? 'Saving…' : 'Save access'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Name</label>
            <input
              type="text"
              value={accessUser?.name || ''}
              readOnly
              className="mt-2 h-10 w-full rounded-xl border border-surface-border bg-surface-muted px-3 text-sm text-ink-muted"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Role</label>
            <select
              value={accessRoleId}
              onChange={(e) => setAccessRoleId(e.target.value)}
              disabled={patchingWorkspaces || patchingRole || accessUser?.isCompanyAdmin}
              className="mt-2 h-10 w-full rounded-xl border border-surface-border bg-white px-3 text-sm disabled:cursor-not-allowed disabled:bg-surface-muted"
            >
              <option value="">Select role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {accessUser?.isCompanyAdmin ? (
              <p className="mt-1 text-[11px] text-ink-faint">Company admin role cannot be changed.</p>
            ) : null}
          </div>
          <p className="text-xs text-ink-muted">Select one or more workspaces.</p>
          <div className="flex flex-wrap gap-2">
            {workspaces.map((w) => {
              const active = accessWorkspaceIds.includes(w.id)
              return (
                <button
                  key={w.id}
                  type="button"
                  disabled={patchingWorkspaces}
                  onClick={() => toggleDraftWorkspace(w.id)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs',
                    active
                      ? 'border-brand-300 bg-brand-50 text-brand-800'
                      : 'border-surface-border bg-white text-ink-muted',
                  )}
                >
                  {w.name}
                </button>
              )
            })}
          </div>
        </div>
      </RightDrawer>

      <RightDrawer
        open={inviteDrawerOpen}
        onClose={closeInviteDrawer}
        title="Invite team member"
        description="Add email, role, and workspace access. The user receives a secure email invitation."
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeInviteDrawer} className="h-10 rounded-xl border border-surface-border px-4 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              form="invite-member-form"
              disabled={inviteBusy}
              className="h-10 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white"
            >
              {inviteBusy ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        }
      >
        <form id="invite-member-form" className="space-y-4" onSubmit={submitInvite}>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Email</label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="name@company.com"
              className="mt-2 w-full rounded-xl border border-surface-border bg-surface-muted/40 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Role</label>
            <select
              value={inviteForm.companyRoleId}
              onChange={(e) => setInviteForm((f) => ({ ...f, companyRoleId: e.target.value }))}
              className="mt-2 h-10 w-full rounded-xl border border-surface-border bg-white px-3 text-sm"
            >
              <option value="">Select role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Workspace access</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {workspaces.map((w) => {
                const active = inviteForm.workspaceIds.includes(w.id)
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() =>
                      setInviteForm((f) => ({
                        ...f,
                        workspaceIds: active
                          ? f.workspaceIds.filter((id) => id !== w.id)
                          : [...f.workspaceIds, w.id],
                      }))
                    }
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs',
                      active ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-surface-border bg-white text-ink-muted',
                    )}
                  >
                    {w.name}
                  </button>
                )
              })}
            </div>
          </div>
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
              className="mt-2 w-full rounded-xl border border-surface-border bg-surface-muted/40 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Description</label>
            <textarea
              rows={3}
              value={roleForm.description}
              onChange={(e) => setRoleForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-surface-border bg-surface-muted/40 px-3 py-2 text-sm"
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
              className="mt-2 w-full rounded-xl border border-surface-border bg-surface-muted/40 px-3 py-2 text-sm"
              placeholder="e.g. SDR"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Description</label>
            <textarea
              rows={3}
              value={roleForm.description}
              onChange={(e) => setRoleForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-surface-border bg-surface-muted/40 px-3 py-2 text-sm"
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
              className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink-muted hover:bg-surface-muted"
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
              className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink-muted hover:bg-surface-muted"
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
              className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink-muted hover:bg-surface-muted"
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
