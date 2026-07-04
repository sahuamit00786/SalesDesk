import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Plus } from 'lucide-react'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { useGetLeadQuery, useGetLeadsQuery } from '@/features/leads/leadsApi'
import { useGetDealsQuery, useCreateDealMutation, usePatchDealMutation } from '@/features/deals/dealsApi'
import { DEAL_CURRENCY_OPTIONS, formatDealMoney, normalizeDealCurrency } from '@/features/deals/dealCurrencies'
import { useEffectiveCurrency } from '@/hooks/useEffectiveCurrency'

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
  editingDeal = null,
  onCreated,
}) {
  const effectiveCurrency = useEffectiveCurrency()
  const isEditing = Boolean(editingDeal)
  const [selectedOppId, setSelectedOppId] = useState('')
  const [dealName, setDealName] = useState('')
  const [dealDescription, setDealDescription] = useState('')
  const [dealValue, setDealValue] = useState('')
  const [dealCurrency, setDealCurrency] = useState('USD')
  const [ownerUserId, setOwnerUserId] = useState('')
  const [oppSearch, setOppSearch] = useState('')
  const [oppPickerOpen, setOppPickerOpen] = useState(false)
  const oppFieldRef = useRef(null)

  useEffect(() => {
    if (!open) return
    if (editingDeal) {
      setDealName(editingDeal.dealName || '')
      setDealDescription(editingDeal.dealDescription || '')
      setDealValue(editingDeal.dealValue != null ? String(editingDeal.dealValue) : '')
      setDealCurrency(normalizeDealCurrency(editingDeal.dealCurrency))
      setOwnerUserId(editingDeal.owner?.id || editingDeal.ownerUserId || '')
      setSelectedOppId(editingDeal.parentOpportunityLeadId || fixedOpportunityLeadId || '')
    } else {
      setDealName('')
      setDealDescription('')
      setDealValue('')
      setDealCurrency(effectiveCurrency)
      setOwnerUserId('')
      setSelectedOppId(fixedOpportunityLeadId || '')
    }
    setOppSearch('')
    setOppPickerOpen(false)
  }, [open, editingDeal, fixedOpportunityLeadId, effectiveCurrency])

  useEffect(() => {
    if (!oppPickerOpen) return
    function handleClick(e) {
      if (oppFieldRef.current && !oppFieldRef.current.contains(e.target)) {
        setOppPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [oppPickerOpen])

  const effectiveOppId = fixedOpportunityLeadId || selectedOppId
  const lockOpportunityPicker = isEditing || Boolean(fixedOpportunityLeadId)

  const { data: funnelOppsRes, isFetching: loadingOpps } = useGetLeadsQuery(
    {
      page: 1,
      limit: 200,
      isOpportunity: true,
    },
    { skip: !open || lockOpportunityPicker },
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
    setDealValue((prev) => (prev === '' && parentLead.value != null ? String(parentLead.value) : prev))
  }, [
    open,
    parentLead?.id,
    parentLead?.valueCurrency,
    parentLead?.value_currency,
    parentLead?.value,
  ])

  const funnelRows = funnelOppsRes?.data || []
  const childDeals = childDealsRes?.data || []
  const selectedOppRow = funnelRows.find((row) => row.id === selectedOppId) || null
  const filteredFunnelRows = useMemo(() => {
    const q = oppSearch.trim().toLowerCase()
    if (!q) return funnelRows
    return funnelRows.filter((row) => opportunityOptionLabel(row).toLowerCase().includes(q))
  }, [funnelRows, oppSearch])

  const [createDeal, { isLoading: creating }] = useCreateDealMutation()
  const [patchDeal, { isLoading: patching }] = usePatchDealMutation()
  const saving = creating || patching

  const ownerOptions = useMemo(
    () => users.map((u) => ({ id: u.id, label: u.name || u.email || 'User' })),
    [users],
  )

  async function submit() {
    const dn = String(dealName || '').trim()
    if (!dn) {
      toast.error('Deal name is required')
      return
    }
    if (isEditing) {
      try {
        await patchDeal({
          id: editingDeal.id,
          name: dn,
          description: String(dealDescription || '').trim() || null,
          value: Number(dealValue || 0),
          valueCurrency: normalizeDealCurrency(dealCurrency),
          ownerUserId: ownerUserId || null,
        }).unwrap()
        toast.success('Deal updated')
        onCreated?.()
        onClose?.()
      } catch (e) {
        toast.error(e?.data?.error?.message || e?.error || 'Could not update deal')
      }
      return
    }
    if (!effectiveOppId) {
      toast.error('Select an opportunity')
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
      title={isEditing ? 'Edit deal' : 'Add deal'}
     >
      <div className="flex flex-col gap-4 px-1 pb-8 pt-2">
        {!lockOpportunityPicker ? (
          <div ref={oppFieldRef} className="relative">
            <label className="block text-xs font-medium text-neutral-600" htmlFor="add-deal-opp-select">
              Opportunity
            </label>
            <input
              id="add-deal-opp-select"
              type="text"
              autoComplete="off"
              className="mt-1 w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-400"
              placeholder={loadingOpps ? 'Loading…' : 'Select an opportunity…'}
              value={oppPickerOpen ? oppSearch : selectedOppRow ? opportunityOptionLabel(selectedOppRow) : ''}
              disabled={loadingOpps}
              onFocus={() => {
                setOppSearch('')
                setOppPickerOpen(true)
              }}
              onChange={(e) => {
                setOppSearch(e.target.value)
                setOppPickerOpen(true)
              }}
            />
            {oppPickerOpen ? (
              <ul className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
                {loadingOpps ? (
                  <li className="px-3 py-2 text-xs text-neutral-500">Loading…</li>
                ) : filteredFunnelRows.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-neutral-500">No matching opportunities.</li>
                ) : (
                  filteredFunnelRows.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        className="block w-full truncate rounded-md px-3 py-1.5 text-left text-sm text-neutral-900 hover:bg-neutral-50"
                        onClick={() => {
                          setSelectedOppId(row.id)
                          setOppSearch('')
                          setOppPickerOpen(false)
                        }}
                      >
                        {opportunityOptionLabel(row)}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
            {!loadingOpps && !funnelRows.length ? (
              <p className="mt-1.5 text-xs text-neutral-500">No funnel opportunities in this workspace (first 200).</p>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-neutral-600"></p>
        )}

        {effectiveOppId ? (
          <div>
            <p className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <span>Recent deals on this opportunity</span>
              <span className="flex items-center gap-1.5">
                {parentLead ? (
                  <span
                    className="max-w-[9rem] select-none truncate rounded-full px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal"
                    style={{
                      color: 'var(--brand-primary-dark)',
                      backgroundColor: 'color-mix(in srgb, var(--brand-primary) 12%, white)',
                    }}
                    title={(parentLead.contactName || parentLead.title || parentLead.company || 'Lead').trim()}
                  >
                    {(parentLead.contactName || parentLead.title || parentLead.company || 'Lead').trim()}
                  </span>
                ) : null}
                {childDeals.length ? (
                  <span
                    className="select-none rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    {childDeals.length}
                  </span>
                ) : null}
              </span>
            </p>
            <div
              className="mt-2 max-h-44 space-y-2 overflow-y-auto rounded-lg border p-2"
              style={{
                borderColor: 'color-mix(in srgb, var(--brand-primary) 16%, white)',
                backgroundColor: 'color-mix(in srgb, var(--brand-primary) 3%, white)',
              }}
            >
              {loadingDeals ? (
                <p className="text-xs text-neutral-500">Loading deals…</p>
              ) : childDeals.length ? (
                childDeals.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-md border-l-[3px] bg-white px-2.5 py-1.5 text-sm shadow-sm"
                    style={{ borderLeftColor: 'var(--brand-primary)' }}
                  >
                    <p className="min-w-0 truncate font-semibold text-neutral-900">{(d.dealName || d.fullName || 'Deal').trim()}</p>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        color: 'var(--brand-primary-dark)',
                        backgroundColor: 'color-mix(in srgb, var(--brand-primary) 14%, white)',
                      }}
                    >
                      {formatDealMoney(d.dealValue, d.dealCurrency ?? 'USD')}
                    </span>
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
            <option value="">Select owner…</option>
            {ownerOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          disabled={saving || (!isEditing && !effectiveOppId)}
          onClick={submit}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-primary-dark)] disabled:opacity-50"
        >
          {isEditing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isEditing ? 'Save changes' : 'Create deal'}
        </button>
      </div>
    </RightDrawer>
  )
}
