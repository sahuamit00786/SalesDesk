import { useState } from 'react'
import { Briefcase, Building2, Mail, Phone, TrendingUp, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { useGetDealsQuery } from '@/features/deals/dealsApi'
import { cn } from '@/utils/cn'

function fmtMoney(n, c = 'USD') {
  const v = Number(n ?? 0)
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(v)
  } catch {
    return `${c} ${v.toFixed(2)}`
  }
}

function DealPreview({ deal }) {
  if (!deal) return null
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Lead details</p>
      <div className="flex flex-col gap-1.5">
        {deal.fullName ? (
          <div className="flex items-center gap-2 text-sm text-neutral-700">
            <User className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span className="font-medium">{deal.fullName}</span>
          </div>
        ) : null}
        {deal.companyName ? (
          <div className="flex items-center gap-2 text-sm text-neutral-700">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span>{deal.companyName}</span>
          </div>
        ) : null}
        {deal.email ? (
          <div className="flex items-center gap-2 text-sm text-neutral-700">
            <Mail className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span className="truncate">{deal.email}</span>
          </div>
        ) : null}
        {deal.phoneNumber ? (
          <div className="flex items-center gap-2 text-sm text-neutral-700">
            <Phone className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span>{deal.phoneNumber}</span>
          </div>
        ) : null}
        <div className="mt-1 flex items-center gap-4 border-t border-neutral-200 pt-2">
          {deal.dealValue != null ? (
            <div className="flex items-center gap-1.5 text-sm">
              <TrendingUp className="h-3.5 w-3.5 text-neutral-400" />
              <span className="font-medium text-neutral-800">
                {fmtMoney(deal.dealValue, deal.dealCurrency || 'USD')}
              </span>
            </div>
          ) : null}
          {deal.currentStage ? (
            <span className="rounded-full bg-[var(--brand-primary)]/10 px-2 py-0.5 text-[11px] font-medium text-brand-600">
              {deal.currentStage}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/**
 * Drawer for assigning an invoice or quotation to a deal.
 *
 * Props:
 *  open         - boolean
 *  onClose      - () => void
 *  docLabel     - e.g. "INV-1001" or "QT-1001"
 *  docType      - "Invoice" | "Quotation"
 *  currentDealId - string | null  (already-assigned deal, if any)
 *  leadId       - string | null   (when set, only shows deals for this lead)
 *  onAssign     - async (dealId: string) => void  (called on confirm)
 */
export function AssignToDealDrawer({ open, onClose, docLabel, docType = 'Invoice', currentDealId, leadId, onAssign }) {
  const [selectedDealId, setSelectedDealId] = useState('')
  const [saving, setSaving] = useState(false)

  const dealsQuery = leadId
    ? { limit: 100, parentOpportunityLeadId: leadId }
    : { limit: 100 }
  const { data: dealsData, isLoading: dealsLoading } = useGetDealsQuery(dealsQuery, { skip: !open })
  const deals = dealsData?.data ?? []

  const selectedDeal = deals.find((d) => d.id === selectedDealId) ?? null

  function handleClose() {
    setSelectedDealId('')
    onClose()
  }

  async function handleAssign() {
    if (!selectedDealId) {
      toast.error('Select a deal first')
      return
    }
    setSaving(true)
    try {
      await onAssign(selectedDealId)
      setSelectedDealId('')
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Failed to assign deal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <RightDrawer open={open} onClose={handleClose} title="Assign to deal">
      <div className="flex flex-col gap-4 px-1 pb-8 pt-2">
        <p className="text-sm text-neutral-600">
          {docType}{' '}
          <span className="font-semibold text-neutral-900">{docLabel}</span>
        </p>

        {leadId ? (
          <p className="rounded-md border border-brand-200 bg-white px-3 py-2 text-xs text-brand-800">
            Showing only deals for this client.
          </p>
        ) : null}

        {currentDealId ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Already assigned to a deal. Selecting a new deal will replace it.
          </p>
        ) : null}

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-neutral-600">Select deal</span>
          <div className="relative">
            <Briefcase className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <select
              className={cn(
                'w-full appearance-none rounded-lg border border-neutral-200 bg-white py-2 pl-8 pr-3 text-sm text-neutral-800',
                'focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-[#5B21B6]',
                dealsLoading && 'opacity-60',
              )}
              value={selectedDealId}
              onChange={(e) => setSelectedDealId(e.target.value)}
              disabled={dealsLoading}
            >
              <option value="">{dealsLoading ? 'Loading deals…' : '— Choose a deal —'}</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.dealName || d.fullName || d.id}
                  {d.currentStage ? ` · ${d.currentStage}` : ''}
                </option>
              ))}
            </select>
          </div>
          {!dealsLoading && deals.length === 0 ? (
            <p className="text-xs text-neutral-400">No deals found in this workspace.</p>
          ) : null}
        </label>

        {selectedDeal ? <DealPreview deal={selectedDeal} /> : null}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !selectedDealId}
            className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-primary-dark)] disabled:opacity-50"
            onClick={handleAssign}
          >
            {saving ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      </div>
    </RightDrawer>
  )
}
