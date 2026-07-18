import { useMemo } from 'react'
import { useGetInvoicesQuery } from '@/features/sales-docs/invoicesApi'
import { formatDocMoney } from './SalesDocListCells'
import { cn } from '@/utils/cn'

const EXCLUDED_STATUSES = new Set(['cancelled', 'refunded'])

/** Shows deal value vs. what's already invoiced against it, so it's clear how much is left to bill. */
export function DealBalanceCard({ dealId, dealValue, dealCurrency, excludeInvoiceId }) {
  const { data, isFetching } = useGetInvoicesQuery({ dealId, limit: 200 }, { skip: !dealId })
  const rows = data?.data?.items ?? data?.items ?? []

  const alreadyInvoiced = useMemo(
    () =>
      rows
        .filter((r) => r.id !== excludeInvoiceId && !EXCLUDED_STATUSES.has(r.status))
        .reduce((sum, r) => sum + (Number(r.grandTotal) || 0), 0),
    [rows, excludeInvoiceId],
  )

  if (!dealId || dealValue == null) return null

  const currency = dealCurrency || 'USD'
  const remaining = Number(dealValue) - alreadyInvoiced

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-neutral-500">Deal value</span>
        <span className="font-medium text-neutral-800">{formatDocMoney(dealValue, currency)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-neutral-500">Already invoiced</span>
        <span className="font-medium text-neutral-800">
          {isFetching ? '…' : formatDocMoney(alreadyInvoiced, currency)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between border-t border-neutral-200 pt-1">
        <span className="font-semibold text-neutral-700">Remaining to invoice</span>
        <span className={cn('font-bold', remaining < 0 ? 'text-red-600' : 'text-emerald-700')}>
          {isFetching ? '…' : formatDocMoney(remaining, currency)}
        </span>
      </div>
    </div>
  )
}
