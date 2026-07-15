import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BadgeDollarSign, CheckCircle2, Clock, FileText, Pencil, Plus, Trash2, XCircle } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import {
  useListDealPaymentsQuery,
  useCreateDealPaymentMutation,
  usePatchDealPaymentMutation,
  useDeleteDealPaymentMutation,
} from '@/features/deals/dealPaymentsApi'
import { SkeletonList } from '@/components/shared/SkeletonLoader'

const MODES = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'other', label: 'Other' },
]

const STATUSES = [
  { value: 'received', label: 'Received' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
]

const STATUS_META = {
  received: { label: 'Received', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', Icon: CheckCircle2 },
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 ring-amber-200', Icon: Clock },
  failed: { label: 'Failed', cls: 'bg-rose-50 text-rose-700 ring-rose-200', Icon: XCircle },
  refunded: { label: 'Refunded', cls: 'bg-neutral-100 text-neutral-600 ring-neutral-200', Icon: XCircle },
}

const EMPTY_FORM = {
  amount: '',
  currency: 'USD',
  paymentDate: new Date().toISOString().slice(0, 10),
  mode: 'bank_transfer',
  reference: '',
  notes: '',
  status: 'received',
}

function fmtMoney(amount, currency = 'USD') {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '—'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n)
  } catch {
    return `${currency} ${n.toFixed(2)}`
  }
}

function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}

function PaymentForm({ initial, onSave, onCancel, saving, balanceBeforeThis }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial })
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const hasBalance = Number.isFinite(balanceBeforeThis)
  const entered = Number(form.amount) || 0
  const balanceAfter = hasBalance ? balanceBeforeThis - entered : null

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (!form.paymentDate) {
      toast.error('Payment date required')
      return
    }
    onSave({
      amount: Number(form.amount),
      currency: form.currency,
      paymentDate: form.paymentDate,
      mode: form.mode,
      reference: form.reference || null,
      notes: form.notes || null,
      status: form.status,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/40 p-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 block sm:col-span-1">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Amount *</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            className="h-9 w-full rounded-lg border border-surface-border px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            placeholder="0.00"
          />
          {hasBalance && (
            <p className="mt-1 text-[11px] text-ink-muted">
              {fmtMoney(Math.max(balanceBeforeThis, 0), form.currency)} left to collect
              {entered > 0 && (
                <>
                  {' · '}
                  {balanceAfter < 0 ? (
                    <span className="font-semibold text-rose-600">
                      Overpaying by {fmtMoney(Math.abs(balanceAfter), form.currency)}
                    </span>
                  ) : (
                    <span className="font-semibold text-emerald-700">
                      {fmtMoney(balanceAfter, form.currency)} left after this payment
                    </span>
                  )}
                </>
              )}
            </p>
          )}
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Currency</span>
          <input
            type="text"
            maxLength={3}
            className="h-9 w-full rounded-lg border border-surface-border px-3 text-sm uppercase outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            value={form.currency}
            onChange={(e) => set('currency', e.target.value.toUpperCase().slice(0, 3))}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Date *</span>
          <input
            type="date"
            required
            className="h-9 w-full rounded-lg border border-surface-border px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            value={form.paymentDate}
            onChange={(e) => set('paymentDate', e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Mode</span>
          <select
            className="h-9 w-full rounded-lg border border-surface-border px-2 text-sm outline-none focus:border-brand-500"
            value={form.mode}
            onChange={(e) => set('mode', e.target.value)}
          >
            {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Status</span>
          <select
            className="h-9 w-full rounded-lg border border-surface-border px-2 text-sm outline-none focus:border-brand-500"
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
          >
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Reference / Txn ID</span>
          <input
            type="text"
            maxLength={120}
            className="h-9 w-full rounded-lg border border-surface-border px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            value={form.reference}
            onChange={(e) => set('reference', e.target.value)}
            placeholder="Optional"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Notes</span>
        <textarea
          rows={2}
          maxLength={4000}
          className="w-full resize-none rounded-lg border border-surface-border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Optional notes…"
        />
      </label>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-subtle"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[var(--brand-primary)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[var(--brand-primary-dark)] disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save payment'}
        </button>
      </div>
    </form>
  )
}

export function DealPaymentsTab({ dealId, dealValue, dealCurrency }) {
  const { data, isLoading, refetch } = useListDealPaymentsQuery({ dealId }, { skip: !dealId })
  const [createPayment, { isLoading: creating }] = useCreateDealPaymentMutation()
  const [patchPayment, { isLoading: patching }] = usePatchDealPaymentMutation()
  const [deletePayment] = useDeleteDealPaymentMutation()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)

  const payments = useMemo(() => data?.data || [], [data?.data])

  const totalReceived = useMemo(
    () => payments.filter((p) => p.status === 'received').reduce((a, p) => a + Number(p.amount), 0),
    [payments],
  )
  const totalPending = useMemo(
    () => payments.filter((p) => p.status === 'pending').reduce((a, p) => a + Number(p.amount), 0),
    [payments],
  )

  async function handleCreate(body) {
    try {
      await createPayment({ dealId, ...body }).unwrap()
      toast.success('Payment recorded')
      setShowForm(false)
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not save payment')
    }
  }

  async function handlePatch(paymentId, body) {
    try {
      await patchPayment({ dealId, paymentId, ...body }).unwrap()
      toast.success('Payment updated')
      setEditId(null)
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not update payment')
    }
  }

  async function handleDelete(paymentId) {
    if (!window.confirm('Delete this payment? This cannot be undone.')) return
    try {
      await deletePayment({ dealId, paymentId }).unwrap()
      toast.success('Payment deleted')
      refetch()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not delete payment')
    }
  }

  if (isLoading) return <SkeletonList rows={4} />

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Deal value', val: fmtMoney(dealValue, dealCurrency), cls: 'bg-brand-50 text-brand-700' },
          { label: 'Received', val: fmtMoney(totalReceived, dealCurrency || 'USD'), cls: 'bg-emerald-50 text-emerald-700' },
          { label: 'Pending', val: fmtMoney(totalPending, dealCurrency || 'USD'), cls: 'bg-amber-50 text-amber-700' },
        ].map((c) => (
          <div key={c.label} className={cn('rounded-xl border border-surface-border px-3 py-2.5', c.cls)}>
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{c.label}</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums">{c.val}</p>
          </div>
        ))}
      </div>

      {/* Add button */}
      {!showForm && (
        <button
          type="button"
          onClick={() => { setShowForm(true); setEditId(null) }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-white px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Record payment
        </button>
      )}

      {/* Create form */}
      {showForm && (
        <PaymentForm
          initial={{ currency: dealCurrency || 'USD' }}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
          saving={creating}
          balanceBeforeThis={Number.isFinite(Number(dealValue)) ? Number(dealValue) - totalReceived : null}
        />
      )}

      {/* Payment list */}
      {payments.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-surface-border py-10 text-center">
          <BadgeDollarSign className="mx-auto h-9 w-9 text-ink-faint" />
          <p className="mt-2 text-sm font-medium text-ink">No payments recorded yet</p>
          <p className="mt-0.5 text-xs text-ink-muted">Click "Record payment" to add the first one.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {payments.map((p) => {
            const meta = STATUS_META[p.status] || STATUS_META.received
            const { Icon } = meta
            if (editId === p.id) {
              return (
                <li key={p.id}>
                  <PaymentForm
                    initial={{
                      amount: p.amount,
                      currency: p.currency,
                      paymentDate: p.paymentDate,
                      mode: p.mode,
                      reference: p.reference || '',
                      notes: p.notes || '',
                      status: p.status,
                    }}
                    onSave={(body) => handlePatch(p.id, body)}
                    onCancel={() => setEditId(null)}
                    saving={patching}
                    balanceBeforeThis={
                      Number.isFinite(Number(dealValue))
                        ? Number(dealValue) - totalReceived + (p.status === 'received' ? Number(p.amount) : 0)
                        : null
                    }
                  />
                </li>
              )
            }
            return (
              <li
                key={p.id}
                className="flex flex-col gap-2 rounded-xl border border-surface-border bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold tabular-nums text-ink">
                        {fmtMoney(p.amount, p.currency)}
                      </span>
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1', meta.cls)}>
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-ink-muted">
                      <span>{fmtDate(p.paymentDate)}</span>
                      <span className="capitalize">{(p.mode || '').replace(/_/g, ' ')}</span>
                      {p.reference && <span>Ref: <span className="font-medium text-ink">{p.reference}</span></span>}
                      {p.invoiceId && (
                        <Link
                          to={`/invoices/${p.invoiceId}/print`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                        >
                          <FileText className="h-3 w-3" />
                          {p.invoiceNumber || 'View invoice'}
                        </Link>
                      )}
                    </div>
                    {p.notes && (
                      <p className="mt-1 text-[11px] text-ink-muted">{p.notes}</p>
                    )}
                    {p.createdBy && (
                      <p className="mt-1 text-[10px] text-ink-faint">
                        By {p.createdBy.name || p.createdBy.email}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      title="Edit"
                      onClick={() => { setEditId(p.id); setShowForm(false) }}
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-brand-50 hover:text-brand-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => handleDelete(p.id)}
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
