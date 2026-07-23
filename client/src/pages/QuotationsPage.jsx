import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Download, Plus, RefreshCw, SlidersHorizontal } from '@/components/ui/icons'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { PageStack } from '@/components/layout/PageStack'
import { PageFilterBar } from '@/components/layout/PageFilterBar'
import { PageContentPanel } from '@/components/layout/PageContentPanel'
import { Button } from '@/components/ui/Button'
import {
  useGetQuotationsQuery,
  useConvertQuotationToInvoiceMutation,
  useDeleteQuotationMutation,
} from '@/features/sales-docs/quotationsApi'
import { useQuotationGridColumns } from '@/features/sales-docs/components/useQuotationGridColumns'
import { SalesDocStatCards } from '@/features/sales-docs/components/SalesDocStatCards'
import { QUOTATION_STATUS_META, formatDocMoney } from '@/features/sales-docs/components/SalesDocListCells'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataGrid } from '@/components/shared/DataGrid'
import { DealDetailPanel } from '@/features/deals/components/DealDetailPanel'
import { useGetLeadFormMetaQuery, useGetLeadsQuery } from '@/features/leads/leadsApi'
import { SalesDocFiltersModal } from '@/features/sales-docs/components/SalesDocFiltersModal'
import { usePermission } from '@/hooks/usePermission'

export function QuotationsPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const leadFilter = params.get('leadId')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [convertTarget, setConvertTarget] = useState(null)
  const [selectedDeal, setSelectedDeal] = useState(null)
  const canViewQuotations = usePermission('manage.quotations', 'view')
  const canCreateQuotations = usePermission('manage.quotations', 'create')

  const { data: formMetaData } = useGetLeadFormMetaQuery()
  const rawDealStatuses = formMetaData?.data?.dealStatuses || []
  const pipelineStatuses = formMetaData?.data?.pipelineStatuses || []
  const dealStatuses = rawDealStatuses.length ? rawDealStatuses : pipelineStatuses
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
  const { data, isLoading, refetch } = useGetQuotationsQuery(queryArg, { skip: !canViewQuotations })
  const [convert, { isLoading: converting }] = useConvertQuotationToInvoiceMutation()
  const [deleteQuotation, { isLoading: deleting }] = useDeleteQuotationMutation()

  const onConvert = useCallback((row) => setConvertTarget(row), [])

  async function confirmConvert() {
    if (!convertTarget?.id) return
    try {
      const result = await convert({ id: convertTarget.id }).unwrap()
      const invoice = result?.data?.data ?? result?.data ?? result
      const invNum = invoice?.invoiceNumber
      toast.success(invNum ? `Invoice ${invNum} created` : 'Converted to invoice')
      setConvertTarget(null)
      navigate('/invoices')
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Conversion failed')
    }
  }

  const quotationColumns = useQuotationGridColumns({
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
  const summary = data?.meta?.summary

  const statCards = useMemo(() => {
    if (!summary) return []
    const by = summary.byStatus || {}
    const count = (k) => by[k]?.count || 0
    return [
      {
        key: 'total',
        label: 'Total value',
        value: formatDocMoney(summary.totalValue),
        tone: 'brand',
      },
      { key: 'draft', label: 'Draft', value: count('draft'), tone: 'neutral' },
      { key: 'sent', label: 'Sent / Viewed', value: count('sent') + count('viewed'), tone: 'sky' },
      { key: 'accepted', label: 'Accepted', value: count('accepted'), tone: 'emerald' },
      { key: 'converted', label: 'Converted', value: count('converted'), tone: 'emerald' },
    ]
  }, [summary])

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
          {canViewQuotations ? (
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
          ) : null}
          <div className="ml-auto flex gap-2">
            {canCreateQuotations ? (
              <Link
                to={leadIdFilter ? `/quotations/new?leadId=${encodeURIComponent(leadIdFilter)}` : '/quotations/new'}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-medium cx-icon-inherit text-white hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" />
                New quotation
              </Link>
            ) : null}
          </div>
        </PageFilterBar>

        <SalesDocFiltersModal
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          statusMeta={QUOTATION_STATUS_META}
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

      <ConfirmDialog
        open={Boolean(convertTarget)}
        onClose={() => setConvertTarget(null)}
        onConfirm={confirmConvert}
        title="Convert to invoice?"
        description="An invoice is created from this quotation and the quotation becomes locked."
        confirmLabel="Convert"
        loading={converting}
      >
        <p>
          Convert quotation{' '}
          <span className="font-semibold text-ink">{convertTarget?.quotationNumber || 'this quotation'}</span> into a
          new invoice? The quotation will be marked as converted and can no longer be edited. Payments are collected
          on the invoice.
        </p>
      </ConfirmDialog>

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
        pipelineStatuses={dealStatuses}
      />
    </PageShell>
  )
}
