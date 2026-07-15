import { useMemo, useState } from 'react'
import { Download, ExternalLink, Eye, Pencil, Plus, RefreshCw, Trash2 } from '@/components/ui/icons'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { PageShell } from '@/components/layout/PageShell'
import { PageStack } from '@/components/layout/PageStack'
import { PageFilterBar } from '@/components/layout/PageFilterBar'
import { PageContentPanel } from '@/components/layout/PageContentPanel'
import { Button } from '@/components/ui/Button'
import { inputFieldClassName } from '@/components/ui/Input'
import { cn } from '@/utils/cn'
import { DataGrid } from '@/components/shared/DataGrid'
import { EmbedCodeModal } from '../components/embed/EmbedCodeModal'
import { FormStatusBadge } from '../components/shared/FormStatusBadge'
import {
  useDeleteWebFormMutation,
  useGetWebFormQuery,
  useGetWebFormsQuery,
  useUpdateWebFormMutation,
} from '../webFormsApi'

export function WebFormsListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [shareForm, setShareForm] = useState(null)
  const [submissionFormId, setSubmissionFormId] = useState(null)
  const [deleteForm, setDeleteForm] = useState(null)
  const { data, isLoading, refetch } = useGetWebFormsQuery('')
  const { data: formDetailData, isLoading: submissionsLoading } = useGetWebFormQuery(submissionFormId, {
    skip: !submissionFormId,
  })
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

  function openNewFormBuilder() {
    navigate('/forms/new/builder')
  }

  function exportCsv() {
    const headers = ['Name', 'Title', 'Status', 'Display', 'Views', 'Submissions', 'Conversion', 'Updated']
    const rows = forms.map((f) => {
      const views = Number(f.totalViews || 0)
      const subs = Number(f.totalSubmissions || 0)
      const conv = views > 0 ? `${((subs / views) * 100).toFixed(1)}%` : '0.0%'
      return [f.name, f.formTitle || '', f.status, f.displayType || 'inline', views, subs, conv, new Date(f.updatedAt).toLocaleString()]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'forms.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function activateForm(form) {
    await updateWebForm({ id: form.id, status: 'active' }).unwrap()
    refetch()
  }

  const formsGridColumns = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Form',
        flex: 1,
        minWidth: 180,
        renderCell: ({ row }) => (
          <div>
            <p className="text-sm font-semibold text-ink">{row.name}</p>
            <p className="text-xs text-ink-muted">{row.formTitle || 'Untitled display title'}</p>
          </div>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 100,
        renderCell: ({ row }) => <FormStatusBadge status={row.status} />,
      },
      {
        field: 'displayType',
        headerName: 'Display',
        width: 100,
        valueGetter: (_v, row) => row.displayType || 'inline',
      },
      { field: 'totalViews', headerName: 'Views', width: 80 },
      { field: 'totalSubmissions', headerName: 'Submissions', width: 100 },
      {
        field: 'conversion',
        headerName: 'Conversion',
        width: 100,
        valueGetter: (_v, row) => {
          const views = Number(row.totalViews || 0)
          const submissions = Number(row.totalSubmissions || 0)
          return views > 0 ? `${((submissions / views) * 100).toFixed(1)}%` : '0.0%'
        },
      },
      {
        field: 'updatedAt',
        headerName: 'Updated',
        width: 160,
        valueGetter: (_v, row) => new Date(row.updatedAt).toLocaleString(),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 200,
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }) => (
          <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {row.status !== 'active' ? (
              <button
                type="button"
                onClick={() => activateForm(row)}
                disabled={updating}
                className="h-8 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-medium text-emerald-700"
                title="Activate form for sharing"
              >
                Publish
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => navigate(`/forms/${row.id}/builder`)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-200 bg-white text-brand-700"
              title="Builder"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShareForm(row)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border bg-white text-ink-muted"
              title="Share / Embed"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSubmissionFormId(row.id)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border bg-white text-ink-muted"
              title="Submissions"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeleteForm(row)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-danger"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [navigate, updating],
  )

  const submissionGridColumns = useMemo(() => {
    const cols = [
      {
        field: 'submittedAt',
        headerName: 'Submitted At',
        width: 160,
        valueGetter: (_v, row) =>
          new Date(row.submittedAt || row.createdAt).toLocaleString(),
      },
    ]
    for (const field of submissionColumns) {
      cols.push({
        field: `field_${field.id}`,
        headerName: field.label || field.type || 'Field',
        flex: 1,
        minWidth: 120,
        valueGetter: (_v, row) => String(row.data?.[field.id] ?? '-'),
      })
    }
    return cols
  }, [submissionColumns])

  const submissionRows = useMemo(
    () =>
      selectedSubmissions.map((sub) => ({
        ...sub,
        id: sub.id,
        data: sub.data,
      })),
    [selectedSubmissions],
  )

  return (
    <PageShell fullWidth>
      <PageStack>
        <PageFilterBar>
          <input
            className={cn(inputFieldClassName, 'max-w-sm flex-1')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search forms..."
          />
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="secondary" title="Refresh" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button type="button" variant="secondary" onClick={exportCsv} disabled={forms.length === 0}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button type="button" onClick={openNewFormBuilder}>
              <Plus className="h-4 w-4" />
              New form
            </Button>
          </div>
        </PageFilterBar>
        <PageContentPanel flush>
        <DataGrid
          gridColumns
          columns={formsGridColumns}
          data={forms}
          loading={isLoading}
          searchable={false}
          showColumnToggle={false}
          showExportCsv={false}
          defaultPageSize={20}
          emptyTitle="No forms yet"
          emptyDescription="Create your first form."
          maxHeightClass="max-h-[min(72vh,680px)]"
          className="rounded-none border-0 shadow-none"
        />
        </PageContentPanel>
      </PageStack>

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
          <div className="rounded-xl border border-surface-border p-4 text-sm text-ink-muted">
            Loading submissions...
          </div>
        ) : (
          <DataGrid
            gridColumns
            columns={submissionGridColumns}
            data={submissionRows}
            searchable={false}
            showColumnToggle={false}
            showExportCsv={false}
            defaultPageSize={25}
            emptyTitle="No submissions for this form yet"
            maxHeightClass="max-h-[65vh]"
          />
        )}
      </Modal>

      <Modal
        open={Boolean(deleteForm)}
        onClose={() => setDeleteForm(null)}
        title="Delete form"
        maxWidthClassName="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteForm(null)}
              className="h-9 rounded-xl border border-surface-border px-4 text-sm"
            >
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
        }
      >
        <p className="text-sm text-ink-muted">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-ink">{deleteForm?.name || 'this form'}</span>? This action cannot be
          undone.
        </p>
      </Modal>
    </PageShell>
  )
}
