import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronDown, ChevronUp, GitBranch, Pencil, Plus, Tag, Trash2, Waypoints } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { PageFilterBar } from '@/components/layout/PageFilterBar'
import { PageContentPanel } from '@/components/layout/PageContentPanel'
import { PageStack } from '@/components/layout/PageStack'
import { DataGrid } from '@/components/shared/DataGrid'
import { Modal } from '@/components/ui/Modal'
import {
  useCreateLeadSourceMutation,
  useCreateLeadTagMutation,
  useCreateDealStatusMutation,
  useCreateOpportunityStageMutation,
  useCreateOpportunityStatusMutation,
  useDeleteDealStatusMutation,
  useDeleteLeadSourceMutation,
  useDeleteLeadTagMutation,
  useDeleteOpportunityStageMutation,
  useDeleteOpportunityStatusMutation,
  useGetLeadSetupQuery,
  useReorderDealStatusesMutation,
  useReorderOpportunityStagesMutation,
  useReorderOpportunityStatusesMutation,
  useUpdateDealStatusMutation,
  useUpdateLeadSourceMutation,
  useUpdateLeadTagMutation,
  useUpdateOpportunityStageMutation,
  useUpdateOpportunityStatusMutation,
} from '@/features/leads/leadsApi'
import { cn } from '@/utils/cn'

const TABS = [
  { id: 'source', label: 'Source', icon: Waypoints },
  { id: 'tags', label: 'Tags', icon: Tag },
  { id: 'opportunity-stages', label: 'Lead status (pipeline)', icon: GitBranch },
  { id: 'opportunity-statuses', label: 'Opportunity status', icon: GitBranch },
  { id: 'deal-statuses', label: 'Deal status name', icon: GitBranch },
]

function apiErrorMessage(err) {
  return err?.data?.error?.message ?? err?.error ?? 'Something went wrong'
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString()
}

function formatStatusName(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function YesNoPill({ yes }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold',
        yes
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-surface-border bg-surface-subtle text-ink-muted',
      )}
    >
      {yes ? 'Yes' : 'No'}
    </span>
  )
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

function MoveRowButtons({ row, rows, onReorder, disabled }) {
  const idx = rows.findIndex((r) => r.id === row.id)
  if (idx < 0) return null
  return (
    <div className="inline-flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={disabled || idx === 0}
        onClick={() => onReorder(row.id, rows[idx - 1].id)}
        className="inline-flex h-6 w-6 items-center justify-center rounded border border-surface-border text-ink-muted hover:bg-brand-50 disabled:opacity-30"
        aria-label="Move up"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        disabled={disabled || idx >= rows.length - 1}
        onClick={() => onReorder(row.id, rows[idx + 1].id)}
        className="inline-flex h-6 w-6 items-center justify-center rounded border border-surface-border text-ink-muted hover:bg-brand-50 disabled:opacity-30"
        aria-label="Move down"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function LeadConfigurationPage() {
  const { data, isLoading } = useGetLeadSetupQuery()
  const [createSource, { isLoading: creatingSource }] = useCreateLeadSourceMutation()
  const [updateSource, { isLoading: updatingSource }] = useUpdateLeadSourceMutation()
  const [deleteSource] = useDeleteLeadSourceMutation()
  const [createTag, { isLoading: creatingTag }] = useCreateLeadTagMutation()
  const [updateTag, { isLoading: updatingTag }] = useUpdateLeadTagMutation()
  const [deleteTag] = useDeleteLeadTagMutation()
  const [createOpportunityStage, { isLoading: creatingOppStage }] = useCreateOpportunityStageMutation()
  const [updateOpportunityStage, { isLoading: updatingOppStage }] = useUpdateOpportunityStageMutation()
  const [reorderOpportunityStages, { isLoading: reorderingOppStages }] = useReorderOpportunityStagesMutation()
  const [deleteOpportunityStage] = useDeleteOpportunityStageMutation()
  const [createOpportunityStatus, { isLoading: creatingOppStatus }] = useCreateOpportunityStatusMutation()
  const [updateOpportunityStatus, { isLoading: updatingOppStatus }] = useUpdateOpportunityStatusMutation()
  const [deleteOpportunityStatus] = useDeleteOpportunityStatusMutation()
  const [reorderOpportunityStatuses, { isLoading: reorderingOppStatuses }] = useReorderOpportunityStatusesMutation()
  const [createDealStatus, { isLoading: creatingDealStatus }] = useCreateDealStatusMutation()
  const [updateDealStatus, { isLoading: updatingDealStatus }] = useUpdateDealStatusMutation()
  const [deleteDealStatus] = useDeleteDealStatusMutation()
  const [reorderDealStatuses, { isLoading: reorderingDealStatuses }] = useReorderDealStatusesMutation()

  const [activeTab, setActiveTab] = useState('source')
  const [editor, setEditor] = useState({ open: false, mode: 'create', type: 'source', id: null, name: '', color: '#3b73f5' })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: '', id: null, name: '' })

  const setup = useMemo(
    () => data?.data || { sources: [], tags: [], opportunityStages: [], opportunityStatuses: [], dealStatuses: [] },
    [data],
  )

  function getEntityLabel(type) {
    if (type === 'source') return 'Source'
    if (type === 'tags') return 'Tag'
    if (type === 'opportunityStages') return 'Lead status'
    if (type === 'opportunityStatuses') return 'Opportunity status'
    if (type === 'dealStatuses') return 'Deal status'
    return 'Item'
  }

  function getActiveTabType() {
    if (activeTab === 'source') return 'source'
    if (activeTab === 'tags') return 'tags'
    if (activeTab === 'opportunity-stages') return 'opportunityStages'
    if (activeTab === 'opportunity-statuses') return 'opportunityStatuses'
    if (activeTab === 'deal-statuses') return 'dealStatuses'
    return 'source'
  }

  function openCreateModal() {
    const type = getActiveTabType()
    setEditor({ open: true, mode: 'create', type, id: null, name: '', color: '#3b73f5' })
  }

  function openEditModal(type, row) {
    setEditor({ open: true, mode: 'edit', type, id: row.id, name: row.name || '', color: row.color || '#3b73f5' })
  }

  function closeModal() {
    setEditor({ open: false, mode: 'create', type: 'source', id: null, name: '', color: '#3b73f5' })
  }

  async function onSaveModal() {
    const name = editor.name.trim()
    if (!name) return
    try {
      if (editor.type === 'source') {
        if (editor.mode === 'edit') {
          await updateSource({ id: editor.id, name }).unwrap()
          toast.success('Source updated')
        } else {
          await createSource({ name }).unwrap()
          toast.success('Source created')
        }
      }
      if (editor.type === 'tags') {
        if (editor.mode === 'edit') {
          await updateTag({ id: editor.id, name, color: editor.color }).unwrap()
          toast.success('Tag updated')
        } else {
          await createTag({ name, color: editor.color }).unwrap()
          toast.success('Tag created')
        }
      }
      if (editor.type === 'opportunityStages') {
        if (editor.mode === 'edit') {
          await updateOpportunityStage({ id: editor.id, name }).unwrap()
          toast.success('Lead status updated')
        } else {
          await createOpportunityStage({ name }).unwrap()
          toast.success('Lead status created')
        }
      }
      if (editor.type === 'opportunityStatuses') {
        if (editor.mode === 'edit') {
          await updateOpportunityStatus({ id: editor.id, name }).unwrap()
          toast.success('Opportunity status updated')
        } else {
          await createOpportunityStatus({ name }).unwrap()
          toast.success('Opportunity status created')
        }
      }
      if (editor.type === 'dealStatuses') {
        if (editor.mode === 'edit') {
          await updateDealStatus({ id: editor.id, name }).unwrap()
          toast.success('Deal status updated')
        } else {
          await createDealStatus({ name }).unwrap()
          toast.success('Deal status created')
        }
      }
      closeModal()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  function openDeleteDialog(type, row) {
    setDeleteDialog({ open: true, type, id: row.id, name: row.name || '' })
  }

  async function onConfirmDelete() {
    try {
      if (deleteDialog.type === 'source') {
        await deleteSource(deleteDialog.id).unwrap()
        toast.success('Source deleted')
      }
      if (deleteDialog.type === 'tags') {
        await deleteTag(deleteDialog.id).unwrap()
        toast.success('Tag deleted')
      }
      if (deleteDialog.type === 'opportunityStages') {
        await deleteOpportunityStage(deleteDialog.id).unwrap()
        toast.success('Lead status deleted')
      }
      if (deleteDialog.type === 'opportunityStatuses') {
        await deleteOpportunityStatus(deleteDialog.id).unwrap()
        toast.success('Opportunity status deleted')
      }
      if (deleteDialog.type === 'dealStatuses') {
        await deleteDealStatus(deleteDialog.id).unwrap()
        toast.success('Deal status deleted')
      }
      setDeleteDialog({ open: false, type: '', id: null, name: '' })
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  const savingModal =
    creatingSource ||
    updatingSource ||
    creatingTag ||
    updatingTag ||
    creatingOppStage ||
    updatingOppStage ||
    creatingOppStatus ||
    updatingOppStatus ||
    creatingDealStatus ||
    updatingDealStatus
  const activeAddLabel = `Add ${getEntityLabel(getActiveTabType()).toLowerCase()}`

  async function onSetDealCompleteStatus(row, isComplete) {
    try {
      await updateDealStatus({ id: row.id, isDealCompleteStatus: isComplete }).unwrap()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  async function onReorderDealStatuses(sourceId, targetId) {
    const rows = Array.isArray(setup.dealStatuses) ? setup.dealStatuses : []
    const sourceIndex = rows.findIndex((r) => r.id === sourceId)
    const targetIndex = rows.findIndex((r) => r.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return
    const next = [...rows]
    const [moved] = next.splice(sourceIndex, 1)
    next.splice(targetIndex, 0, moved)
    try {
      await reorderDealStatuses({ ids: next.map((r) => r.id) }).unwrap()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  async function onReorderOpportunityStages(sourceId, targetId) {
    const rows = Array.isArray(setup.opportunityStages) ? setup.opportunityStages : []
    const sourceIndex = rows.findIndex((r) => r.id === sourceId)
    const targetIndex = rows.findIndex((r) => r.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return
    const next = [...rows]
    const [moved] = next.splice(sourceIndex, 1)
    next.splice(targetIndex, 0, moved)
    try {
      await reorderOpportunityStages({ ids: next.map((r) => r.id) }).unwrap()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  async function onSetOpportunityDealStatus(row, isDealStatus) {
    try {
      await updateOpportunityStage({ id: row.id, isDealStatus }).unwrap()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  const opportunityRows = setup.opportunityStages || []
  const opportunityStatusRows = setup.opportunityStatuses || []
  const dealStatusRows = setup.dealStatuses || []

  async function onReorderOpportunityStatuses(sourceId, targetId) {
    const rows = Array.isArray(setup.opportunityStatuses) ? setup.opportunityStatuses : []
    const sourceIndex = rows.findIndex((r) => r.id === sourceId)
    const targetIndex = rows.findIndex((r) => r.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return
    const next = [...rows]
    const [moved] = next.splice(sourceIndex, 1)
    next.splice(targetIndex, 0, moved)
    try {
      await reorderOpportunityStatuses({ ids: next.map((r) => r.id) }).unwrap()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  function SetupRowActions({ row, type }) {
    return (
      <div className="inline-flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => openEditModal(type, row)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
          aria-label="Edit"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => openDeleteDialog(type, row)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-danger hover:bg-red-100"
          aria-label="Delete"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  const activeTable = useMemo(() => {
    const actionsCol = {
      field: 'actions',
      headerName: 'Actions',
      width: 92,
      minWidth: 92,
      maxWidth: 92,
      sortable: false,
      renderCell: ({ row }) => <SetupRowActions row={row} type={getActiveTabType()} />,
    }

    switch (activeTab) {
      case 'tags':
        return {
          data: setup.tags,
          columns: [
            {
              field: 'name',
              headerName: 'Tag',
              flex: 1,
              minWidth: 160,
              renderCell: ({ row }) => <span className="font-medium text-ink">{row.name}</span>,
            },
            {
              field: 'color',
              headerName: 'Color',
              width: 140,
              renderCell: ({ row }) => (
                <span className="inline-flex items-center gap-2 text-xs text-ink-muted">
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-surface-border shadow-sm"
                    style={{ backgroundColor: row.color || '#3b73f5' }}
                  />
                  <span className="font-mono">{row.color || '#3b73f5'}</span>
                </span>
              ),
            },
            {
              field: 'createdAt',
              headerName: 'Created',
              width: 120,
              valueGetter: (_v, row) => formatDate(row.createdAt),
            },
            actionsCol,
          ],
          emptyTitle: 'No tags found',
          emptyDescription: 'Add a tag to organize leads.',
        }
      case 'opportunity-stages':
        return {
          data: opportunityRows,
          columns: [
            {
              field: 'order',
              headerName: 'Order',
              width: 72,
              sortable: false,
              renderCell: ({ row }) => (
                <MoveRowButtons
                  row={row}
                  rows={opportunityRows}
                  onReorder={onReorderOpportunityStages}
                  disabled={updatingOppStage || reorderingOppStages}
                />
              ),
            },
            {
              field: 'name',
              headerName: 'Stage',
              flex: 1,
              minWidth: 180,
              renderCell: ({ row }) => (
                <span className="font-medium text-ink">{formatStatusName(row.name)}</span>
              ),
            },
            {
              field: 'isDefault',
              headerName: 'Initial',
              width: 88,
              renderCell: ({ row }) => <YesNoPill yes={!!row.isDefault} />,
            },
            {
              field: 'isDealStatus',
              headerName: 'Deal status',
              width: 108,
              sortable: false,
              renderCell: ({ row }) => (
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-surface-border text-brand-600 focus:ring-brand-500"
                    checked={!!row.isDealStatus}
                    disabled={updatingOppStage || reorderingOppStages}
                    onChange={(e) => onSetOpportunityDealStatus(row, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={row.isDealStatus ? 'Deal stage selected' : 'Set as deal stage'}
                  />
                </div>
              ),
            },
            {
              field: 'createdAt',
              headerName: 'Created',
              width: 120,
              valueGetter: (_v, row) => formatDate(row.createdAt),
            },
            actionsCol,
          ],
          emptyTitle: 'No lead statuses found',
          emptyDescription: 'Add pipeline stages for opportunities.',
        }
      case 'opportunity-statuses':
        return {
          data: opportunityStatusRows,
          columns: [
            {
              field: 'order',
              headerName: 'Order',
              width: 72,
              sortable: false,
              renderCell: ({ row }) => (
                <MoveRowButtons
                  row={row}
                  rows={opportunityStatusRows}
                  onReorder={onReorderOpportunityStatuses}
                  disabled={updatingOppStatus || reorderingOppStatuses}
                />
              ),
            },
            {
              field: 'name',
              headerName: 'Status name',
              flex: 1,
              minWidth: 180,
              renderCell: ({ row }) => (
                <span className="font-medium text-ink">{formatStatusName(row.name)}</span>
              ),
            },
            {
              field: 'isInitial',
              headerName: 'Initial',
              width: 88,
              renderCell: ({ row }) => <YesNoPill yes={!!row.isInitial} />,
            },
            {
              field: 'createdAt',
              headerName: 'Created',
              width: 120,
              valueGetter: (_v, row) => formatDate(row.createdAt),
            },
            actionsCol,
          ],
          emptyTitle: 'No opportunity statuses found',
          emptyDescription: 'Add statuses for your opportunity pipeline.',
        }
      case 'deal-statuses':
        return {
          data: dealStatusRows,
          columns: [
            {
              field: 'order',
              headerName: 'Order',
              width: 72,
              sortable: false,
              renderCell: ({ row }) => (
                <MoveRowButtons
                  row={row}
                  rows={dealStatusRows}
                  onReorder={onReorderDealStatuses}
                  disabled={updatingDealStatus || reorderingDealStatuses}
                />
              ),
            },
            {
              field: 'name',
              headerName: 'Status name',
              flex: 1,
              minWidth: 180,
              renderCell: ({ row }) => (
                <span className="font-medium text-ink">{formatStatusName(row.name)}</span>
              ),
            },
            {
              field: 'isInitial',
              headerName: 'Initial',
              width: 88,
              renderCell: ({ row }) => <YesNoPill yes={!!row.isInitial} />,
            },
            {
              field: 'isDealCompleteStatus',
              headerName: 'Deal complete',
              width: 120,
              sortable: false,
              renderCell: ({ row }) => (
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-surface-border text-brand-600 focus:ring-brand-500"
                    checked={!!row.isDealCompleteStatus}
                    disabled={updatingDealStatus || reorderingDealStatuses}
                    onChange={(e) => onSetDealCompleteStatus(row, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={
                      row.isDealCompleteStatus ? 'Deal complete status selected' : 'Set as deal complete status'
                    }
                  />
                </div>
              ),
            },
            {
              field: 'createdAt',
              headerName: 'Created',
              width: 120,
              valueGetter: (_v, row) => formatDate(row.createdAt),
            },
            actionsCol,
          ],
          emptyTitle: 'No deal statuses found',
          emptyDescription: 'Add deal status names for your pipeline.',
        }
      case 'source':
      default:
        return {
          data: setup.sources,
          columns: [
            {
              field: 'name',
              headerName: 'Source',
              flex: 1,
              minWidth: 200,
              renderCell: ({ row }) => <span className="font-medium text-ink">{row.name}</span>,
            },
            {
              field: 'createdAt',
              headerName: 'Created',
              width: 120,
              valueGetter: (_v, row) => formatDate(row.createdAt),
            },
            actionsCol,
          ],
          emptyTitle: 'No sources found',
          emptyDescription: 'Add lead sources such as Web Form or Referral.',
        }
    }
  }, [
    activeTab,
    setup.sources,
    setup.tags,
    opportunityRows,
    opportunityStatusRows,
    dealStatusRows,
    updatingOppStage,
    reorderingOppStages,
    updatingOppStatus,
    reorderingOppStatuses,
    updatingDealStatus,
    reorderingDealStatuses,
  ])

  return (
    <PageShell fullWidth mainClassName="pt-1.5 pb-3 sm:pb-4">
      <PageStack className="gap-3">
        <PageFilterBar>
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const selected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium',
                    selected
                      ? 'border-brand-300 bg-brand-50 text-brand-800'
                      : 'border-surface-border bg-white text-ink hover:border-brand-200 hover:bg-brand-50/50',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {tab.label}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="ml-auto inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--brand-primary)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-primary-dark)]"
          >
            <Plus className="h-3 w-3" />
            {activeAddLabel}
          </button>
        </PageFilterBar>

        <PageContentPanel flush>
          <DataGrid
            key={activeTab}
            gridColumns
            columns={activeTable.columns}
            data={activeTable.data}
            loading={isLoading}
            searchable={false}
            showColumnToggle={false}
            showExportCsv={false}
            compact
            defaultPageSize={20}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            getRowId={(row) => row.id}
            emptyTitle={activeTable.emptyTitle}
            emptyDescription={activeTable.emptyDescription}
            maxHeightClass="max-h-[min(65vh,640px)]"
            className="rounded-none border-0 shadow-none"
          />
        </PageContentPanel>
      </PageStack>

      <Modal
        open={editor.open}
        onClose={closeModal}
        title={`${editor.mode === 'edit' ? 'Edit' : 'Add'} ${getEntityLabel(editor.type)}`}
        footer={
          <>
            <button
              type="button"
              onClick={closeModal}
              className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSaveModal}
              disabled={savingModal}
              className="h-10 rounded-xl bg-slate-800 px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {savingModal ? 'Saving…' : editor.mode === 'edit' ? 'Save changes' : 'Add'}
            </button>
          </>
        }
      >
        <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Name
        </label>
        <input
          type="text"
          value={editor.name}
          onChange={(e) => setEditor((prev) => ({ ...prev, name: e.target.value }))}
          placeholder={`Enter ${getEntityLabel(editor.type).toLowerCase()} name`}
          className="h-10 rounded-xl border border-surface-border px-3.5 text-sm"
          autoFocus
        />
        {editor.type === 'tags' ? (
          <div className="mt-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Color</label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="color"
                value={editor.color || '#3b73f5'}
                onChange={(e) => setEditor((prev) => ({ ...prev, color: e.target.value }))}
                className="h-9 w-12 cursor-pointer rounded border border-surface-border bg-white p-1"
              />
              <span className="text-xs text-ink-muted">{editor.color || '#3b73f5'}</span>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, type: '', id: null, name: '' })}
        title="Delete item"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteDialog({ open: false, type: '', id: null, name: '' })}
              className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmDelete}
              className="h-10 rounded-xl bg-danger px-4 text-sm font-medium text-white"
            >
              Delete
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Delete <span className="font-medium text-ink">{deleteDialog.name || 'this item'}</span>? This action cannot be undone.
        </p>
      </Modal>
    </PageShell>
  )
}
