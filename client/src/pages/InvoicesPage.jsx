import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, Plus, RefreshCw, SlidersHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { PageStack } from '@/components/layout/PageStack'
import { PageFilterBar } from '@/components/layout/PageFilterBar'
import { PageContentPanel } from '@/components/layout/PageContentPanel'
import { Button } from '@/components/ui/Button'
import { DataGrid } from '@/components/shared/DataGrid'
import { useGetInvoicesQuery, useDeleteInvoiceMutation } from '@/features/sales-docs/invoicesApi'
import { useInvoiceGridColumns } from '@/features/sales-docs/components/useInvoiceGridColumns'
import { SalesDocStatCards } from '@/features/sales-docs/components/SalesDocStatCards'
import { INVOICE_STATUS_META, formatDocMoney } from '@/features/sales-docs/components/SalesDocListCells'
import { InvoicePaymentHistoryPanel } from '@/features/sales-docs/components/InvoicePaymentHistoryPanel'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DealDetailPanel } from '@/features/deals/components/DealDetailPanel'
import { useGetLeadFormMetaQuery, useGetLeadsQuery } from '@/features/leads/leadsApi'
import { SalesDocFiltersModal } from '@/features/sales-docs/components/SalesDocFiltersModal'

export function InvoicesPage() {
  const [params] = useSearchParams()
  const leadFilter = params.get('leadId')
  const [paymentPanelInvoiceId, setPaymentPanelInvoiceId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [selectedDeal, setSelectedDeal] = useState(null)

  const { data: formMetaData } = useGetLeadFormMetaQuery()
  const rawDealStatuses = formMetaData?.data?.dealStatuses || []
  const opportunityStatuses = formMetaData?.data?.opportunityStatuses || []
  const dealStatuses = rawDealStatuses.length ? rawDealStatuses : opportunityStatuses
  const users = formMetaData?.data?.users || []

  const { data: leadsRes } = useGetLeadsQuery({ page: 1, limit: 400, search: '' })
  const leads = leadsRes?.data || []

  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [leadIdFilter, setLeadIdFilter] = useState(leadFilter || '')
  const [createdByFilter, setCreatedByFilter] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const activeFilterCount = [statusFilter, dateFrom, dateTo, minAmount, maxAmount, leadIdFilter, createdByFilter].filter(
    (v) => v !== '',
  ).length

  function clearFilters() {
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
    setMinAmount('')
    setMaxAmount('')
    setLeadIdFilter('')
    setCreatedByFilter('')
  }

  const queryArg = useMemo(
    () => ({
      limit: 100,
      ...(leadIdFilter ? { leadId: leadIdFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(createdByFilter ? { createdBy: createdByFilter } : {}),
      ...(minAmount !== '' ? { minAmount } : {}),
      ...(maxAmount !== '' ? { maxAmount } : {}),
    }),
    [leadIdFilter, statusFilter, dateFrom, dateTo, createdByFilter, minAmount, maxAmount],
  )
  const { data, isLoading, refetch } = useGetInvoicesQuery(queryArg)
  const [deleteInvoice, { isLoading: deleting }] = useDeleteInvoiceMutation()

  const invoiceColumns = useInvoiceGridColumns({
    onPaymentClick: (row) => setPaymentPanelInvoiceId(row.id),
    setDeleteTarget,
    deleting,
    onDealClick: (row) => setSelectedDeal({ id: row.dealId, title: row.dealName, entityType: 'deal' }),
  })

  const rows = data?.data?.items ?? data?.items ?? []
  const summary = data?.meta?.summary

  const statCards = useMemo(() => {
    if (!summary) return []
    const by = summary.byStatus || {}
    const overdue = by.overdue || { count: 0, total: 0, paid: 0 }
    return [
      {
        key: 'invoiced',
        label: 'Total invoiced',
        value: formatDocMoney(summary.totalValue),
        tone: 'brand',
      },
      { key: 'collected', label: 'Collected', value: formatDocMoney(summary.totalPaid), tone: 'emerald' },
      { key: 'outstanding', label: 'Outstanding', value: formatDocMoney(summary.totalOutstanding), tone: 'amber' },
      {
        key: 'overdue',
        label: 'Overdue',
        value: formatDocMoney(Math.max(0, overdue.total - overdue.paid)),
        sub: `${overdue.count} invoice${overdue.count === 1 ? '' : 's'}`,
        tone: 'red',
      },
      { key: 'paid', label: 'Paid in full', value: by.paid?.count || 0, tone: 'emerald' },
    ]
  }, [summary])

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

  return (
    <PageShell fullWidth>
      <PageStack>
        <PageFilterBar className="flex-nowrap overflow-x-auto">
          <Button type="button" variant="secondary" onClick={() => setFiltersOpen(true)} className="relative">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 ? (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
          <Button type="button" variant="secondary" title="Refresh" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            title="Export all as CSV"
            onClick={() => {
              if (!rows.length) return
              const keys = ['invoiceNumber', 'status', 'grandTotal', 'amountPaid', 'currency', 'issueDate', 'dueDate']
              const csv = [
                keys.join(','),
                ...rows.map((r) =>
                  keys.map((k) => `"${String(r[k] ?? '').replaceAll('"', '""')}"`).join(','),
                ),
              ].join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            <Download className="h-4 w-4" />
          </Button>
          <div className="ml-auto">
            <Link
              to={leadIdFilter ? `/invoices/new?leadId=${encodeURIComponent(leadIdFilter)}` : '/invoices/new'}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" />
              New invoice
            </Link>
          </div>
        </PageFilterBar>

        <SalesDocFiltersModal
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          statusMeta={INVOICE_STATUS_META}
          leads={leads}
          users={users}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
          minAmount={minAmount}
          onMinAmountChange={setMinAmount}
          maxAmount={maxAmount}
          onMaxAmountChange={setMaxAmount}
          leadIdFilter={leadIdFilter}
          onLeadIdFilterChange={setLeadIdFilter}
          createdByFilter={createdByFilter}
          onCreatedByFilterChange={setCreatedByFilter}
          onClear={clearFilters}
        />

        <SalesDocStatCards cards={statCards} />

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
            emptyDescription="Create one from a deal or click New invoice."
            maxHeightClass="max-h-[min(72vh,680px)]"
            className="rounded-none border-0 shadow-none"
          />
        </PageContentPanel>

        <p className="text-xs text-ink-faint">
          Templates:{' '}
          <Link className="font-medium text-brand-600 hover:underline" to="/sales-docs/templates?tab=invoice">
            Invoice templates
          </Link>
        </p>
      </PageStack>

      <InvoicePaymentHistoryPanel
        invoiceId={paymentPanelInvoiceId}
        onClose={() => setPaymentPanelInvoiceId(null)}
      />

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
