import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { GitBranch, GripVertical, Pencil, Plus, Tag, Trash2, Waypoints } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Modal } from '@/components/ui/Modal'
import {
  useCreateLeadSourceMutation,
  useCreateLeadTagMutation,
  useCreateDealStatusMutation,
  useCreateOpportunityStageMutation,
  useDeleteDealStatusMutation,
  useDeleteLeadSourceMutation,
  useDeleteLeadTagMutation,
  useDeleteOpportunityStageMutation,
  useGetLeadSetupQuery,
  useReorderDealStatusesMutation,
  useReorderOpportunityStagesMutation,
  useUpdateDealStatusMutation,
  useUpdateLeadSourceMutation,
  useUpdateLeadTagMutation,
  useUpdateOpportunityStageMutation,
} from '@/features/leads/leadsApi'
import { cn } from '@/utils/cn'

const TABS = [
  { id: 'source', label: 'Source', icon: Waypoints },
  { id: 'tags', label: 'Tags', icon: Tag },
  { id: 'opportunity-stages', label: 'Lead status (pipeline)', icon: GitBranch },
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
  const [createDealStatus, { isLoading: creatingDealStatus }] = useCreateDealStatusMutation()
  const [updateDealStatus, { isLoading: updatingDealStatus }] = useUpdateDealStatusMutation()
  const [deleteDealStatus] = useDeleteDealStatusMutation()
  const [reorderDealStatuses, { isLoading: reorderingDealStatuses }] = useReorderDealStatusesMutation()

  const [activeTab, setActiveTab] = useState('source')
  const [editor, setEditor] = useState({ open: false, mode: 'create', type: 'source', id: null, name: '', color: '#3b73f5' })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: '', id: null, name: '' })
  const [draggingOpportunityStageId, setDraggingOpportunityStageId] = useState(null)
  const [draggingDealStatusId, setDraggingDealStatusId] = useState(null)

  const setup = useMemo(
    () => data?.data || { sources: [], tags: [], opportunityStages: [], dealStatuses: [] },
    [data],
  )

  function getEntityLabel(type) {
    if (type === 'source') return 'Source'
    if (type === 'tags') return 'Tag'
    if (type === 'opportunityStages') return 'Lead status'
    if (type === 'dealStatuses') return 'Deal status'
    return 'Item'
  }

  function getActiveTabType() {
    if (activeTab === 'source') return 'source'
    if (activeTab === 'tags') return 'tags'
    if (activeTab === 'opportunity-stages') return 'opportunityStages'
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

  return (
    <PageShell fullWidth>
      <div className="pb-4 sm:pb-5">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-y border-surface-border bg-white px-4 py-2.5 sm:px-6">
            <div className="flex min-w-max items-center gap-2 overflow-x-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon
                const selected = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium',
                      selected ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-surface-border bg-white text-ink',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {tab.label}
                  </button>
                )
              })}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white"
              >
                <Plus className="h-3 w-3" />
                {activeAddLabel}
              </button>
            </div>
          </div>

          {isLoading ? <p className="text-sm text-ink-muted">Loading setup…</p> : null}

          {activeTab === 'source' ? (
            <div className="overflow-hidden rounded-xl border border-surface-border bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className="border-b border-surface-border/70">
                      <th className="px-2.5 py-2 text-left text-[11px] font-semibold text-ink-muted">Source</th>
                      <th className="px-2.5 py-2 text-left text-[11px] font-semibold text-ink-muted">Created</th>
                      <th className="px-2.5 py-2 text-right text-[11px] font-semibold text-ink-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {setup.sources.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-8 text-center text-ink-muted">
                          No sources found.
                        </td>
                      </tr>
                    ) : (
                      setup.sources.map((item) => (
                        <tr key={item.id} className="group border-b border-surface-border last:border-b-0 hover:bg-brand-50">
                          <td className="px-2.5 py-2 text-xs text-ink">{item.name}</td>
                          <td className="px-2.5 py-2 text-xs text-ink-muted">{formatDate(item.createdAt)}</td>
                          <td className="px-2.5 py-2 text-right">
                            <div className="inline-flex gap-1 opacity-100 transition">
                              <button
                                type="button"
                                onClick={() => openEditModal('source', item)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700"
                                aria-label="Edit source"
                                title="Edit source"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                  onClick={() => openDeleteDialog('source', item)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-danger"
                                aria-label="Delete source"
                                title="Delete source"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

            {activeTab === 'tags' ? (
              <div className="overflow-hidden rounded-xl border border-surface-border bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className="border-b border-surface-border/70">
                        <th className="px-2.5 py-2 text-left text-[11px] font-semibold text-ink-muted">Tag</th>
                        <th className="px-2.5 py-2 text-left text-[11px] font-semibold text-ink-muted">Color</th>
                        <th className="px-2.5 py-2 text-left text-[11px] font-semibold text-ink-muted">Created</th>
                        <th className="px-2.5 py-2 text-right text-[11px] font-semibold text-ink-muted">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {setup.tags.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-8 text-center text-ink-muted">
                            No tags found.
                          </td>
                        </tr>
                      ) : (
                        setup.tags.map((item) => (
                          <tr key={item.id} className="group border-b border-surface-border last:border-b-0 hover:bg-brand-50">
                            <td className="px-2.5 py-2 text-xs text-ink">{item.name}</td>
                            <td className="px-2.5 py-2">
                              <span className="inline-flex items-center gap-2 text-xs text-ink-muted">
                                <span className="h-3.5 w-3.5 rounded-full border border-surface-border" style={{ backgroundColor: item.color || '#3b73f5' }} />
                                {item.color || '#3b73f5'}
                              </span>
                            </td>
                            <td className="px-2.5 py-2 text-xs text-ink-muted">{formatDate(item.createdAt)}</td>
                            <td className="px-2.5 py-2 text-right">
                              <div className="inline-flex gap-1 opacity-100 transition">
                                <button
                                  type="button"
                                  onClick={() => openEditModal('tags', item)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700"
                                  aria-label="Edit tag"
                                  title="Edit tag"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDeleteDialog('tags', item)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-danger"
                                  aria-label="Delete tag"
                                  title="Delete tag"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {activeTab === 'opportunity-stages' ? (
              <div className="overflow-hidden rounded-xl border border-surface-border bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className="border-b border-surface-border/70">
                        <th className="w-8 px-2.5 py-2 text-left text-[11px] font-semibold text-ink-muted">Move</th>
                        <th className="px-2.5 py-2 text-left text-[11px] font-semibold text-ink-muted">Stage</th>
                        <th className="px-2.5 py-2 text-center text-[11px] font-semibold text-ink-muted">Initial</th>
                        <th className="px-2.5 py-2 text-center text-[11px] font-semibold text-ink-muted">Deal status</th>
                        <th className="px-2.5 py-2 text-left text-[11px] font-semibold text-ink-muted">Created</th>
                        <th className="px-2.5 py-2 text-right text-[11px] font-semibold text-ink-muted">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(setup.opportunityStages || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-ink-muted">
                            No lead statuses found.
                          </td>
                        </tr>
                      ) : (
                        setup.opportunityStages.map((item) => (
                          <tr
                            key={item.id}
                            draggable={!reorderingOppStages}
                            onDragStart={() => setDraggingOpportunityStageId(item.id)}
                            onDragEnd={() => setDraggingOpportunityStageId(null)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                              if (draggingOpportunityStageId && draggingOpportunityStageId !== item.id) {
                                onReorderOpportunityStages(draggingOpportunityStageId, item.id)
                              }
                              setDraggingOpportunityStageId(null)
                            }}
                            className={cn(
                              'group border-b border-surface-border last:border-b-0 hover:bg-brand-50',
                              draggingOpportunityStageId === item.id ? 'opacity-50' : '',
                            )}
                          >
                            <td className="px-2.5 py-2 text-ink-muted">
                              <span className="inline-flex cursor-grab items-center" title="Drag to reorder">
                                <GripVertical className="h-3.5 w-3.5" />
                              </span>
                            </td>
                            <td className="px-2.5 py-2 text-xs text-ink">{formatStatusName(item.name)}</td>
                            <td className="px-2.5 py-2 text-center text-xs text-ink-muted">{item.isDefault ? 'Yes' : 'No'}</td>
                            <td className="px-2.5 py-2 text-center">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 rounded border-surface-border text-brand-600 focus:ring-brand-500"
                                checked={!!item.isDealStatus}
                                disabled={updatingOppStage || reorderingOppStages}
                                onChange={(e) => onSetOpportunityDealStatus(item, e.target.checked)}
                                aria-label={item.isDealStatus ? 'Deal stage selected' : 'Set as deal stage'}
                              />
                            </td>
                            <td className="px-2.5 py-2 text-xs text-ink-muted">{formatDate(item.createdAt)}</td>
                            <td className="px-2.5 py-2 text-right">
                              <div className="inline-flex gap-1 opacity-100 transition">
                                <button
                                  type="button"
                                  onClick={() => openEditModal('opportunityStages', item)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700"
                                  aria-label="Edit lead status"
                                  title="Edit lead status"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDeleteDialog('opportunityStages', item)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-danger"
                                  aria-label="Delete lead status"
                                  title="Delete lead status"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            {activeTab === 'deal-statuses' ? (
              <div className="overflow-hidden rounded-xl border border-surface-border bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className="border-b border-surface-border/70">
                        <th className="w-8 px-2.5 py-2 text-left text-[11px] font-semibold text-ink-muted">Move</th>
                        <th className="px-2.5 py-2 text-left text-[11px] font-semibold text-ink-muted">Status name</th>
                        <th className="px-2.5 py-2 text-center text-[11px] font-semibold text-ink-muted">Initial</th>
                        <th className="px-2.5 py-2 text-center text-[11px] font-semibold text-ink-muted">Is deal complete status</th>
                        <th className="px-2.5 py-2 text-left text-[11px] font-semibold text-ink-muted">Created</th>
                        <th className="px-2.5 py-2 text-right text-[11px] font-semibold text-ink-muted">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(setup.dealStatuses || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-ink-muted">
                            No deal statuses found.
                          </td>
                        </tr>
                      ) : (
                        setup.dealStatuses.map((item) => (
                          <tr
                            key={item.id}
                            draggable={!reorderingDealStatuses}
                            onDragStart={() => setDraggingDealStatusId(item.id)}
                            onDragEnd={() => setDraggingDealStatusId(null)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                              if (draggingDealStatusId && draggingDealStatusId !== item.id) {
                                onReorderDealStatuses(draggingDealStatusId, item.id)
                              }
                              setDraggingDealStatusId(null)
                            }}
                            className={cn(
                              'group border-b border-surface-border last:border-b-0 hover:bg-brand-50',
                              draggingDealStatusId === item.id ? 'opacity-50' : '',
                            )}
                          >
                            <td className="px-2.5 py-2 text-ink-muted">
                              <span className="inline-flex cursor-grab items-center" title="Drag to reorder">
                                <GripVertical className="h-3.5 w-3.5" />
                              </span>
                            </td>
                            <td className="px-2.5 py-2 text-xs text-ink">{item.name}</td>
                            <td className="px-2.5 py-2 text-center text-xs text-ink-muted">
                              {item.isInitial ? 'Yes' : 'No'}
                            </td>
                            <td className="px-2.5 py-2 text-center">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 rounded border-surface-border text-brand-600 focus:ring-brand-500"
                                checked={!!item.isDealCompleteStatus}
                                disabled={updatingDealStatus || reorderingDealStatuses}
                                onChange={(e) => onSetDealCompleteStatus(item, e.target.checked)}
                                aria-label={item.isDealCompleteStatus ? 'Deal complete status selected' : 'Set as deal complete status'}
                              />
                            </td>
                            <td className="px-2.5 py-2 text-xs text-ink-muted">{formatDate(item.createdAt)}</td>
                            <td className="px-2.5 py-2 text-right">
                              <div className="inline-flex gap-1 opacity-100 transition">
                                <button
                                  type="button"
                                  onClick={() => openEditModal('dealStatuses', item)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700"
                                  aria-label="Edit deal status"
                                  title="Edit deal status"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDeleteDialog('dealStatuses', item)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-danger"
                                  aria-label="Delete deal status"
                                  title="Delete deal status"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
        </section>
      </div>

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
              className="h-10 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white disabled:opacity-60"
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
