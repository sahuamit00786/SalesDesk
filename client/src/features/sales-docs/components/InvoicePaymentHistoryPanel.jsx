import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { Button } from '@/components/ui/Button'
import {
  useGetInvoiceQuery,
  useRecordInvoicePaymentMutation,
  useDeleteInvoicePaymentMutation,
} from '@/features/sales-docs/invoicesApi'

function fmtMoney(n, currency = 'USD') {
  const v = Number(n ?? 0)
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(v) }
  catch { return `${currency} ${v.toFixed(2)}` }
}

function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

const MODE_LABELS = {
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  cheque: 'Cheque',
  upi: 'UPI',
  card: 'Card',
  crypto: 'Crypto',
  other: 'Other',
}

function SummaryCard({ label, value, tone }) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3 text-center',
        tone === 'green' && 'border-emerald-100 bg-emerald-50',
        tone === 'red' && 'border-red-100 bg-red-50',
        tone === 'amber' && 'border-amber-100 bg-amber-50',
        !tone && 'border-surface-border bg-surface-subtle',
      )}
    >
      <p
        className={cn(
          'text-xs font-medium',
          tone === 'green' && 'text-emerald-700',
          tone === 'red' && 'text-red-600',
          tone === 'amber' && 'text-amber-700',
          !tone && 'text-ink-muted',
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 text-sm font-semibold tabular-nums',
          tone === 'green' && 'text-emerald-900',
          tone === 'red' && 'text-red-800',
          tone === 'amber' && 'text-amber-900',
          !tone && 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  )
}

export function InvoicePaymentHistoryPanel({ invoiceId, onClose }) {
  const [amount, setAmount] = useState('')
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [mode, setMode] = useState('bank_transfer')
  const [reference, setReference] = useState('')

  const { data: res, isLoading } = useGetInvoiceQuery(invoiceId, { skip: !invoiceId })
  const [recordPayment, { isLoading: recording }] = useRecordInvoicePaymentMutation()
  const [deletePayment, { isLoading: deleting }] = useDeleteInvoicePaymentMutation()

  const payload = res?.data
  const inv = payload?.data ?? payload

  const currency = inv?.currency || 'USD'
  const payments = inv?.payments || []
  const grandTotal = Number(inv?.grandTotal ?? 0)
  const amountPaid = Number(inv?.amountPaid ?? 0)
  const balanceDue = Math.max(0, grandTotal - amountPaid)

  async function handleRecord() {
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    try {
      await recordPayment({
        id: invoiceId,
        amount: amt,
        paidAt: new Date(payDate).toISOString(),
        mode,
        ...(reference.trim() ? { reference: reference.trim() } : {}),
      }).unwrap()
      toast.success('Payment recorded')
      setAmount('')
      setReference('')
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Failed to record payment')
    }
  }

  async function handleDelete(paymentId) {
    try {
      await deletePayment({ id: invoiceId, paymentId }).unwrap()
      toast.success('Payment removed')
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Failed to remove payment')
    }
  }

  return (
    <RightDrawer open={Boolean(invoiceId)} onClose={onClose} title={`Payments — ${inv?.invoiceNumber || '…'}`}>
      {isLoading ? (
        <p className="px-1 pt-4 text-sm text-ink-muted">Loading…</p>
      ) : !inv ? (
        <p className="px-1 pt-4 text-sm text-ink-muted">Invoice not found.</p>
      ) : (
        <div className="flex flex-col gap-6 px-1 pb-8 pt-2">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2">
            <SummaryCard label="Total" value={fmtMoney(grandTotal, currency)} />
            <SummaryCard label="Paid" value={fmtMoney(amountPaid, currency)} tone="green" />
            <SummaryCard
              label="Due"
              value={fmtMoney(balanceDue, currency)}
              tone={balanceDue <= 0 ? 'green' : inv.status === 'overdue' ? 'red' : 'amber'}
            />
          </div>

          {/* History */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Payment history</p>
            {payments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-surface-border py-6 text-center text-sm text-ink-faint">
                No payments recorded yet
              </p>
            ) : (
              <div className="overflow-hidden divide-y divide-surface-border rounded-xl border border-surface-border">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-3 px-3 py-2.5 hover:bg-surface-subtle/50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold tabular-nums text-ink">
                          {fmtMoney(p.amount, currency)}
                        </span>
                        <span className="text-xs text-ink-muted">{MODE_LABELS[p.mode] || p.mode}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-faint">{fmtDate(p.paidAt)}</p>
                      {p.reference ? (
                        <p className="text-xs text-ink-faint">Ref: {p.reference}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      title="Remove payment"
                      disabled={deleting}
                      onClick={() => handleDelete(p.id)}
                      className="shrink-0 rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Record payment */}
          <div className="rounded-xl border border-surface-border bg-surface-subtle p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">Record payment</p>
            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-ink-muted">
                Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm"
                  placeholder={balanceDue > 0 ? balanceDue.toFixed(2) : '0.00'}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <label className="text-xs font-medium text-ink-muted">
                Date
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </label>
              <label className="text-xs font-medium text-ink-muted">
                Mode
                <select
                  className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="crypto">Crypto</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="text-xs font-medium text-ink-muted">
                Reference
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm"
                  placeholder="Transaction ID / cheque number"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </label>
              <div className="flex justify-end pt-1">
                <Button type="button" disabled={recording} onClick={handleRecord}>
                  {recording ? 'Saving…' : 'Save payment'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </RightDrawer>
  )
}
