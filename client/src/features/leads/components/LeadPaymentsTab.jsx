import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { useGetInvoicesQuery, useGetInvoiceQuery } from '@/features/sales-docs/invoicesApi'
import { formatDocMoney as fmtMoney } from '@/features/sales-docs/components/SalesDocListCells'

const MODE_LABELS = {
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  cheque: 'Cheque',
  upi: 'UPI',
  card: 'Card',
  crypto: 'Crypto',
  other: 'Other',
}

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

/** One invoice's payment rows — fetched individually since the list endpoint omits payments. */
function InvoicePaymentRows({ invoice }) {
  const { data } = useGetInvoiceQuery(invoice.id, { skip: !invoice.id })
  const payload = data?.data
  const full = payload?.data ?? payload
  const payments = full?.payments || []
  if (!payments.length) return null

  return (
    <div className="overflow-hidden rounded-xl border border-surface-border bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-surface-border bg-surface-subtle/50 px-4 py-2.5">
        <Link
          to={`/invoices/new?invoiceId=${encodeURIComponent(invoice.id)}`}
          className="text-sm font-semibold text-brand-700 hover:underline"
        >
          {invoice.invoiceNumber}
        </Link>
        <Link
          to={`/invoices/${invoice.id}/print`}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-ink-muted hover:text-ink"
        >
          View / Print
        </Link>
      </div>
      <div className="divide-y divide-surface-border">
        {payments.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <p className="text-sm font-medium tabular-nums text-ink">{fmtMoney(p.amount, invoice.currency)}</p>
            <p className="text-xs text-ink-faint">
              {fmtDate(p.paidAt)} · {MODE_LABELS[p.mode] || p.mode || '—'}
              {p.reference ? ` · Ref: ${p.reference}` : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/** All payments recorded across a lead's invoices, each linked back to its source invoice. */
export function LeadPaymentsTab({ leadId }) {
  const { data, isFetching } = useGetInvoicesQuery({ leadId, limit: 100 }, { skip: !leadId })
  const rows = data?.data?.items ?? data?.items ?? []
  const paidInvoices = useMemo(() => rows.filter((r) => Number(r.amountPaid) > 0), [rows])

  const totals = useMemo(
    () => ({
      totalInvoiced: rows.reduce((s, r) => s + (Number(r.grandTotal) || 0), 0),
      totalPaid: rows.reduce((s, r) => s + (Number(r.amountPaid) || 0), 0),
    }),
    [rows],
  )

  if (isFetching && rows.length === 0) {
    return <p className="mt-4 text-sm text-ink-muted">Loading payments…</p>
  }

  if (!paidInvoices.length) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-surface-border bg-surface-subtle/40 p-8 text-center">
        <Receipt className="mx-auto h-8 w-8 text-ink-faint" />
        <p className="mt-2 text-sm font-medium text-ink">No payments yet</p>
        <p className="mt-1 text-xs text-ink-muted">Payments recorded on this lead's invoices will show up here.</p>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="rounded-lg border border-surface-border bg-white px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-ink-muted">Total invoiced</p>
          <p className="font-semibold text-ink">{fmtMoney(totals.totalInvoiced)}</p>
        </div>
        <div className="rounded-lg border border-surface-border bg-white px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-ink-muted">Total collected</p>
          <p className="font-semibold text-emerald-700">{fmtMoney(totals.totalPaid)}</p>
        </div>
      </div>
      {paidInvoices.map((inv) => (
        <InvoicePaymentRows key={inv.id} invoice={inv} />
      ))}
    </div>
  )
}
