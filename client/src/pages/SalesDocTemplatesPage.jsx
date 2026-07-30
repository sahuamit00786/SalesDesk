import { useState } from 'react'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { PageStack } from '@/components/layout/PageStack'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SalesDocTemplateGallery } from '@/features/sales-docs/components/SalesDocTemplateGallery'
import { SalesDocTemplateEditorDrawer } from '@/features/sales-docs/components/SalesDocTemplateEditorDrawer'
import {
  useGetSalesDocTemplatesQuery,
  useDeleteSalesDocTemplateMutation,
} from '@/features/sales-docs/salesDocTemplatesApi'
import { QUOTATION_PRESET_LABELS, INVOICE_PRESET_LABELS } from '@/features/sales-docs/presetLabels'
import { usePermission } from '@/hooks/usePermission'

const DOC_TYPE_CONFIG = {
  quotation: {
    presetLabels: QUOTATION_PRESET_LABELS,
    createHref: '/quotations/new',
  },
  invoice: {
    presetLabels: INVOICE_PRESET_LABELS,
    createHref: '/invoices/new',
  },
}

export function SalesDocTemplatesPage() {
  const canView = usePermission('manage.sales_doc_templates', 'view')
  const canUpdate = usePermission('manage.sales_doc_templates', 'update')
  const canDelete = usePermission('manage.sales_doc_templates', 'delete')
  const templatesQuery = useGetSalesDocTemplatesQuery(undefined, { skip: !canView })
  const rows = templatesQuery.data?.data?.items ?? templatesQuery.data?.items ?? []

  const [deleteTpl] = useDeleteSalesDocTemplateMutation()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  function openEdit(row) {
    if (!canUpdate) {
      toast.error("You don't have permission to edit templates.")
      return
    }
    setEditingRow(row)
    setDrawerOpen(true)
  }

  // BUG FIX (§15.2 of the bug audit) — bare `confirm()` is unstyled, blocks the main
  // thread, and is inconsistent with the app's own modal system used elsewhere.
  function handleDelete(row) {
    if (!canDelete) {
      toast.error("You don't have permission to delete templates.")
      return
    }
    setDeleteTarget(row)
  }

  function confirmDeleteTemplate() {
    if (!deleteTarget) return
    setDeleting(true)
    deleteTpl(deleteTarget.id)
      .unwrap()
      .then(() => {
        toast.success('Deleted')
        templatesQuery.refetch()
        setDeleteTarget(null)
      })
      .catch(() => toast.error('Could not delete'))
      .finally(() => setDeleting(false))
  }

  return (
    <PageShell fullWidth>
      <PageStack>
        {templatesQuery.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-sm text-red-800">
            Could not load sales doc templates.{templatesQuery.error?.data?.error?.message ? ` ${templatesQuery.error.data.error.message}` : ''}{' '}
            <button type="button" className="font-medium underline" onClick={templatesQuery.refetch}>Retry</button>
          </div>
        ) : (
          <SalesDocTemplateGallery
            items={rows}
            docTypeConfig={DOC_TYPE_CONFIG}
            onEdit={canUpdate ? openEdit : undefined}
            onDelete={canDelete ? handleDelete : undefined}
          />
        )}
      </PageStack>

      <SalesDocTemplateEditorDrawer
        open={drawerOpen}
        editingRow={editingRow}
        onClose={() => {
          setDrawerOpen(false)
          setEditingRow(null)
        }}
        onSaved={() => templatesQuery.refetch()}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => (deleting ? null : setDeleteTarget(null))}
        onConfirm={confirmDeleteTemplate}
        loading={deleting}
        title="Delete template?"
        description="Delete this template? This cannot be undone."
        confirmLabel="Delete"
      />
    </PageShell>
  )
}
