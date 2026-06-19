import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FormInput, GitBranch, Pencil, Plus, Tag, Trash2, Waypoints } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { PageFilterBar } from '@/components/layout/PageFilterBar'
import { PageContentPanel } from '@/components/layout/PageContentPanel'
import { PageStack } from '@/components/layout/PageStack'
import { ReorderableSetupTable } from '@/components/shared/ReorderableSetupTable'
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
  useGetCustomFieldsQuery,
  useCreateCustomFieldMutation,
  usePatchCustomFieldMutation,
  useDeleteCustomFieldMutation,
  useReorderCustomFieldsMutation,
  useReorderDealStatusesMutation,
  useReorderOpportunityStagesMutation,
  useReorderOpportunityStatusesMutation,
  useUpdateDealStatusMutation,
  useUpdateLeadSourceMutation,
  useUpdateLeadTagMutation,
  useUpdateOpportunityStageMutation,
  useUpdateOpportunityStatusMutation,
} from '@/features/leads/leadsApi'
import { CustomFieldEditorDrawer } from '@/features/leads/components/CustomFieldEditorDrawer'
import { CustomFieldsSetupTable } from '@/features/leads/components/CustomFieldsSetupTable'
import { cn } from '@/utils/cn'

const TABS = [
  { id: 'source', label: 'Source', icon: Waypoints },
  { id: 'tags', label: 'Tags', icon: Tag },
  { id: 'custom-fields', label: 'Custom fields', icon: FormInput },
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
  const { data: customFieldsData, isLoading: loadingCustomFields } = useGetCustomFieldsQuery(undefined, {
    skip: false,
  })
  const [createCustomField, { isLoading: creatingCustomField }] = useCreateCustomFieldMutation()
  const [patchCustomField, { isLoading: patchingCustomField }] = usePatchCustomFieldMutation()
  const [deleteCustomField] = useDeleteCustomFieldMutation()
  const [reorderCustomFields, { isLoading: reorderingCustomFields }] = useReorderCustomFieldsMutation()

  const [activeTab, setActiveTab] = useState('source')
  const [editor, setEditor] = useState({ open: false, mode: 'create', type: 'source', id: null, name: '', color: '#3b73f5' })
  const [customFieldEditor, setCustomFieldEditor] = useState({ open: false, mode: 'create', row: null })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: '', id: null, name: '' })

  const setup = useMemo(
    () => data?.data || { sources: [], tags: [], opportunityStages: [], opportunityStatuses: [], dealStatuses: [] },
    [data],
  )
  const customFieldRows = useMemo(() => customFieldsData?.data || [], [customFieldsData])

  function getEntityLabel(type) {
    if (type === 'source') return 'Source'
    if (type === 'tags') return 'Tag'
    if (type === 'customFields') return 'Custom field'
    if (type === 'opportunityStages') return 'Lead status'
    if (type === 'opportunityStatuses') return 'Opportunity status'
    if (type === 'dealStatuses') return 'Deal status'
    return 'Item'
  }

  function getActiveTabType() {
    if (activeTab === 'source') return 'source'
    if (activeTab === 'tags') return 'tags'
    if (activeTab === 'custom-fields') return 'customFields'
    if (activeTab === 'opportunity-stages') return 'opportunityStages'
    if (activeTab === 'opportunity-statuses') return 'opportunityStatuses'
    if (activeTab === 'deal-statuses') return 'dealStatuses'
    return 'source'
  }

  function openCreateModal() {
    if (activeTab === 'custom-fields') {
      setCustomFieldEditor({ open: true, mode: 'create', row: null })
      return
    }
    const type = getActiveTabType()
    setEditor({ open: true, mode: 'create', type, id: null, name: '', color: '#3b73f5' })
  }

  function openCustomFieldEdit(row) {
    setCustomFieldEditor({ open: true, mode: 'edit', row })
  }

  async function onSaveCustomField(payload) {
    try {
      if (customFieldEditor.mode === 'edit' && customFieldEditor.row?.id) {
        await patchCustomField({ id: customFieldEditor.row.id, ...payload }).unwrap()
        toast.success('Custom field updated')
      } else {
        await createCustomField(payload).unwrap()
        toast.success('Custom field created')
      }
      setCustomFieldEditor({ open: false, mode: 'create', row: null })
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
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
    setDeleteDialog({ open: true, type, id: row.id, name: row.name || row.label || '' })
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
      if (deleteDialog.type === 'customFields') {
        await deleteCustomField(deleteDialog.id).unwrap()
        toast.success('Custom field deleted')
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

  async function persistReorder(mutation, ids) {
    if (!Array.isArray(ids) || !ids.length) return
    try {
      await mutation({ ids }).unwrap()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  const onReorderDealStatusesByIds = (ids) => persistReorder(reorderDealStatuses, ids)
  const onReorderOpportunityStagesByIds = (ids) => persistReorder(reorderOpportunityStages, ids)
  const onReorderOpportunityStatusesByIds = (ids) => persistReorder(reorderOpportunityStatuses, ids)
  const onReorderCustomFieldsByIds = (ids) => persistReorder(reorderCustomFields, ids)

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

  const actionsColumn = (type) => ({
    id: 'actions',
    header: 'Actions',
    width: 92,
    headerClassName: 'text-right',
    className: 'text-right',
    cell: (row) => <SetupRowActions row={row} type={type} />,
  })

  const activeTable = useMemo(() => {
    switch (activeTab) {
      case 'tags':
        return {
          rows: setup.tags,
          sortable: false,
          loading: isLoading,
          disabled: false,
          columns: [
            {
              id: 'name',
              header: 'Tag',
              cell: (row) => <span className="font-medium text-ink">{row.name}</span>,
            },
            {
              id: 'color',
              header: 'Color',
              width: 140,
              cell: (row) => (
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
              id: 'createdAt',
              header: 'Created',
              width: 120,
              cell: (row) => formatDate(row.createdAt),
            },
            actionsColumn('tags'),
          ],
          emptyTitle: 'No tags found',
          emptyDescription: 'Add a tag to organize leads.',
        }
      case 'opportunity-stages':
        return {
          rows: opportunityRows,
          sortable: true,
          loading: isLoading,
          disabled: updatingOppStage || reorderingOppStages,
          onReorder: onReorderOpportunityStagesByIds,
          getDragLabel: (row) => `Drag to reorder ${formatStatusName(row.name)}`,
          columns: [
            {
              id: 'name',
              header: 'Stage',
              cell: (row) => <span className="font-medium text-ink">{formatStatusName(row.name)}</span>,
            },
            {
              id: 'isDefault',
              header: 'Initial',
              width: 88,
              cell: (row) => <YesNoPill yes={!!row.isDefault} />,
            },
            {
              id: 'isDealStatus',
              header: 'Deal status',
              width: 108,
              cell: (row) => (
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
              id: 'createdAt',
              header: 'Created',
              width: 120,
              cell: (row) => formatDate(row.createdAt),
            },
            actionsColumn('opportunityStages'),
          ],
          emptyTitle: 'No lead statuses found',
          emptyDescription: 'Add pipeline stages for opportunities.',
        }
      case 'opportunity-statuses':
        return {
          rows: opportunityStatusRows,
          sortable: true,
          loading: isLoading,
          disabled: updatingOppStatus || reorderingOppStatuses,
          onReorder: onReorderOpportunityStatusesByIds,
          getDragLabel: (row) => `Drag to reorder ${formatStatusName(row.name)}`,
          columns: [
            {
              id: 'name',
              header: 'Status name',
              cell: (row) => <span className="font-medium text-ink">{formatStatusName(row.name)}</span>,
            },
            {
              id: 'isInitial',
              header: 'Initial',
              width: 88,
              cell: (row) => <YesNoPill yes={!!row.isInitial} />,
            },
            {
              id: 'createdAt',
              header: 'Created',
              width: 120,
              cell: (row) => formatDate(row.createdAt),
            },
            actionsColumn('opportunityStatuses'),
          ],
          emptyTitle: 'No opportunity statuses found',
          emptyDescription: 'Add statuses for your opportunity pipeline.',
        }
      case 'deal-statuses':
        return {
          rows: dealStatusRows,
          sortable: true,
          loading: isLoading,
          disabled: updatingDealStatus || reorderingDealStatuses,
          onReorder: onReorderDealStatusesByIds,
          getDragLabel: (row) => `Drag to reorder ${formatStatusName(row.name)}`,
          columns: [
            {
              id: 'name',
              header: 'Status name',
              cell: (row) => <span className="font-medium text-ink">{formatStatusName(row.name)}</span>,
            },
            {
              id: 'isInitial',
              header: 'Initial',
              width: 88,
              cell: (row) => <YesNoPill yes={!!row.isInitial} />,
            },
            {
              id: 'isDealCompleteStatus',
              header: 'Deal complete',
              width: 120,
              cell: (row) => (
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
              id: 'createdAt',
              header: 'Created',
              width: 120,
              cell: (row) => formatDate(row.createdAt),
            },
            actionsColumn('dealStatuses'),
          ],
          emptyTitle: 'No deal statuses found',
          emptyDescription: 'Add deal status names for your pipeline.',
        }
      case 'source':
      default:
        return {
          rows: setup.sources,
          sortable: false,
          loading: isLoading,
          disabled: false,
          columns: [
            {
              id: 'name',
              header: 'Source',
              cell: (row) => <span className="font-medium text-ink">{row.name}</span>,
            },
            {
              id: 'createdAt',
              header: 'Created',
              width: 120,
              cell: (row) => formatDate(row.createdAt),
            },
            actionsColumn('source'),
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
    isLoading,
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
          {activeTab === 'custom-fields' ? (
            <CustomFieldsSetupTable
              rows={customFieldRows}
              loading={loadingCustomFields}
              disabled={patchingCustomField || reorderingCustomFields}
              onEdit={openCustomFieldEdit}
              onDelete={(row) => openDeleteDialog('customFields', row)}
              onReorder={onReorderCustomFieldsByIds}
              className="rounded-none border-0 shadow-none"
            />
          ) : (
            <ReorderableSetupTable
              key={activeTab}
              rows={activeTable.rows}
              columns={activeTable.columns}
              loading={activeTable.loading}
              disabled={activeTable.disabled}
              sortable={activeTable.sortable}
              onReorder={activeTable.onReorder}
              getDragLabel={activeTable.getDragLabel}
              emptyTitle={activeTable.emptyTitle}
              emptyDescription={activeTable.emptyDescription}
              className="rounded-none border-0 shadow-none"
            />
          )}
        </PageContentPanel>
      </PageStack>

      <CustomFieldEditorDrawer
        open={customFieldEditor.open}
        mode={customFieldEditor.mode}
        initial={customFieldEditor.row}
        saving={creatingCustomField || patchingCustomField}
        onClose={() => setCustomFieldEditor({ open: false, mode: 'create', row: null })}
        onSave={onSaveCustomField}
      />

      <Modal
        open={editor.open && activeTab !== 'custom-fields'}
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
