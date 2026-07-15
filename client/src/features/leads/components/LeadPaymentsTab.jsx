import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, Bitcoin, CreditCard, FileText, HelpCircle, Landmark, Receipt, Smartphone } from '@/components/ui/icons'
import { useGetInvoicesQuery } from '@/features/sales-docs/invoicesApi'
import { formatDocMoney as fmtMoney } from '@/features/sales-docs/components/SalesDocListCells'

const MODE_META = {
  bank_transfer: { label: 'Bank transfer', Icon: Landmark },
  cash: { label: 'Cash', Icon: Banknote },
  cheque: { label: 'Cheque', Icon: FileText },
  upi: { label: 'UPI', Icon: Smartphone },
  card: { label: 'Card', Icon: CreditCard },
  crypto: { label: 'Crypto', Icon: Bitcoin },
  other: { label: 'Other', Icon: HelpCircle },
}

const STATUS_META = {
  paid: { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  partially_paid: { label: 'Partially paid', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  overdue: { label: 'Overdue', cls: 'bg-red-50 text-red-700 ring-red-200' },
  issued: { label: 'Issued', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
}

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

/** One invoice as a card — status, collection progress, and every payment recorded against it. */
function InvoicePaymentCard({ invoice }) {
  const payments = invoice.payments || []
  const total = Number(invoice.grandTotal) || 0
  const paid = Number(invoice.amountPaid) || 0
  const outstanding = Math.max(0, total - paid)
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0
  const status = STATUS_META[invoice.status] || STATUS_META.issued

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/invoices/new?invoiceId=${encodeURIComponent(invoice.id)}`}
              className="truncate text-sm font-semibold text-brand-700 hover:underline"
            >
              {invoice.invoiceNumber}
            </Link>
            <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${status.cls}`}>
              {status.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-ink-faint">
            Issued {fmtDate(invoice.issueDate)}{invoice.dueDate ? ` · Due ${fmtDate(invoice.dueDate)}` : ''}
          </p>
        </div>
        <Link
          to={`/invoices/${invoice.id}/print`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-xs font-medium text-ink-muted hover:text-ink"
        >
          View / Print
        </Link>
      </div>

      <div className="space-y-2 border-b border-surface-border bg-surface-subtle/30 px-4 py-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-muted">
            {fmtMoney(paid, invoice.currency)} of {fmtMoney(total, invoice.currency)} collected
          </span>
          <span className="font-semibold text-ink">{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {outstanding > 0 && (
          <p className="text-[11px] font-medium text-amber-700">{fmtMoney(outstanding, invoice.currency)} outstanding</p>
        )}
      </div>

      <div className="divide-y divide-surface-border">
        {payments.map((p) => {
          const meta = MODE_META[p.mode] || MODE_META.other
          const Icon = meta.Icon
          return (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold tabular-nums text-ink">{fmtMoney(p.amount, invoice.currency)}</p>
                <p className="truncate text-xs text-ink-faint">
                  {meta.label}{p.reference ? ` · Ref: ${p.reference}` : ''}
                </p>
              </div>
              <span className="shrink-0 text-xs text-ink-faint">{fmtDate(p.paidAt)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** All payments recorded across a lead's invoices, grouped as one card per invoice. */
export function LeadPaymentsTab({ leadId }) {
  const { data, isFetching } = useGetInvoicesQuery({ leadId, limit: 100 }, { skip: !leadId })
  const rows = data?.data?.items ?? data?.items ?? []
  const paidInvoices = useMemo(() => rows.filter((r) => Number(r.amountPaid) > 0), [rows])

  // Grouped by currency — summing mixed currencies into one number would be meaningless.
  const totalsByCurrency = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const currency = r.currency || 'USD'
      const entry = map.get(currency) || { currency, invoiced: 0, paid: 0 }
      entry.invoiced += Number(r.grandTotal) || 0
      entry.paid += Number(r.amountPaid) || 0
      map.set(currency, entry)
    }
    return [...map.values()]
  }, [rows])

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
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-3">
        {totalsByCurrency.map((t) => {
          const outstanding = Math.max(0, t.invoiced - t.paid)
          return (
            <div
              key={t.currency}
              className="grid grid-cols-3 divide-x divide-surface-border overflow-hidden rounded-2xl border border-surface-border bg-white text-sm shadow-sm"
            >
              <div className="px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Invoiced</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-ink">{fmtMoney(t.invoiced, t.currency)}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Collected</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-700">{fmtMoney(t.paid, t.currency)}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Outstanding</p>
                <p className={`mt-0.5 text-lg font-bold tabular-nums ${outstanding > 0 ? 'text-amber-700' : 'text-ink'}`}>
                  {fmtMoney(outstanding, t.currency)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-3">
        {paidInvoices.map((inv) => (
          <InvoicePaymentCard key={inv.id} invoice={inv} />
        ))}
      </div>
    </div>
  )
}
