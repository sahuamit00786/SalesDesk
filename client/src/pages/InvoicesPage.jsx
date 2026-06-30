import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, Plus, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { PageStack } from '@/components/layout/PageStack'
import { PageFilterBar } from '@/components/layout/PageFilterBar'
import { PageContentPanel } from '@/components/layout/PageContentPanel'
import { Button } from '@/components/ui/Button'
import { DataGrid } from '@/components/shared/DataGrid'
import {
  useGetInvoicesQuery,
  usePatchInvoiceMutation,
  useRecordInvoicePaymentMutation,
  useDeleteInvoiceMutation,
} from '@/features/sales-docs/invoicesApi'
import { useInvoiceGridColumns } from '@/features/sales-docs/components/useInvoiceGridColumns'
import { CreateInvoiceDrawer } from '@/features/sales-docs/components/CreateInvoiceDrawer'
import { AssignToDealDrawer } from '@/features/sales-docs/components/AssignToDealDrawer'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DealDetailPanel } from '@/features/deals/components/DealDetailPanel'
import { useGetLeadFormMetaQuery } from '@/features/leads/leadsApi'

export function InvoicesPage() {
  const [params] = useSearchParams()
  const leadFilter = params.get('leadId')
  const [drawerOpen, setDrawerOpen] = useState(Boolean(params.get('new')))
  const [initialLead, setInitialLead] = useState(leadFilter || null)
  const [paymentInvoice, setPaymentInvoice] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMode, setPayMode] = useState('bank_transfer')
  const [assignInvoice, setAssignInvoice] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [selectedDeal, setSelectedDeal] = useState(null)

  const { data: formMetaData } = useGetLeadFormMetaQuery()
  const rawDealStatuses = formMetaData?.data?.dealStatuses || []
  const opportunityStatuses = formMetaData?.data?.opportunityStatuses || []
  const dealStatuses = rawDealStatuses.length ? rawDealStatuses : opportunityStatuses

  const queryArg = useMemo(() => ({ limit: 50, ...(leadFilter ? { leadId: leadFilter } : {}) }), [leadFilter])
  const { data, isLoading, refetch } = useGetInvoicesQuery(queryArg)
  const [recordPayment, { isLoading: paying }] = useRecordInvoicePaymentMutation()
  const [patchInvoice] = usePatchInvoiceMutation()
  const [deleteInvoice, { isLoading: deleting }] = useDeleteInvoiceMutation()

  const invoiceColumns = useInvoiceGridColumns({
    setAssignInvoice,
    setPaymentInvoice,
    setPayAmount,
    setDeleteTarget,
    deleting,
    onDealClick: (row) => setSelectedDeal({ id: row.dealId, title: row.dealName, entityType: 'deal' }),
  })

  const rows = data?.data?.items ?? data?.items ?? []

  async function confirmDelete() {
    if (!deleteTarget?.id) return
    try {
      await deleteInvoice(deleteTarget.id).unwrap()
      toast.success('Invoice deleted')
      setDeleteTarget(null)
      refetch()
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Delete failed')
    }
  }

  async function submitPayment() {
    if (!paymentInvoice) return
    const amount = Number(payAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    try {
      await recordPayment({
        id: paymentInvoice.id,
        amount,
        paidAt: new Date().toISOString(),
        mode: payMode,
      }).unwrap()
      toast.success('Payment recorded')
      setPaymentInvoice(null)
      setPayAmount('')
      refetch()
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Failed')
    }
  }

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
              const keys = ['invoiceNumber', 'status', 'totalAmount', 'currency', 'createdAt']
              const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => `"${String(r[k] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
              URL.revokeObjectURL(url)
            }}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Link
            to="/invoices/new"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-surface-border bg-white px-5 text-sm font-medium text-ink hover:border-brand-300 hover:bg-brand-50"
          >
            Full editor
          </Link>
          <div className="ml-auto">
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
            columns={invoiceColumns}
            data={rows}
            loading={isLoading}
            searchable={false}
            showColumnToggle={false}
            showExportCsv={false}
            defaultPageSize={25}
            emptyTitle="No invoices yet"
            emptyDescription="Create one from a deal or click Quick add."
            maxHeightClass="max-h-[min(72vh,680px)]"
            className="rounded-none border-0 shadow-none"
          />
        </PageContentPanel>

        <p className="text-xs text-ink-faint">
          Templates:{' '}
          <Link className="font-medium text-brand-600 hover:underline" to="/invoices/templates">
            Invoice templates
          </Link>
        </p>
      </PageStack>

      <CreateInvoiceDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} initialLeadId={initialLead} />

      <AssignToDealDrawer
        open={Boolean(assignInvoice)}
        onClose={() => setAssignInvoice(null)}
        docLabel={assignInvoice?.invoiceNumber}
        docType="Invoice"
        currentDealId={assignInvoice?.dealId}
        leadId={assignInvoice?.leadId || null}
        onAssign={async (dealId) => {
          await patchInvoice({ id: assignInvoice.id, dealId }).unwrap()
          toast.success('Invoice assigned to deal')
          setAssignInvoice(null)
          refetch()
        }}
      />

      <RightDrawer open={Boolean(paymentInvoice)} onClose={() => setPaymentInvoice(null)} title="Record payment">
        <div className="flex flex-col gap-3 px-1 pb-8 pt-2">
          <p className="text-sm text-ink-muted">
            Invoice <span className="font-semibold text-ink">{paymentInvoice?.invoiceNumber}</span>
          </p>
          <label className="text-xs font-medium text-ink-muted">
            Amount
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-ink-muted">
            Mode
            <select
              className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2 text-sm"
              value={payMode}
              onChange={(e) => setPayMode(e.target.value)}
            >
              <option value="bank_transfer">Bank transfer</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPaymentInvoice(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={paying} onClick={submitPayment}>
              {paying ? 'Saving…' : 'Save payment'}
            </Button>
          </div>
        </div>
      </RightDrawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete invoice?"
        description="This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      >
        <p>
          Delete invoice{' '}
          <span className="font-semibold text-ink">{deleteTarget?.invoiceNumber || 'this invoice'}</span>?
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
