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
  const templatesQuery = useGetSalesDocTemplatesQuery()
  const rows = templatesQuery.data?.data?.items ?? templatesQuery.data?.items ?? []

  const [deleteTpl] = useDeleteSalesDocTemplateMutation()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)

  function openEdit(row) {
    setEditingRow(row)
    setDrawerOpen(true)
  }

  function handleDelete(row) {
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
          onEdit={openEdit}
          onDelete={handleDelete}
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
