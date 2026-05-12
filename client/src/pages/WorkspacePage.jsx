import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import { Archive, ArchiveRestore, Building2, CheckCircle2, IdCard, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Modal } from '@/components/ui/Modal'
import { RightDrawer } from '@/components/ui/RightDrawer'
import {
  useCreateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  usePatchWorkspaceMutation,
  useWorkspacesQuery,
} from '@/features/workspace/workspaceApi'
import { cn } from '@/utils/cn'
import { WorkspaceCompanyTab } from '@/pages/workspace/WorkspaceCompanyTab'

const DESCRIPTION_MAX = 199

const SETTINGS_TABS = [
  { id: 'workspaces', label: 'Workspaces', icon: Building2 },
  { id: 'company', label: 'Company information', icon: IdCard },
]

function apiErrorMessage(err) {
  return err?.data?.error?.message ?? err?.error ?? 'Something went wrong'
}

function WorkspaceTableRow({ row, busy, onEdit, onToggleArchive, onDelete }) {
  const archived = Boolean(row.archived)
  return (
    <tr
      className={cn('group border-b border-surface-border transition-colors last:border-b-0 hover:bg-brand-50', archived ? 'text-ink-muted' : '')}
    >
      <td className="max-w-[280px] px-2.5 py-2 sm:max-w-[360px]">
        <div className="flex items-start gap-2">
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
              archived ? 'bg-surface-border/50 text-ink-faint' : 'bg-surface-subtle text-brand-600',
            )}
          >
            <Building2 className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className={cn('font-medium', archived ? 'text-ink-faint' : 'text-ink')}>{row.name}</p>
            {row.description ? (
              <p
                className={cn(
                  'mt-0.5 line-clamp-2 text-xs leading-snug',
                  archived ? 'text-ink-faint' : 'text-ink-muted',
                )}
              >
                {row.description}
              </p>
            ) : null}
          </div>
        </div>
      </td>
      <td className={cn('px-2.5 py-2 tabular-nums', archived ? 'text-ink-faint' : 'text-ink-muted')}>
        {row.leadCount}
      </td>
      <td className="px-2.5 py-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 tabular-nums',
            archived ? 'text-ink-faint' : 'text-ink-muted',
          )}
        >
          <Users className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
          {row.memberCount}
        </span>
      </td>
      <td className="px-2.5 py-2">
        <span
          className={cn(
            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
            archived ? 'bg-surface-border/40 text-ink-faint' : 'bg-brand-50 text-brand-800',
          )}
        >
          {archived ? 'Archived' : 'Active'}
        </span>
      </td>
      <td className="px-2.5 py-2">
        <div className="flex items-center justify-end gap-1 opacity-100 transition">
          <button
            type="button"
            disabled={busy}
            onClick={() => onEdit(row)}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 transition hover:bg-brand-100 disabled:opacity-50',
              archived
                ? 'border-surface-border bg-surface-muted text-ink-faint hover:bg-surface-muted/80'
                : '',
            )}
            aria-label="Edit workspace"
            title="Edit workspace"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onToggleArchive(row)}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 transition hover:bg-brand-100 disabled:opacity-50',
              archived
                ? 'border-surface-border bg-surface-muted text-ink-faint hover:bg-surface-muted/80'
                : '',
            )}
            aria-label={archived ? 'Restore workspace' : 'Archive workspace'}
            title={archived ? 'Restore workspace' : 'Archive workspace'}
          >
            {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(row)}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-danger transition hover:bg-red-100 disabled:opacity-50',
              archived ? 'text-danger/70' : '',
            )}
            aria-label="Delete workspace"
            title="Delete workspace"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </td>
    </tr>
  )
}

export function WorkspacePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const settingsTab = searchParams.get('tab') === 'company' ? 'company' : 'workspaces'

  const setSettingsTab = (id) => {
    const next = new URLSearchParams(searchParams)
    if (id === 'workspaces') next.delete('tab')
    else next.set('tab', id)
    setSearchParams(next, { replace: true })
  }

  const { data, isLoading, isError, error, refetch } = useWorkspacesQuery()
  const [createWorkspace, { isLoading: creating }] = useCreateWorkspaceMutation()
  const [patchWorkspace, { isLoading: patching }] = usePatchWorkspaceMutation()
  const [deleteWorkspace, { isLoading: deleting }] = useDeleteWorkspaceMutation()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState('create')
  const [editingId, setEditingId] = useState(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [deleteDialog, setDeleteDialog] = useState({ open: false, row: null })

  const items = data?.data?.items

  /** Single list: active rows first, archived at bottom of the same table. */
  const orderedRows = useMemo(() => {
    const list = Array.isArray(items) ? items : []
    const active = []
    const archived = []
    for (const w of list) {
      if (w.archived) archived.push(w)
      else active.push(w)
    }
    return statusFilter === 'archived' ? archived : active
  }, [items, statusFilter])

  function closeDrawer() {
    setDrawerOpen(false)
    setDrawerMode('create')
    setEditingId(null)
    setFormName('')
    setFormDescription('')
  }

  function openCreate() {
    setDrawerMode('create')
    setEditingId(null)
    setFormName('')
    setFormDescription('')
    setDrawerOpen(true)
  }

  function openEdit(row) {
    setDrawerMode('edit')
    setEditingId(row.id)
    setFormName(row.name ?? '')
    setFormDescription(row.description ?? '')
    setDrawerOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const name = formName.trim()
    if (!name) {
      toast.error('Enter a workspace name')
      return
    }
    const descTrim = formDescription.trim()
    try {
      if (drawerMode === 'edit' && editingId) {
        await patchWorkspace({
          id: editingId,
          name,
          description: descTrim || null,
        }).unwrap()
        toast.success('Workspace updated')
      } else {
        await createWorkspace({
          name,
          ...(descTrim ? { description: descTrim } : {}),
        }).unwrap()
        toast.success('Workspace created')
      }
      closeDrawer()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  async function toggleArchive(row) {
    try {
      await patchWorkspace({ id: row.id, archived: !row.archived }).unwrap()
      toast.success(row.archived ? 'Workspace restored' : 'Workspace archived')
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  async function removeWorkspace(row) {
    setDeleteDialog({ open: true, row })
  }

  async function confirmDeleteWorkspace() {
    if (!deleteDialog.row) return
    try {
      await deleteWorkspace(deleteDialog.row.id).unwrap()
      toast.success('Workspace deleted')
      setDeleteDialog({ open: false, row: null })
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  const busy = patching || deleting
  const saving = (drawerMode === 'create' && creating) || (drawerMode === 'edit' && patching)

  return (
    <PageShell fullWidth>
      <div className="space-y-4 px-2 py-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-border bg-white/90 px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Workspace settings">
            {SETTINGS_TABS.map((t) => {
              const Icon = t.icon
              const active = settingsTab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSettingsTab(t.id)}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition',
                    active
                      ? 'border-brand-200 bg-brand-50 text-brand-700'
                      : 'border-surface-border bg-surface-subtle text-ink-muted hover:bg-surface-muted',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t.label}
                </button>
              )
            })}
          </div>

          {settingsTab === 'workspaces' ? (
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                aria-label="Show active workspaces"
                title="Active workspaces"
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition',
                  statusFilter === 'active'
                    ? 'border-brand-200 bg-brand-50 text-brand-700'
                    : 'border-surface-border bg-surface-subtle text-ink-muted hover:bg-surface-muted',
                )}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('archived')}
                aria-label="Show archived workspaces"
                title="Archived workspaces"
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition',
                  statusFilter === 'archived'
                    ? 'border-brand-200 bg-brand-50 text-brand-700'
                    : 'border-surface-border bg-surface-subtle text-ink-muted hover:bg-surface-muted',
                )}
              >
                <Archive className="h-4 w-4" aria-hidden />
                Archived
              </button>
              <button
                type="button"
                onClick={openCreate}
                aria-label="New workspace"
                title="New workspace"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-medium text-brand-700 hover:bg-brand-100"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add workspace
              </button>
            </div>
          ) : (
            <p className="max-w-md text-right text-xs leading-snug text-ink-muted">
              Company profile applies to the workspace currently selected in the header.
            </p>
          )}
        </div>

        {settingsTab === 'company' ? <WorkspaceCompanyTab /> : null}

        {settingsTab === 'workspaces' ? (
          <>
        {isError ? (
          <div className="rounded-xl border border-surface-border bg-white/90 p-4 text-sm text-ink-muted">
            {apiErrorMessage(error)}
            <button type="button" className="ml-3 font-medium text-brand-600 hover:underline" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-surface-border bg-white">
          <div className="scrollbar-subtle overflow-x-auto">
            <table className="w-full min-w-[840px] border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-surface-border/70">
                  <th className="px-2.5 py-2 text-[11px] font-semibold text-ink-muted">Workspace</th>
                  <th className="px-2.5 py-2 text-[11px] font-semibold text-ink-muted">Leads</th>
                  <th className="px-2.5 py-2 text-[11px] font-semibold text-ink-muted">Team</th>
                  <th className="px-2.5 py-2 text-[11px] font-semibold text-ink-muted">Status</th>
                  <th className="px-2.5 py-2 text-right text-[11px] font-semibold text-ink-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-ink-muted">
                      Loading workspaces…
                    </td>
                  </tr>
                ) : !Array.isArray(items) || orderedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-ink-muted">
                      {statusFilter === 'archived'
                        ? 'No archived workspaces.'
                        : 'No active workspaces yet. Create one to get started.'}
                    </td>
                  </tr>
                ) : (
                  orderedRows.map((row) => (
                    <WorkspaceTableRow
                      key={row.id}
                      row={row}
                      busy={busy}
                      onEdit={openEdit}
                      onToggleArchive={toggleArchive}
                      onDelete={removeWorkspace}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
          </>
        ) : null}
      </div>

      <RightDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={drawerMode === 'edit' ? 'Edit workspace' : 'New workspace'}
        description={
          drawerMode === 'edit'
            ? 'Update the name or description. Descriptions can be up to 199 characters.'
            : 'Add a name and optional description (up to 199 characters). You can archive or edit anytime.'
        }
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeDrawer}
              className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink-muted transition hover:bg-surface-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="workspace-form"
              disabled={saving}
              className="h-10 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? (drawerMode === 'edit' ? 'Saving…' : 'Creating…') : drawerMode === 'edit' ? 'Save changes' : 'Create workspace'}
            </button>
          </div>
        }
      >
        <form id="workspace-form" className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="ws-name" className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Name
            </label>
            <input
              id="ws-name"
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              maxLength={240}
              placeholder="e.g. Enterprise accounts"
              className="mt-2 w-full rounded-xl border border-surface-border bg-surface-muted/40 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/15"
              autoFocus
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="ws-description" className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Description
              </label>
              <span className="text-[10px] tabular-nums text-ink-faint">
                {formDescription.length}/{DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              id="ws-description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
              rows={4}
              maxLength={DESCRIPTION_MAX}
              placeholder="What this workspace is for (optional)"
              className="mt-2 w-full resize-y rounded-xl border border-surface-border bg-surface-muted/40 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/15"
            />
          </div>
          {drawerMode === 'create' ? (
            <p className="rounded-xl bg-surface-subtle px-4 py-3 text-xs leading-relaxed text-ink-muted">
              Create flows use this side panel instead of a centered modal so you keep context on the page behind.
            </p>
          ) : null}
        </form>
      </RightDrawer>

      <Modal
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, row: null })}
        title="Delete workspace"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteDialog({ open: false, row: null })}
              className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink-muted transition hover:bg-surface-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteWorkspace}
              disabled={deleting}
              className="h-10 rounded-xl bg-danger px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete workspace'}
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Delete <span className="font-medium text-ink">{deleteDialog.row?.name}</span>? This cannot be undone.
        </p>
      </Modal>
    </PageShell>
  )
}
