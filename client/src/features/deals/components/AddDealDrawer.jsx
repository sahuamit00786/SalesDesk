import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { useGetLeadQuery, useGetLeadsQuery } from '@/features/leads/leadsApi'
import { useGetDealsQuery, useCreateDealMutation } from '@/features/deals/dealsApi'
import { DEAL_CURRENCY_OPTIONS, formatDealMoney, normalizeDealCurrency } from '@/features/deals/dealCurrencies'

function opportunityOptionLabel(row) {
  const title = (row.title || '').trim()
  const contact = (row.contactName || '').trim() || '—'
  const company = (row.company || '').trim() || '—'
  if (title) return `${title} — ${contact} · ${company}`
  return `${contact} · ${company}`
}

/**
 * Create a pipeline deal linked to a funnel opportunity (`fromOpportunityLeadId`).
 * If `fixedOpportunityLeadId` is set, the opportunity picker is hidden.
 */
export function AddDealDrawer({
  open,
  onClose,
  users = [],
  fixedOpportunityLeadId = null,
  onCreated,
}) {
  const [selectedOppId, setSelectedOppId] = useState('')
  const [dealName, setDealName] = useState('')
  const [dealDescription, setDealDescription] = useState('')
  const [dealValue, setDealValue] = useState('')
  const [dealCurrency, setDealCurrency] = useState('USD')
  const [ownerUserId, setOwnerUserId] = useState('')

  useEffect(() => {
    if (!open) return
    setDealName('')
    setDealDescription('')
    setDealValue('')
    setDealCurrency('USD')
    setOwnerUserId(users[0]?.id || '')
    setSelectedOppId(fixedOpportunityLeadId || '')
  }, [open, fixedOpportunityLeadId, users])

  const effectiveOppId = fixedOpportunityLeadId || selectedOppId

  const { data: funnelOppsRes, isFetching: loadingOpps } = useGetLeadsQuery(
    {
      page: 1,
      limit: 200,
      isOpportunity: true,
    },
    { skip: !open || Boolean(fixedOpportunityLeadId) },
  )

  const { data: childDealsRes, isFetching: loadingDeals } = useGetDealsQuery(
    {
      page: 1,
      limit: 100,
      parentOpportunityLeadId: effectiveOppId || undefined,
    },
    { skip: !open || !effectiveOppId },
  )

  const { data: parentLeadRes } = useGetLeadQuery(effectiveOppId, { skip: !open || !effectiveOppId })
  const parentLead = parentLeadRes?.data

  useEffect(() => {
    if (!open || !parentLead) return
    const cur = parentLead.valueCurrency ?? parentLead.value_currency
    if (cur) setDealCurrency(normalizeDealCurrency(cur))
  }, [open, parentLead?.id, parentLead?.valueCurrency, parentLead?.value_currency])

  const funnelRows = funnelOppsRes?.data || []
  const childDeals = childDealsRes?.data || []

  const [createDeal, { isLoading: saving }] = useCreateDealMutation()

  const ownerOptions = useMemo(
    () => users.map((u) => ({ id: u.id, label: u.name || u.email || 'User' })),
    [users],
  )

  async function submit() {
    if (!effectiveOppId) {
      toast.error('Select an opportunity')
      return
    }
    const dn = String(dealName || '').trim()
    if (!dn) {
      toast.error('Deal name is required')
      return
    }
    try {
      await createDeal({
        opportunityLeadId: effectiveOppId,
        name: dn,
        description: String(dealDescription || '').trim() || null,
        value: Number(dealValue || 0),
        valueCurrency: normalizeDealCurrency(dealCurrency),
        ownerUserId: ownerUserId || null,
      }).unwrap()
      toast.success('Deal created')
      onCreated?.()
      onClose?.()
    } catch (e) {
      toast.error(e?.data?.error?.message || e?.error || 'Could not create deal')
    }
  }

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title="Add deal"
      description="Each deal is a separate row linked to one funnel opportunity (parent). It is not a new opportunity by itself."
    >
      <div className="flex flex-col gap-4 px-1 pb-8 pt-2">
        {!fixedOpportunityLeadId ? (
          <div>
            <label className="block text-xs font-medium text-neutral-600" htmlFor="add-deal-opp-select">
              Opportunity
            </label>
            <select
              id="add-deal-opp-select"
              className="mt-1 w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-400"
              value={selectedOppId}
              disabled={loadingOpps}
              onChange={(e) => setSelectedOppId(e.target.value)}
            >
              <option value="">{loadingOpps ? 'Loading…' : 'Select an opportunity…'}</option>
              {funnelRows.map((row) => (
                <option key={row.id} value={row.id}>
                  {opportunityOptionLabel(row)}
                </option>
              ))}
            </select>
            {!loadingOpps && !funnelRows.length ? (
              <p className="mt-1.5 text-xs text-neutral-500">No funnel opportunities in this workspace (first 200).</p>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-neutral-600">Creating deals under this opportunity.</p>
        )}

        {effectiveOppId ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Deals on this opportunity</p>
            <div className="mt-2 max-h-44 space-y-2 overflow-y-auto rounded-lg border border-neutral-100 bg-white p-2">
              {loadingDeals ? (
                <p className="text-xs text-neutral-500">Loading deals…</p>
              ) : childDeals.length ? (
                childDeals.map((d) => (
                  <div key={d.id} className="rounded-md border border-neutral-100 px-2 py-1.5 text-sm">
                    <p className="font-semibold text-neutral-900">{(d.dealName || d.fullName || 'Deal').trim()}</p>
                    <p className="text-xs text-neutral-500">
                      {formatDealMoney(d.dealValue, d.dealCurrency ?? 'USD')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-500">No pipeline deals yet.</p>
              )}
            </div>
          </div>
        ) : null}

        <label className="block text-xs font-medium text-neutral-600">
          Deal name
          <input
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            value={dealName}
            onChange={(e) => setDealName(e.target.value)}
            placeholder="e.g. Enterprise renewal"
          />
        </label>

        <label className="block text-xs font-medium text-neutral-600">
          Deal description
          <textarea
            className="mt-1 min-h-[88px] w-full resize-y rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            value={dealDescription}
            onChange={(e) => setDealDescription(e.target.value)}
            placeholder="Scope, products, terms, or other context…"
            rows={4}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-neutral-600">
            Value
            <input
              type="number"
              min={0}
              step="0.01"
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-neutral-600">
            Currency
            <select
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
              value={dealCurrency}
              onChange={(e) => setDealCurrency(e.target.value)}
            >
              {DEAL_CURRENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-xs font-medium text-neutral-600">
          Owner
          <select
            className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            value={ownerUserId}
            onChange={(e) => setOwnerUserId(e.target.value)}
          >
            {ownerOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          disabled={saving || !effectiveOppId}
          onClick={submit}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-primary-dark)] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Create deal
        </button>
      </div>
    </RightDrawer>
  )
}
