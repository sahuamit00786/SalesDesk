import { useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, Plus, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { PageStack } from '@/components/layout/PageStack'
import { PageFilterBar } from '@/components/layout/PageFilterBar'
import { PageContentPanel } from '@/components/layout/PageContentPanel'
import { Button } from '@/components/ui/Button'
import {
  useGetQuotationsQuery,
  usePatchQuotationMutation,
  useConvertQuotationToInvoiceMutation,
  useDeleteQuotationMutation,
} from '@/features/sales-docs/quotationsApi'
import { CreateQuotationDrawer } from '@/features/sales-docs/components/CreateQuotationDrawer'
import { AssignToDealDrawer } from '@/features/sales-docs/components/AssignToDealDrawer'
import { useQuotationGridColumns } from '@/features/sales-docs/components/useQuotationGridColumns'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataGrid } from '@/components/shared/DataGrid'
import { DealDetailPanel } from '@/features/deals/components/DealDetailPanel'
import { useGetLeadFormMetaQuery } from '@/features/leads/leadsApi'

export function QuotationsPage() {
  const [params] = useSearchParams()
  const leadFilter = params.get('leadId')
  const [drawerOpen, setDrawerOpen] = useState(Boolean(params.get('new')))
  const [initialLead, setInitialLead] = useState(leadFilter || null)
  const [assignQuotation, setAssignQuotation] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [selectedDeal, setSelectedDeal] = useState(null)

  const { data: formMetaData } = useGetLeadFormMetaQuery()
  const rawDealStatuses = formMetaData?.data?.dealStatuses || []
  const opportunityStatuses = formMetaData?.data?.opportunityStatuses || []
  const dealStatuses = rawDealStatuses.length ? rawDealStatuses : opportunityStatuses

  const queryArg = useMemo(() => ({ limit: 50, ...(leadFilter ? { leadId: leadFilter } : {}) }), [leadFilter])
  const { data, isLoading, refetch } = useGetQuotationsQuery(queryArg)
  const [convert, { isLoading: converting }] = useConvertQuotationToInvoiceMutation()
  const [patchQuotation] = usePatchQuotationMutation()
  const [deleteQuotation, { isLoading: deleting }] = useDeleteQuotationMutation()

  const onConvert = useCallback(
    async (row) => {
      try {
        await convert({ id: row.id }).unwrap()
        const client = row.customerSnapshot?.contactName || row.customerSnapshot?.companyName
        toast.success(client ? `Invoice created for ${client}` : 'Converted to invoice')
        refetch()
      } catch (e) {
        toast.error(e?.data?.error?.message || 'Conversion failed')
      }
    },
    [convert, refetch],
  )

  const quotationColumns = useQuotationGridColumns({
    setAssignQuotation,
    setDeleteTarget,
    deleting,
    converting,
    onConvert,
    onDealClick: (row) => setSelectedDeal({ id: row.dealId, title: row.dealName, entityType: 'deal' }),
  })

  async function confirmDelete() {
    if (!deleteTarget?.id) return
    try {
      await deleteQuotation(deleteTarget.id).unwrap()
      toast.success('Quotation deleted')
      setDeleteTarget(null)
      refetch()
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Delete failed')
    }
  }

  const rows = data?.data?.items ?? data?.items ?? []

  return (
    <PageShell fullWidth>
      <PageStack>
        <PageFilterBar>
          <Button type="button" variant="secondary" title="Refresh" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            title="Export all as CSV"
            onClick={() => {
              if (!rows.length) return
              const keys = ['quotationNumber', 'status', 'totalAmount', 'currency', 'createdAt']
              const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => `"${String(r[k] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = `quotations-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
              URL.revokeObjectURL(url)
            }}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Link
            to="/quotations/templates"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink hover:border-brand-200 hover:bg-brand-50"
          >
            Templates
          </Link>
          <Link
            to="/quotations/new"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-surface-border bg-white px-4 text-sm font-medium text-ink hover:border-brand-200 hover:bg-brand-50"
          >
            Full editor
          </Link>
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              onClick={() => {
                setInitialLead(leadFilter || null)
                setDrawerOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Quick add
            </Button>
          </div>
        </PageFilterBar>

        <PageContentPanel flush>
          <DataGrid
            gridColumns
            columns={quotationColumns}
            data={rows}
            loading={isLoading}
            searchable={false}
            showColumnToggle={false}
            showExportCsv={false}
            defaultPageSize={25}
            emptyTitle="No quotations yet"
            emptyDescription="Create one from a deal or click New quotation."
            className="rounded-none border-0 shadow-none"
          />
        </PageContentPanel>
      </PageStack>

      <CreateQuotationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} initialLeadId={initialLead} />

      <AssignToDealDrawer
        open={Boolean(assignQuotation)}
        onClose={() => setAssignQuotation(null)}
        docLabel={assignQuotation?.quotationNumber}
        docType="Quotation"
        currentDealId={assignQuotation?.dealId}
        leadId={assignQuotation?.leadId || null}
        onAssign={async (dealId) => {
          await patchQuotation({ id: assignQuotation.id, dealId }).unwrap()
          toast.success('Quotation assigned to deal')
          setAssignQuotation(null)
          refetch()
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete quotation?"
        description="This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      >
        <p>
          Delete quotation{' '}
          <span className="font-semibold text-ink">{deleteTarget?.quotationNumber || 'this quotation'}</span>?
        </p>
      </ConfirmDialog>

      <DealDetailPanel
        open={Boolean(selectedDeal)}
        onClose={() => setSelectedDeal(null)}
        opp={selectedDeal}
        opportunityStatuses={dealStatuses}
      />
    </PageShell>
  )
}
