import { useState } from 'react'
import { DollarSign, Plus, Trash2, X } from '@/components/ui/icons'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import {
  useGetCampaignLeadPaymentsQuery,
  useCreateCampaignPaymentMutation,
  useDeleteCampaignPaymentMutation,
} from '@/features/campaigns/campaignsApi'
import { formatDealMoney } from '@/features/deals/dealCurrencies'

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

const STATUS_COLORS = {
  received: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  pending: 'bg-amber-100 text-amberald-800 ring-amber-200',
  failed: 'bg-red-100 text-red-800 ring-red-200',
  refunded: 'bg-slate-100 text-slate-700 ring-slate-200',
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

const EMPTY_FORM = {
  amount: '',
  paymentDate: today(),
  mode: 'bank_transfer',
  status: 'received',
  reference: '',
  notes: '',
}

export function CampaignPaymentsDrawer({ open, onClose, campaignId, leadId, leadName, currency = 'USD', campaignName }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  const { data: res, isLoading } = useGetCampaignLeadPaymentsQuery(
    { campaignId, leadId },
    { skip: !open || !campaignId || !leadId },
  )
  const payments = res?.data || []

  const [createPayment, { isLoading: creating }] = useCreateCampaignPaymentMutation()
  const [deletePayment, { isLoading: deleting }] = useDeleteCampaignPaymentMutation()

  const total = payments.reduce((sum, p) => sum + (p.status !== 'failed' && p.status !== 'refunded' ? Number(p.amount) : 0), 0)

  const onField = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const onSubmit = async (e) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) return
    try {
      await createPayment({
        campaignId,
        leadId,
        amount,
        currency,
        paymentDate: form.paymentDate,
        mode: form.mode,
        status: form.status,
        reference: form.reference || null,
        notes: form.notes || null,
      }).unwrap()
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch { /* toast handled in api */ }
  }

  const onDelete = async (paymentId) => {
    try {
      await deletePayment({ campaignId, leadId, paymentId }).unwrap()
      setDeleteConfirmId(null)
    } catch { /* toast handled in api */ }
  }

  const onDrawerClose = () => {
    setShowForm(false)
    setForm(EMPTY_FORM)
    setDeleteConfirmId(null)
    onClose()
  }

  return (
    <RightDrawer
      open={open}
      onClose={onDrawerClose}
      title={
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-neutral-900">Payments</span>
          {leadName && <span className="text-xs font-normal text-neutral-500 truncate max-w-[220px]">{leadName}</span>}
          {campaignName && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-full px-2 py-0.5 w-fit">
              <DollarSign className="h-2.5 w-2.5" />
              {campaignName}
            </span>
          )}
        </div>
      }
    >
      <div className="flex flex-col h-full">
        {/* Total strip */}
        <div className="mx-4 mt-3 mb-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Total received</p>
            <p className="text-xl font-bold tabular-nums text-emerald-900">{formatDealMoney(total, currency)}</p>
          </div>
          <p className="text-xs text-emerald-600 font-medium">{payments.length} payment{payments.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Add payment button */}
        <div className="px-4 mb-3">
          <Button
            type="button"
            size="sm"
            variant={showForm ? 'secondary' : 'primary'}
            className="w-full"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? (
              <><X className="h-3.5 w-3.5" /> Cancel</>
            ) : (
              <><Plus className="h-3.5 w-3.5" /> Add payment</>
            )}
          </Button>
        </div>

        {/* Add payment form */}
        {showForm && (
          <form onSubmit={onSubmit} className="mx-4 mb-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 flex flex-col gap-2.5">
            <h3 className="text-xs font-bold text-neutral-800 mb-0.5">New payment</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">Amount ({currency}) *</label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => onField('amount', e.target.value)}
                  placeholder="0.00"
                  className="h-8 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm tabular-nums outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">Date *</label>
                <input
                  type="date"
                  required
                  value={form.paymentDate}
                  onChange={(e) => onField('paymentDate', e.target.value)}
                  className="h-8 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => onField('status', e.target.value)}
                  className="h-8 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm outline-none focus:border-brand-500"
                >
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">Mode</label>
                <select
                  value={form.mode}
                  onChange={(e) => onField('mode', e.target.value)}
                  className="h-8 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm outline-none focus:border-brand-500"
                >
                  {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">Reference</label>
                <input
                  type="text"
                  value={form.reference}
                  onChange={(e) => onField('reference', e.target.value)}
                  placeholder="TXN123, cheque no., etc."
                  className="h-8 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm outline-none focus:border-brand-500"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => onField('notes', e.target.value)}
                  placeholder="Optional note…"
                  className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 resize-none"
                />
              </div>
            </div>
            <Button type="submit" size="sm" disabled={creating} className="w-full mt-1">
              {creating ? 'Saving…' : 'Save payment'}
            </Button>
          </form>
        )}

        {/* Payments list */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {isLoading ? (
            <div className="space-y-2 mt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-neutral-100 animate-pulse" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-10 text-center">
              <DollarSign className="mx-auto h-8 w-8 text-neutral-300 mb-2" />
              <p className="text-sm font-semibold text-neutral-500">No payments yet</p>
              <p className="text-xs text-neutral-400 mt-0.5">Click "Add payment" to record the first one.</p>
            </div>
          ) : (
            <div className="space-y-2 mt-1">
              {payments.map((p) => {
                const isConfirming = deleteConfirmId === p.id
                const modeLabel = p.mode.replace(/_/g, ' ')
                const statusColor = STATUS_COLORS[p.status] || STATUS_COLORS.pending
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-neutral-200 bg-white p-3 flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold tabular-nums text-neutral-900">
                          {formatDealMoney(Number(p.amount), p.currency)}
                        </span>
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1', statusColor)}>
                          {p.status}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutral-500">
                        <span>{p.paymentDate}</span>
                        <span className="capitalize">{modeLabel}</span>
                        {p.reference && <span>Ref: {p.reference}</span>}
                      </div>
                      {p.notes && (
                        <p className="mt-1 text-xs text-neutral-400 italic line-clamp-2">{p.notes}</p>
                      )}
                      {p.createdBy && (
                        <p className="mt-0.5 text-[10px] text-neutral-400">
                          by {p.createdBy.name || p.createdBy.email}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      {isConfirming ? (
                        <>
                          <button
                            type="button"
                            disabled={deleting}
                            onClick={() => onDelete(p.id)}
                            className="h-7 rounded-lg bg-red-600 px-2 text-[11px] font-semibold text-white hover:bg-red-700"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="h-7 rounded-lg border border-neutral-200 px-2 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(p.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </RightDrawer>
  )
}
