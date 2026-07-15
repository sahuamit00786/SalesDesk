import { useEffect, useMemo, useState, useRef } from 'react'
import { useAppSelector } from '@/app/hooks'
import { DataGrid } from '@/components/shared/DataGrid'
import toast from 'react-hot-toast'

function selectIsCompanyAdmin(state) {
  return state.auth.user?.isCompanyAdmin ?? false
}
import { Archive, ArchiveRestore, AlignLeft, Building2, CheckCircle2, Pencil, Plus, Trash2, Users, Settings } from '@/components/ui/icons'
import { Modal } from '@/components/ui/Modal'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { IconInput, IconTextarea } from '@/components/ui/IconInput'
import { CurrencyPicker } from '@/components/shared/CurrencyPicker'
import {
  useCreateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  usePatchWorkspaceMutation,
  useWorkspacesQuery,
} from '@/features/workspace/workspaceApi'
import { selectEffectiveCurrency } from '@/features/workspace/workspaceSlice'
import { cn } from '@/utils/cn'
import { darkenHex } from '@/hooks/useWorkspaceTheme'

const DESCRIPTION_MAX = 199

function applyThemePreview(hex) {
  document.documentElement.style.setProperty('--brand-primary', hex)
  document.documentElement.style.setProperty('--brand-primary-dark', darkenHex(hex))
}

function applySidebarTextPreview(hex) {
  document.documentElement.style.setProperty('--sidebar-text', hex)
}

function resolveHex(val, cssVar, fallback) {
  if (val && /^#[0-9A-Fa-f]{6}$/.test(val)) return val
  const computed = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim()
  return /^#[0-9A-Fa-f]{6}$/.test(computed) ? computed : fallback
}

function apiErrorMessage(err) {
  return err?.data?.error?.message ?? err?.error ?? 'Something went wrong'
}

function ThemeColorField({ id, value, onCommit, applyPreview }) {
  const [local, setLocal] = useState(value)
  const [prevValue, setPrevValue] = useState(value)
  const inputRef = useRef(null)
  const rafRef = useRef(0)

  if (value !== prevValue) {
    setPrevValue(value)
    setLocal(value)
  }

  useEffect(() => {
    const el = inputRef.current
    if (!el) return undefined
    const commit = (e) => onCommit(e.target.value)
    el.addEventListener('change', commit)
    return () => {
      el.removeEventListener('change', commit)
      cancelAnimationFrame(rafRef.current)
    }
  }, [onCommit])

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        id={id}
        type="color"
        value={local}
        onChange={(e) => {
          const next = e.target.value
          setLocal(next)
          cancelAnimationFrame(rafRef.current)
          rafRef.current = requestAnimationFrame(() => applyPreview(next))
        }}
        className="h-10 w-10 cursor-pointer rounded-lg border border-surface-border p-0.5"
      />
      <span className="font-mono text-xs text-ink-muted">{local}</span>
    </div>
  )
}

export function WorkspaceManagementModal({ open, onClose }) {
  const isCompanyAdmin = useAppSelector(selectIsCompanyAdmin)

  if (!isCompanyAdmin) return null

  const { data, isLoading, isError, error, refetch } = useWorkspacesQuery()
  const [createWorkspace, { isLoading: creating }] = useCreateWorkspaceMutation()
  const [patchWorkspace, { isLoading: patching }] = usePatchWorkspaceMutation()
  const [deleteWorkspace, { isLoading: deleting }] = useDeleteWorkspaceMutation()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState('create')
  const [editingId, setEditingId] = useState(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formThemeColor, setFormThemeColor] = useState('#5b21b6')
  const [formSidebarText, setFormSidebarText] = useState('#ffffff')
  const [formDefaultCurrency, setFormDefaultCurrency] = useState('USD')
  const [statusFilter, setStatusFilter] = useState('active')
  const companyBaseCurrency = useAppSelector(selectEffectiveCurrency)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, row: null })

  const items = data?.data?.items

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
    setFormThemeColor('#5b21b6')
    setFormSidebarText('#ffffff')
    setFormDefaultCurrency(companyBaseCurrency)
  }

  function openCreate() {
    setDrawerMode('create')
    setEditingId(null)
    setFormName('')
    setFormDescription('')
    setFormThemeColor('#5b21b6')
    setFormSidebarText('#ffffff')
    setFormDefaultCurrency(companyBaseCurrency)
    setDrawerOpen(true)
  }

  function openEdit(row) {
    setDrawerMode('edit')
    setEditingId(row.id)
    setFormName(row.name ?? '')
    setFormDescription(row.description ?? '')
    setFormThemeColor(resolveHex(row.themeColor, '--brand-primary', '#5b21b6'))
    setFormSidebarText(resolveHex(row.sidebarTextColor, '--sidebar-text', '#ffffff'))
    setFormDefaultCurrency(row.defaultCurrency || companyBaseCurrency)
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
          themeColor: formThemeColor,
          sidebarTextColor: formSidebarText,
          defaultCurrency: formDefaultCurrency,
        }).unwrap()
        toast.success('Workspace updated')
      } else {
        await createWorkspace({
          name,
          ...(descTrim ? { description: descTrim } : {}),
          defaultCurrency: formDefaultCurrency,
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

  const workspaceColumns = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Workspace',
        flex: 1,
        minWidth: 200,
        renderCell: ({ row }) => {
          const archived = Boolean(row.archived)
          return (
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
          )
        },
      },
      {
        field: 'leadCount',
        headerName: 'Leads',
        width: 90,
        renderCell: ({ row }) => (
          <span className={cn('tabular-nums', row.archived ? 'text-ink-faint' : 'text-ink-muted')}>
            {row.leadCount}
          </span>
        ),
      },
      {
        field: 'memberCount',
        headerName: 'Team',
        width: 90,
        renderCell: ({ row }) => (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 tabular-nums',
              row.archived ? 'text-ink-faint' : 'text-ink-muted',
            )}
          >
            <Users className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
            {row.memberCount}
          </span>
        ),
      },
      {
        field: 'archived',
        headerName: 'Status',
        width: 100,
        renderCell: ({ row }) => (
          <span
            className={cn(
              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
              row.archived ? 'bg-surface-border/40 text-ink-faint' : 'bg-slate-100 text-brand-800',
            )}
          >
            {row.archived ? 'Archived' : 'Active'}
          </span>
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 140,
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }) => {
          const archived = Boolean(row.archived)
          return (
            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                disabled={busy}
                onClick={() => openEdit(row)}
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-200 bg-white text-brand-700 hover:bg-slate-100 disabled:opacity-50',
                  archived && 'border-surface-border bg-surface-muted text-ink-faint',
                )}
                aria-label="Edit workspace"
                title="Edit workspace"
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => toggleArchive(row)}
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-200 bg-white text-brand-700 hover:bg-slate-100 disabled:opacity-50',
                  archived && 'border-surface-border bg-surface-muted text-ink-faint',
                )}
                aria-label={archived ? 'Restore workspace' : 'Archive workspace'}
                title={archived ? 'Restore workspace' : 'Archive workspace'}
              >
                {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => removeWorkspace(row)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-danger hover:bg-red-100 disabled:opacity-50"
                aria-label="Delete workspace"
                title="Delete workspace"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )
        },
      },
    ],
    [busy],
  )

  return (
    <>
      <Modal open={open} onClose={onClose} title="Workspace settings" maxWidthClassName="max-w-4xl" maxHeightClassName="max-h-[95vh]">
        <div className="space-y-4 overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                aria-label="Show active workspaces"
                title="Active workspaces"
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition',
                  statusFilter === 'active'
                    ? 'border-brand-200 bg-white text-brand-700'
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
                    ? 'border-brand-200 bg-white text-brand-700'
                    : 'border-surface-border bg-surface-subtle text-ink-muted hover:bg-surface-muted',
                )}
              >
                <Archive className="h-4 w-4" aria-hidden />
                Archived
              </button>
            </div>

            <button
              type="button"
              onClick={openCreate}
              aria-label="New workspace"
              title="New workspace"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 text-xs font-medium text-brand-700 hover:bg-slate-100"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add workspace
            </button>
          </div>

          {isError ? (
            <div className="rounded-xl border border-surface-border bg-white/90 p-4 text-sm text-ink-muted">
              {apiErrorMessage(error)}
              <button type="button" className="ml-3 font-medium text-brand-600 hover:underline" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          ) : null}

          <div className="h-[60vh] flex flex-col">
            <DataGrid
              gridColumns
              columns={workspaceColumns}
              data={orderedRows}
              loading={isLoading}
              searchable={false}
              showColumnToggle={false}
              showExportCsv={false}
              defaultPageSize={25}
              emptyTitle={
                statusFilter === 'archived'
                  ? 'No archived workspaces'
                  : 'No active workspaces yet'
              }
              emptyDescription={
                statusFilter === 'archived'
                  ? 'Archived workspaces will appear here.'
                  : 'Create one to get started.'
              }
            />
          </div>
        </div>
      </Modal>

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
              className="h-10 rounded-xl bg-slate-800 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? (drawerMode === 'edit' ? 'Saving…' : 'Creating…') : drawerMode === 'edit' ? 'Save changes' : 'Create workspace'}
            </button>
          </div>
        }
      >
        <form id="workspace-form" className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="ws-name" className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Name
            </label>
            <IconInput
              id="ws-name"
              icon={Building2}
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              maxLength={240}
              placeholder="e.g. Enterprise accounts"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="ws-description" className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Description
              </label>
              <span className="text-[10px] tabular-nums text-ink-faint">
                {formDescription.length}/{DESCRIPTION_MAX}
              </span>
            </div>
            <IconTextarea
              id="ws-description"
              icon={AlignLeft}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
              rows={4}
              maxLength={DESCRIPTION_MAX}
              placeholder="What this workspace is for (optional)"
            />
          </div>
          <CurrencyPicker
            value={formDefaultCurrency}
            onChange={setFormDefaultCurrency}
            label="Workspace currency"
            required
          />
          <div className="space-y-4 rounded-2xl border border-surface-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Theme colors</p>
            <p className="text-xs text-ink-muted">
              Changes apply instantly as a preview. Save to persist across sessions.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <div className="flex flex-1 flex-col gap-1.5">
                <label htmlFor="ws-theme-color" className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  Theme color
                </label>
                <p className="text-[11px] leading-snug text-ink-faint">Sidebar background, buttons, table header</p>
                <ThemeColorField
                  id="ws-theme-color"
                  value={formThemeColor}
                  onCommit={setFormThemeColor}
                  applyPreview={applyThemePreview}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <label htmlFor="ws-sidebar-text" className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  Text color
                </label>
                <p className="text-[11px] leading-snug text-ink-faint">Sidebar nav text and button text</p>
                <ThemeColorField
                  id="ws-sidebar-text"
                  value={formSidebarText}
                  onCommit={setFormSidebarText}
                  applyPreview={applySidebarTextPreview}
                />
              </div>
            </div>
          </div>
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
    </>
  )
}
