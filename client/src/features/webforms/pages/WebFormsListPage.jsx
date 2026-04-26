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
            <table className="w-full min-w-[1100px] text-xs">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-surface-border/70">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-ink-muted">Form</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-ink-muted">Status</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-ink-muted">Display</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-ink-muted">Views</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-ink-muted">Submissions</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-ink-muted">Conversion</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-ink-muted">Updated</th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold text-ink-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-ink-muted">Loading forms...</td></tr>
                ) : null}
                {!isLoading && !forms.length ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-ink-muted">No forms yet. Create your first form.</td></tr>
                ) : null}
                {!isLoading && forms.map((form) => {
                  const views = Number(form.totalViews || 0)
                  const submissions = Number(form.totalSubmissions || 0)
                  const conversion = views > 0 ? ((submissions / views) * 100).toFixed(1) : '0.0'
                  return (
                    <tr key={form.id} className="group border-b border-surface-border last:border-b-0 hover:bg-brand-50">
                      <td className="px-3 py-2">
                        <p className="text-sm font-semibold text-ink">{form.name}</p>
                        <p className="text-xs text-ink-muted">{form.formTitle || 'Untitled display title'}</p>
                      </td>
                      <td className="px-3 py-2"><FormStatusBadge status={form.status} /></td>
                      <td className="px-3 py-2 capitalize text-ink-muted">{form.displayType || 'inline'}</td>
                      <td className="px-3 py-2 text-ink-muted">{views}</td>
                      <td className="px-3 py-2 text-ink-muted">{submissions}</td>
                      <td className="px-3 py-2 text-ink-muted">{conversion}%</td>
                      <td className="px-3 py-2 text-ink-muted">{new Date(form.updatedAt).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">
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
        maxWidthClassName="max-w-3xl"
      >
        <EmbedCodeModal formToken={shareForm?.publicToken} />
      </Modal>

      <Modal
        open={Boolean(submissionFormId)}
        onClose={() => setSubmissionFormId(null)}
        title={`Submissions: ${selectedFormDetail?.form?.name || ''}`}
        maxWidthClassName="max-w-5xl"
      >
        {submissionsLoading ? (
          <div className="rounded-xl border border-surface-border p-4 text-sm text-ink-muted">Loading submissions...</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-surface-border">
            <div className="max-h-[65vh] overflow-auto">
              <table className="w-full min-w-[900px] text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-surface-border">
                    <th className="px-3 py-2 text-left">Submitted At</th>
                    <th className="px-3 py-2 text-left">Lead</th>
                    <th className="px-3 py-2 text-left">Duplicate</th>
                    <th className="px-3 py-2 text-left">IP</th>
                    <th className="px-3 py-2 text-left">Referrer</th>
                    <th className="px-3 py-2 text-left">Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedSubmissions.length ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-muted">No submissions for this form yet.</td></tr>
                  ) : selectedSubmissions.map((sub) => (
                    <tr key={sub.id} className="border-b border-surface-border last:border-b-0">
                      <td className="px-3 py-2 text-ink-muted">{new Date(sub.submittedAt || sub.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2 text-ink-muted">{sub.leadId || '-'}</td>
                      <td className="px-3 py-2 text-ink-muted">{sub.isDuplicate ? 'Yes' : 'No'}</td>
                      <td className="px-3 py-2 text-ink-muted">{sub.ipAddress || '-'}</td>
                      <td className="px-3 py-2 text-ink-muted">{sub.referrerUrl || '-'}</td>
                      <td className="px-3 py-2"><pre className="max-w-[360px] whitespace-pre-wrap break-all text-[11px] text-ink-muted">{JSON.stringify(sub.data || {}, null, 2)}</pre></td>
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
