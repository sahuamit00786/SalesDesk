import { useState } from 'react'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { PageStack } from '@/components/layout/PageStack'
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

  function openEdit(row) {
    if (!canUpdate) {
      toast.error("You don't have permission to edit templates.")
      return
    }
    setEditingRow(row)
    setDrawerOpen(true)
  }

  function handleDelete(row) {
    if (!canDelete) {
      toast.error("You don't have permission to delete templates.")
      return
    }
    if (!confirm('Delete this template?')) return
    deleteTpl(row.id)
      .unwrap()
      .then(() => {
        toast.success('Deleted')
        templatesQuery.refetch()
      })
      .catch(() => toast.error('Could not delete'))
  }

  return (
    <PageShell fullWidth>
      <PageStack>
        <SalesDocTemplateGallery
          items={rows}
          docTypeConfig={DOC_TYPE_CONFIG}
          onEdit={canUpdate ? openEdit : undefined}
          onDelete={canDelete ? handleDelete : undefined}
        />
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
    </PageShell>
  )
}
