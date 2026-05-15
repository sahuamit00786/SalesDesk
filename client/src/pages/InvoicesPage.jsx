import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Printer, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { useGetInvoicesQuery, useRecordInvoicePaymentMutation } from '@/features/sales-docs/invoicesApi'
import { CreateInvoiceDrawer } from '@/features/sales-docs/components/CreateInvoiceDrawer'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { INVOICE_PRESET_LABELS } from '@/features/sales-docs/presetLabels'
import { cn } from '@/utils/cn'

function fmtMoney(n, c = 'USD') {
  const v = Number(n ?? 0)
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(v)
  } catch {
    return `${c} ${v.toFixed(2)}`
  }
}

export function InvoicesPage() {
  const [params] = useSearchParams()
  const leadFilter = params.get('leadId')
  const [drawerOpen, setDrawerOpen] = useState(Boolean(params.get('new')))
  const [initialLead, setInitialLead] = useState(leadFilter || null)
  const [paymentInvoice, setPaymentInvoice] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMode, setPayMode] = useState('bank_transfer')

  const queryArg = useMemo(() => ({ limit: 50, ...(leadFilter ? { leadId: leadFilter } : {}) }), [leadFilter])
  const { data, isLoading, refetch } = useGetInvoicesQuery(queryArg)
  const [recordPayment, { isLoading: paying }] = useRecordInvoicePaymentMutation()

  const rows = data?.data?.items ?? data?.items ?? []

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
    <PageShell>
      <div className="flex w-full min-w-0 flex-col gap-6 py-2">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Invoices</h1>
            <p className="mt-1 text-sm text-neutral-500">Issue invoices, track payments, print PDFs.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <Link
              to="/invoices/new"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 shadow-sm hover:bg-neutral-50"
            >
              Full editor
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-[#534AB7] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#483fa3]"
              onClick={() => {
                setInitialLead(leadFilter || null)
                setDrawerOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Quick add
            </button>
          </div>
        </header>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="cx-table text-sm">
            <thead className="cx-table-sticky-head">
              <tr>
                <th>Number</th>
                <th>Status</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Preset</th>
                <th className="cx-table-cell-actions text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-neutral-400">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-neutral-400">
                    No invoices yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium text-neutral-900">
                      <Link className="text-[#534AB7] hover:underline" to={`/invoices/new?invoiceId=${encodeURIComponent(row.id)}`}>
                        {row.invoiceNumber}
                      </Link>
                    </td>
                    <td>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          row.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-800'
                            : row.status === 'draft'
                              ? 'bg-neutral-100 text-neutral-700'
                              : 'bg-amber-50 text-amber-900',
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="tabular-nums">{fmtMoney(row.grandTotal, row.currency)}</td>
                    <td className="tabular-nums text-neutral-600">{fmtMoney(row.amountPaid, row.currency)}</td>
                    <td className="text-xs text-neutral-600">
                      {INVOICE_PRESET_LABELS[(Number(row.layoutPreset) || 1) - 1] || '—'}
                    </td>
                    <td className="cx-table-cell-actions text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/invoices/${row.id}/print`}
                          className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          PDF / Print
                        </Link>
                        {row.status !== 'paid' && row.status !== 'cancelled' ? (
                          <button
                            type="button"
                            className="rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium hover:bg-neutral-50"
                            onClick={() => {
                              setPaymentInvoice(row)
                              setPayAmount(String(Number(row.grandTotal) - Number(row.amountPaid || 0) || ''))
                            }}
                          >
                            Payment
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-neutral-400">
          Templates:{' '}
          <Link className="font-medium text-[#534AB7] hover:underline" to="/invoices/templates">
            Invoice templates
          </Link>
        </p>
      </div>

      <CreateInvoiceDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} initialLeadId={initialLead} />

      <RightDrawer open={Boolean(paymentInvoice)} onClose={() => setPaymentInvoice(null)} title="Record payment">
        <div className="flex flex-col gap-3 px-1 pb-8 pt-2">
          <p className="text-sm text-neutral-600">
            Invoice <span className="font-semibold text-neutral-900">{paymentInvoice?.invoiceNumber}</span>
          </p>
          <label className="text-xs font-medium text-neutral-600">
            Amount
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-neutral-600">
            Mode
            <select
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
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
            <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => setPaymentInvoice(null)}>
              Cancel
            </button>
            <button
              type="button"
              disabled={paying}
              className="rounded-lg bg-[#534AB7] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              onClick={submitPayment}
            >
              {paying ? 'Saving…' : 'Save payment'}
            </button>
          </div>
        </div>
      </RightDrawer>
    </PageShell>
  )
}
