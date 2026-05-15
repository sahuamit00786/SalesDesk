import { useMemo, useState } from 'react'
import { ExternalLink, Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { PageShell } from '@/components/layout/PageShell'
import { EmbedCodeModal } from '../components/embed/EmbedCodeModal'
import { FormStatusBadge } from '../components/shared/FormStatusBadge'
import { useCreateWebFormMutation, useDeleteWebFormMutation, useGetWebFormQuery, useGetWebFormsQuery, useUpdateWebFormMutation } from '../webFormsApi'

export function WebFormsListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [shareForm, setShareForm] = useState(null)
  const [submissionFormId, setSubmissionFormId] = useState(null)
  const [deleteForm, setDeleteForm] = useState(null)
  const { data, isLoading, refetch } = useGetWebFormsQuery('')
  const { data: formDetailData, isLoading: submissionsLoading } = useGetWebFormQuery(submissionFormId, { skip: !submissionFormId })
  const [createWebForm, { isLoading: creating }] = useCreateWebFormMutation()
  const [updateWebForm, { isLoading: updating }] = useUpdateWebFormMutation()
  const [deleteWebForm] = useDeleteWebFormMutation()
  const forms = useMemo(() => {
    const rows = data?.data?.items || []
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((form) =>
      [form.name, form.formTitle, form.status, form.displayType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
  }, [data, search])
  const selectedFormDetail = formDetailData?.data
  const selectedSubmissions = selectedFormDetail?.submissions || []
  const submissionColumns = selectedFormDetail?.form?.fields || []

  async function createForm() {
    const created = await createWebForm({ name: 'Untitled form', formTitle: 'Let us connect', status: 'active', fields: [] }).unwrap()
    navigate(`/forms/${created.data.id}/builder`)
  }

  async function activateForm(form) {
    await updateWebForm({ id: form.id, status: 'active' }).unwrap()
    refetch()
  }

  return (
    <PageShell fullWidth>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-surface-border bg-white p-4">
          <input
            className="h-10 w-full max-w-sm rounded-xl border border-surface-border bg-white px-3 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search forms..."
          />
          <div className="flex items-center gap-2">
          <button type="button" onClick={() => refetch()} className="h-10 rounded-xl border border-surface-border bg-white px-4 text-sm">
            Refresh
          </button>
          <button type="button" onClick={createForm} disabled={creating} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" />
            New form
          </button>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-surface-border bg-white">
          <div className="overflow-x-auto">
            <table className="cx-table cx-table--dense min-w-[1100px] text-xs">
              <thead className="cx-table-sticky-head">
                <tr>
                  <th>Form</th>
                  <th>Status</th>
                  <th>Display</th>
                  <th>Views</th>
                  <th>Submissions</th>
                  <th>Conversion</th>
                  <th>Updated</th>
                  <th className="cx-table-cell-actions text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="py-8 text-center text-sm text-ink-muted">Loading forms...</td></tr>
                ) : null}
                {!isLoading && !forms.length ? (
                  <tr><td colSpan={8} className="py-8 text-center text-sm text-ink-muted">No forms yet. Create your first form.</td></tr>
                ) : null}
                {!isLoading && forms.map((form) => {
                  const views = Number(form.totalViews || 0)
                  const submissions = Number(form.totalSubmissions || 0)
                  const conversion = views > 0 ? ((submissions / views) * 100).toFixed(1) : '0.0'
                  return (
                    <tr key={form.id} className="group">
                      <td>
                        <p className="text-sm font-semibold text-ink">{form.name}</p>
                        <p className="text-xs text-ink-muted">{form.formTitle || 'Untitled display title'}</p>
                      </td>
                      <td><FormStatusBadge status={form.status} /></td>
                      <td className="capitalize text-ink-muted">{form.displayType || 'inline'}</td>
                      <td className="text-ink-muted">{views}</td>
                      <td className="text-ink-muted">{submissions}</td>
                      <td className="text-ink-muted">{conversion}%</td>
                      <td className="text-ink-muted">{new Date(form.updatedAt).toLocaleString()}</td>
                      <td className="cx-table-cell-actions text-right">
                        <div className="inline-flex items-center gap-1">
                          {form.status !== 'active' ? (
                            <button
                              type="button"
                              onClick={() => activateForm(form)}
                              disabled={updating}
                              className="h-8 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-medium text-emerald-700"
                              title="Activate form for sharing"
                            >
                              Publish
                            </button>
                          ) : null}
                          <button type="button" onClick={() => navigate(`/forms/${form.id}/builder`)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700" title="Builder"><Pencil className="h-4 w-4" /></button>
                          <button type="button" onClick={() => setShareForm(form)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border bg-white text-ink-muted" title="Share / Embed"><ExternalLink className="h-4 w-4" /></button>
                          <button type="button" onClick={() => setSubmissionFormId(form.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border bg-white text-ink-muted" title="Submissions"><Eye className="h-4 w-4" /></button>
                          <button type="button" onClick={() => setDeleteForm(form)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-danger" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(shareForm)}
        onClose={() => setShareForm(null)}
        title={`Share form: ${shareForm?.name || ''}`}
        maxWidthClassName="max-w-[min(96vw,1400px)]"
      >
        <EmbedCodeModal formToken={shareForm?.publicToken} />
      </Modal>

      <Modal
        open={Boolean(submissionFormId)}
        onClose={() => setSubmissionFormId(null)}
        title={`Submissions: ${selectedFormDetail?.form?.name || ''}`}
        maxWidthClassName="max-w-[min(96vw,1600px)]"
      >
        {submissionsLoading ? (
          <div className="rounded-xl border border-surface-border p-4 text-sm text-ink-muted">Loading submissions...</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-surface-border">
            <div className="max-h-[65vh] overflow-auto">
              <table className="cx-table cx-table--dense min-w-[980px] text-xs">
                <thead className="cx-table-sticky-head">
                  <tr>
                    <th>Submitted At</th>
                    {submissionColumns.map((field) => (
                      <th key={field.id}>
                        {field.label || field.type || 'Field'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!selectedSubmissions.length ? (
                    <tr><td colSpan={Math.max(2, submissionColumns.length + 1)} className="py-8 text-center text-sm text-ink-muted">No submissions for this form yet.</td></tr>
                  ) : selectedSubmissions.map((sub) => (
                    <tr key={sub.id}>
                      <td className="text-ink-muted">{new Date(sub.submittedAt || sub.createdAt).toLocaleString()}</td>
                      {submissionColumns.map((field) => (
                        <td key={`${sub.id}-${field.id}`} className="text-ink-muted">
                          <span className="break-all">{String(sub.data?.[field.id] ?? '-')}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(deleteForm)}
        onClose={() => setDeleteForm(null)}
        title="Delete form"
        maxWidthClassName="max-w-md"
        footer={(
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => setDeleteForm(null)} className="h-9 rounded-xl border border-surface-border px-4 text-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!deleteForm?.id) return
                await deleteWebForm(deleteForm.id).unwrap()
                setDeleteForm(null)
                refetch()
              }}
              className="h-9 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white"
            >
              Delete
            </button>
          </div>
        )}
      >
        <p className="text-sm text-ink-muted">
          Are you sure you want to delete <span className="font-semibold text-ink">{deleteForm?.name || 'this form'}</span>? This action cannot be undone.
        </p>
      </Modal>
    </PageShell>
  )
}
