import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Printer } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { SalesDocumentPreview } from '@/features/sales-docs/components/SalesDocumentPreview'
import { ScaledA4PreviewViewport } from '@/features/sales-docs/components/ScaledA4PreviewViewport'
import { useGetBillingProfileQuery } from '@/features/sales-docs/billingProfileApi'
import {
  useCreateQuotationMutation,
  useGetQuotationQuery,
  useGetQuotationTemplateQuery,
  usePatchQuotationMutation,
} from '@/features/sales-docs/quotationsApi'
import { useGetLeadsQuery, useGetLeadQuery } from '@/features/leads/leadsApi'
import { useGetDealQuery, useGetDealsQuery } from '@/features/deals/dealsApi'
import { QUOTATION_PRESET_LABELS } from '@/features/sales-docs/presetLabels'
import { buildCustomerSnapshotFromLead, formatAddressLines } from '@/features/sales-docs/customerSnapshot'
import { aggregateQuotationTotals } from '@/features/sales-docs/previewTotals'
import { suggestedQuotationNumber } from '@/features/sales-docs/suggestedDocNumber'
import { cn } from '@/utils/cn'
import { pickTemplateIdFromSearch } from '@/utils/docTemplateQuery'
import { useEffectiveCurrency } from '@/hooks/useEffectiveCurrency'

const CURRENCY_FALLBACK = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'CAD', 'AUD', 'SGD', 'JPY']
function getCurrencyOptions() {
  try {
    const values = Intl.supportedValuesOf?.('currency')
    if (Array.isArray(values) && values.length) return [...values].sort((a, b) => a.localeCompare(b))
  } catch { /* ignore */ }
  return CURRENCY_FALLBACK
}
const CURRENCY_OPTIONS = getCurrencyOptions()

function resolveCssColor(value, fallback = '#5B21B6') {
  if (!value || typeof value !== 'string') return fallback
  if (value.startsWith('#') || value.startsWith('rgb')) return value
  try {
    const varName = value.replace(/^var\(/, '').replace(/\)$/, '').trim()
    const resolved = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    return resolved || fallback
  } catch { return fallback }
}

const emptyLine = () => ({
  name: '',
  quantity: 1,
  unitPrice: 0,
  taxPct: '',
  discountPct: '',
})

function toIsoDate(d) {
  try {
    return new Date(d).toISOString()
  } catch {
    return new Date().toISOString()
  }
}

export function NewQuotationPage() {
  const location = useLocation()
  const [, setSearchParams] = useSearchParams()
  const query = useMemo(() => new URLSearchParams(location.search), [location.search])

  const templateId = useMemo(
    () => pickTemplateIdFromSearch(location.search, 'quotationTemplateId', 'templateId'),
    [location.search],
  )
  const quotationId = useMemo(() => query.get('quotationId')?.trim() || '', [query])
  const leadId = useMemo(() => query.get('leadId')?.trim() || '', [query])
  const dealId = useMemo(() => query.get('dealId')?.trim() || '', [query])

  useEffect(() => {
    const sp = new URLSearchParams(location.search)
    if (!sp.has('invoiceTemplateId')) return
    sp.delete('invoiceTemplateId')
    setSearchParams(sp, { replace: true })
  }, [location.search, setSearchParams])

  return (
    <NewQuotationEditor
      key={`${quotationId || '__new__'}:${templateId || '__blank__'}:${leadId || '__lead__'}:${dealId || '__deal__'}`}
      templateId={templateId}
      quotationId={quotationId}
      initialLeadId={leadId}
      initialDealId={dealId}
    />
  )
}

function addressFromSnapshot(snap) {
  if (!snap || typeof snap !== 'object') return ''
  const a = snap.billingAddress || {}
  return [a.street, a.city, a.state, a.postalCode, a.country].filter(Boolean).join(', ')
}

function NewQuotationEditor({ templateId, quotationId = '', initialLeadId = '', initialDealId = '' }) {
  const navigate = useNavigate()
  const effectiveCurrency = useEffectiveCurrency()
  const hydratedQuotationIdRef = useRef('')
  const isEditingExisting = Boolean(quotationId)

  const [clientLeadId, setClientLeadId] = useState(initialLeadId)
  const [dealLeadId, setDealLeadId] = useState('')
  const [quotationTemplateId, setQuotationTemplateId] = useState(templateId)
  const [layoutPreset, setLayoutPreset] = useState(1)
  const [currency, setCurrency] = useState('USD')
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [expiryDate, setExpiryDate] = useState('')
  const [reference, setReference] = useState('')
  const [purchaseOrderRef, setPurchaseOrderRef] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [notes, setNotes] = useState('')
  const [termsSnapshot, setTermsSnapshot] = useState('')
  const [shipping, setShipping] = useState('0')
  const [adjustment, setAdjustment] = useState('0')
  const [lines, setLines] = useState([emptyLine()])
  const [documentTheme, setDocumentTheme] = useState(() => ({ accentColor: resolveCssColor('var(--brand-primary)'), headerTone: 'light' }))
  const [savedId, setSavedId] = useState(null)
  const [previewNumber, setPreviewNumber] = useState('Preview')
  const [showPreviewMobile, setShowPreviewMobile] = useState(true)

  const { data: billRes } = useGetBillingProfileQuery()
  const { data: tplRes, isFetching: tplLoading } = useGetQuotationTemplateQuery(templateId, { skip: !templateId })
  const { data: quotationRes, isFetching: quotationLoading } = useGetQuotationQuery(quotationId, { skip: !quotationId })
  const tplPayload = tplRes?.data
  const tpl = tplPayload?.data ?? tplPayload
  const quotationPayload = quotationRes?.data
  const existingQuotation = quotationPayload?.data ?? quotationPayload

  const activeDealId = String(initialDealId || '').trim()
  const { data: dealRes } = useGetDealQuery(activeDealId, { skip: !activeDealId })
  const dealCard = dealRes?.data
  const parentLeadIdForDeal = dealCard?.parentOpportunityLeadId || ''
  const { data: dealParentLeadRes } = useGetLeadQuery(parentLeadIdForDeal, { skip: !parentLeadIdForDeal })
  const dealParentLead = dealParentLeadRes?.data

  const { data: leadsRes } = useGetLeadsQuery({ page: 1, limit: 400, search: '' })
  const leads = leadsRes?.data || []

  const { data: dealsRes } = useGetDealsQuery({ page: 1, limit: 400 })
  const allDeals = dealsRes?.data || []

  const filteredDealOptions = useMemo(() => {
    if (!clientLeadId) return allDeals
    const client = leads.find((l) => l.id === clientLeadId)
    if (!client?.company) return allDeals
    return allDeals.filter(
      (d) =>
        d.parentOpportunityLeadId === clientLeadId ||
        d.companyName === client.company,
    )
  }, [allDeals, clientLeadId, leads])

  function applyClientSelection(id) {
    setClientLeadId(id)
    const lead = leads.find((l) => l.id === id)
    if (lead) setAddressLine(formatAddressLines(buildCustomerSnapshotFromLead(lead)))
    if (dealLeadId) {
      const deal = allDeals.find((d) => d.id === dealLeadId)
      const newClient = leads.find((l) => l.id === id)
      if (deal && newClient && deal.companyName !== newClient.company) {
        setDealLeadId('')
      }
    }
  }

  function applyDealSelection(dealId) {
    setDealLeadId(dealId)
    const deal = allDeals.find((d) => d.id === dealId)
    if (!deal) return
    const oppLeadId = deal.parentOpportunityLeadId || ''
    setClientLeadId(oppLeadId)
    const lead = leads.find((l) => l.id === oppLeadId) ||
      (deal ? { contactName: deal.fullName, company: deal.companyName, email: deal.email } : null)
    if (lead) setAddressLine(formatAddressLines(buildCustomerSnapshotFromLead(lead)))
  }

  const [createQuotation, { isLoading: creating }] = useCreateQuotationMutation()
  const [patchQuotation, { isLoading: patching }] = usePatchQuotationMutation()

  const billPayload = billRes?.data
  const billing = billPayload?.data ?? billPayload

  useEffect(() => {
    if (savedId) return
    const seq = billing?.quotationNextSeq
    if (seq == null) return
    const num = suggestedQuotationNumber(issueDate, seq)
    setPreviewNumber(num)
    setPurchaseOrderRef((prev) => prev || num)
  }, [savedId, billing?.quotationNextSeq, issueDate])

  useEffect(() => {
    if (!templateId || !tpl) return
    if (isEditingExisting) return
    if (String(tpl.id).toLowerCase() !== String(templateId).toLowerCase()) return
    setQuotationTemplateId(tpl.id)
    if (tpl.layoutPreset != null) setLayoutPreset(Number(tpl.layoutPreset))
    const tplCurrency = tpl.defaultCurrency
      ? String(tpl.defaultCurrency).toUpperCase().slice(0, 3)
      : effectiveCurrency
    setCurrency(tplCurrency)
    if (tpl.defaultPaymentTerms) setTermsSnapshot(tpl.defaultPaymentTerms)
    if (tpl.defaultNotes) setNotes(tpl.defaultNotes)
  }, [tpl, templateId, isEditingExisting, effectiveCurrency])

  useEffect(() => {
    if (isEditingExisting || savedId || templateId) return
    setCurrency(effectiveCurrency)
  }, [effectiveCurrency, isEditingExisting, savedId, templateId])

  useEffect(() => {
    if (!quotationId || !existingQuotation) return
    if (hydratedQuotationIdRef.current === quotationId) return
    hydratedQuotationIdRef.current = quotationId

    setSavedId(existingQuotation.id || null)
    setClientLeadId(existingQuotation.leadId || '')
    setDealLeadId(existingQuotation.dealId || '')
    setQuotationTemplateId(existingQuotation.quotationTemplateId || '')
    setLayoutPreset(Number(existingQuotation.layoutPreset) || 1)
    setCurrency(String(existingQuotation.currency || 'USD').toUpperCase().slice(0, 3))
    setIssueDate(existingQuotation.issueDate ? String(existingQuotation.issueDate).slice(0, 10) : new Date().toISOString().slice(0, 10))
    setExpiryDate(existingQuotation.expiryDate ? String(existingQuotation.expiryDate).slice(0, 10) : '')
    setReference(existingQuotation.reference || '')
    setPurchaseOrderRef(existingQuotation.purchaseOrderRef || '')
    setAddressLine(addressFromSnapshot(existingQuotation.customerSnapshot))
    setNotes(existingQuotation.notes || '')
    setTermsSnapshot(existingQuotation.termsSnapshot || '')
    setShipping(String(existingQuotation.shipping ?? 0))
    setAdjustment(String(existingQuotation.adjustment ?? 0))
    setPreviewNumber(existingQuotation.quotationNumber || 'Quotation')

    const fetchedItems = Array.isArray(existingQuotation.items) ? existingQuotation.items : []
    const nextLines = fetchedItems.length
      ? fetchedItems.map((it) => ({
          name: String(it.name || ''),
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          taxPct: it.taxPct == null ? '' : String(it.taxPct),
          discountPct: it.discountPct == null ? '' : String(it.discountPct),
        }))
      : [emptyLine()]
    setLines(nextLines)

    const t = existingQuotation.documentTheme
    if (t && typeof t === 'object') {
      setDocumentTheme({
        accentColor: resolveCssColor(String(t.accentColor || '')),
        headerTone: t.headerTone === 'dark' ? 'dark' : 'light',
      })
    }
  }, [existingQuotation, quotationId])

  useEffect(() => {
    if (activeDealId) return
    if (!initialLeadId || !leads.length) return
    if (!clientLeadId) applyClientSelection(initialLeadId)
  }, [activeDealId, initialLeadId, leads, clientLeadId])

  useEffect(() => {
    if (!activeDealId || !dealParentLead || addressLine) return
    const addr = formatAddressLines(buildCustomerSnapshotFromLead(dealParentLead))
    if (addr) setAddressLine(addr)
  }, [activeDealId, dealParentLead])

  const selectedLead = useMemo(() => {
    if (activeDealId && dealParentLead) return dealParentLead
    return leads.find((l) => l.id === clientLeadId)
  }, [leads, clientLeadId, activeDealId, dealParentLead])

  const customerSnapshot = useMemo(() => {
    const base = buildCustomerSnapshotFromLead(selectedLead)
    if (!base) {
      return {
        contactName: null,
        companyName: null,
        email: null,
        phone: null,
        billingAddress: { street: addressLine || null, city: null, state: null, postalCode: null, country: null },
      }
    }
    const withDeal =
      activeDealId && dealCard?.dealName ? { ...base, dealName: String(dealCard.dealName).trim() } : base
    if (addressLine.trim()) {
      return {
        ...withDeal,
        billingAddress: {
          ...withDeal.billingAddress,
          street: addressLine.trim(),
        },
      }
    }
    return withDeal
  }, [selectedLead, addressLine, activeDealId, dealCard?.dealName])

  const totals = useMemo(() => {
    const raw = lines.map((l) => ({
      name: l.name,
      quantity: Number(l.quantity) || 0,
      unitPrice: Number(l.unitPrice) || 0,
      taxPct: l.taxPct === '' || l.taxPct == null ? null : Number(l.taxPct),
      discountPct: l.discountPct === '' || l.discountPct == null ? null : Number(l.discountPct),
    }))
    return aggregateQuotationTotals(raw, {
      shipping: Number(shipping) || 0,
      adjustment: Number(adjustment) || 0,
    })
  }, [lines, shipping, adjustment])

  const previewLines = totals.items.filter((l) => String(l.name || '').trim())

  function buildItemsPayload() {
    return lines
      .map((l) => ({
        name: String(l.name || '').trim(),
        quantity: Number(l.quantity) || 1,
        unitPrice: Number(l.unitPrice) || 0,
        taxPct: l.taxPct === '' || l.taxPct == null ? null : Number(l.taxPct),
        discountPct: l.discountPct === '' || l.discountPct == null ? null : Number(l.discountPct),
      }))
      .filter((l) => l.name)
  }

  function themePayload() {
    return documentTheme.accentColor || documentTheme.headerTone
      ? {
          accentColor: documentTheme.accentColor || undefined,
          headerTone: documentTheme.headerTone || undefined,
        }
      : null
  }

  async function saveDraft() {
    const items = buildItemsPayload()
    if (!activeDealId && !clientLeadId) {
      toast.error('Select a client')
      return
    }
    if (!items.length) {
      toast.error('Add at least one line item')
      return
    }

    const createBody = {
      ...(activeDealId ? { dealId: activeDealId } : dealLeadId ? { dealId: dealLeadId, leadId: clientLeadId } : { leadId: clientLeadId }),
      quotationTemplateId: quotationTemplateId || null,
      issueDate: toIsoDate(issueDate),
      expiryDate: expiryDate ? toIsoDate(expiryDate) : null,
      reference: reference.trim() || null,
      purchaseOrderRef: purchaseOrderRef.trim() || null,
      customerSnapshot,
      currency,
      layoutPreset,
      notes: notes.trim() || null,
      termsSnapshot: termsSnapshot.trim() || null,
      status: 'draft',
      items,
      shipping: Number(shipping) || 0,
      adjustment: Number(adjustment) || 0,
      documentTheme: themePayload(),
    }

    const patchBody = {
      quotationTemplateId: quotationTemplateId || null,
      issueDate: toIsoDate(issueDate),
      expiryDate: expiryDate ? toIsoDate(expiryDate) : null,
      reference: reference.trim() || null,
      purchaseOrderRef: purchaseOrderRef.trim() || null,
      customerSnapshot,
      currency,
      layoutPreset,
      notes: notes.trim() || null,
      termsSnapshot: termsSnapshot.trim() || null,
      status: 'draft',
      items,
      shipping: Number(shipping) || 0,
      adjustment: Number(adjustment) || 0,
      documentTheme: themePayload(),
    }

    try {
      if (savedId) {
        const res = await patchQuotation({ id: savedId, ...patchBody }).unwrap()
        const q = res?.data ?? res
        toast.success(isEditingExisting ? 'Quotation updated' : 'Draft saved')
        setPreviewNumber(q.quotationNumber || previewNumber)
      } else {
        const res = await createQuotation(createBody).unwrap()
        const q = res?.data ?? res
        setSavedId(q.id)
        setPreviewNumber(q.quotationNumber || 'Quotation')
        toast.success('Draft saved')
      }
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Save failed')
    }
  }

  async function sendQuotation() {
    const items = buildItemsPayload()
    if (!activeDealId && !clientLeadId) {
      toast.error('Select a client')
      return
    }
    if (!items.length) {
      toast.error('Add at least one line item')
      return
    }

    const tp = themePayload()
    const ship = Number(shipping) || 0
    const adj = Number(adjustment) || 0

    try {
      if (savedId) {
        await patchQuotation({
          id: savedId,
          status: 'sent',
          issueDate: toIsoDate(issueDate),
          expiryDate: expiryDate ? toIsoDate(expiryDate) : null,
          reference: reference.trim() || null,
          purchaseOrderRef: purchaseOrderRef.trim() || null,
          customerSnapshot,
          currency,
          layoutPreset,
          notes: notes.trim() || null,
          termsSnapshot: termsSnapshot.trim() || null,
          items,
          shipping: ship,
          adjustment: adj,
          documentTheme: tp,
        }).unwrap()
        toast.success('Quotation sent')
        navigate(`/quotations/${savedId}/print`)
      } else {
        const res = await createQuotation({
          ...(activeDealId ? { dealId: activeDealId } : dealLeadId ? { dealId: dealLeadId, leadId: clientLeadId } : { leadId: clientLeadId }),
          quotationTemplateId: quotationTemplateId || null,
          issueDate: toIsoDate(issueDate),
          expiryDate: expiryDate ? toIsoDate(expiryDate) : null,
          reference: reference.trim() || null,
          purchaseOrderRef: purchaseOrderRef.trim() || null,
          customerSnapshot,
          currency,
          layoutPreset,
          notes: notes.trim() || null,
          termsSnapshot: termsSnapshot.trim() || null,
          status: 'sent',
          items,
          shipping: ship,
          adjustment: adj,
          documentTheme: tp,
        }).unwrap()
        const q = res?.data ?? res
        toast.success('Quotation sent')
        navigate(`/quotations/${q.id}/print`)
      }
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Could not send quotation')
    }
  }

  const busy = creating || patching || tplLoading || (isEditingExisting && quotationLoading)

  return (
    <PageShell fullWidth>
      <div className="sales-doc-editor flex min-h-0 w-full min-w-0 flex-col gap-3 px-3 pt-2 pb-3 sm:px-4 sm:pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">
              {isEditingExisting ? 'Edit quotation' : 'New quotation'}
            </h1>
            <p className="text-xs text-neutral-500">
              {isEditingExisting ? previewNumber : QUOTATION_PRESET_LABELS[layoutPreset - 1] || 'Quotation'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600 lg:hidden">
              <input type="checkbox" checked={showPreviewMobile} onChange={(e) => setShowPreviewMobile(e.target.checked)} />
              Show preview
            </label>
            {savedId ? (
              <Link
                to={`/quotations/${savedId}/print`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50"
              >
                <Printer className="h-4 w-4" />
                Print / PDF
              </Link>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={saveDraft}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 shadow-sm hover:bg-neutral-50 disabled:opacity-50"
            >
              {creating || patching ? 'Saving…' : isEditingExisting ? 'Update draft' : 'Save as draft'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={sendQuotation}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {isEditingExisting ? 'Update & send' : 'Send quotation'}
            </button>
          </div>
        </div>

        <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start lg:gap-4">
          <div className="flex min-w-0 flex-col gap-3">
            <section className="sde-card">
              <h2 className="text-sm font-semibold text-neutral-900">Quotation details</h2>
              <div className="sde-field-stack">
                <label className="block text-xs font-medium text-neutral-600">
                  Deal <span className="font-normal text-neutral-400">(optional)</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                    value={dealLeadId}
                    disabled={Boolean(activeDealId)}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setDealLeadId('')
                      } else {
                        applyDealSelection(e.target.value)
                      }
                    }}
                  >
                    <option value="">No deal / select later…</option>
                    {filteredDealOptions.map((d) => {
                      const who = (d.fullName || '').trim() || '—'
                      const co = (d.companyName || '').trim() || '—'
                      const stage = String(d.currentStage || 'Open')
                      return (
                        <option key={d.id} value={d.id}>
                          {d.dealName || who} 
                        </option>
                      )
                    })}
                  </select>
                </label>

                <label className="block text-xs font-medium text-neutral-600">
                  Bill to
                  <select
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                    value={clientLeadId}
                    disabled={Boolean(activeDealId)}
                    onChange={(e) => applyClientSelection(e.target.value)}
                  >
                    <option value="">Select client…</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {(l.contactName || l.title || 'Lead').trim()} · {(l.company || '').trim() || '—'}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="sde-field-grid">
                  <label className="block text-xs font-medium text-neutral-600">
                    Quotation number
                    <input
                      readOnly
                      className="mt-1 w-full rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm text-neutral-600"
                      value={previewNumber}
                    />
                  </label>
                  <label className="block text-xs font-medium text-neutral-600">
                    Valid until
                    <input
                      type="date"
                      className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </label>
                </div>

                <div className="sde-field-grid">
                  <label className="block text-xs font-medium text-neutral-600">
                    Issue date
                    <input
                      type="date"
                      className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-medium text-neutral-600">
                    Currency
                    <select
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      {CURRENCY_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block text-xs font-medium text-neutral-600">
                  Billing address
                  <textarea
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="Street, city, region…"
                  />
                </label>

                <div className="sde-field-grid">
                  <label className="block text-xs font-medium text-neutral-600">
                    Reference
                    <input
                      className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-medium text-neutral-600">
                    PO number
                    <input
                      className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      value={purchaseOrderRef}
                      onChange={(e) => setPurchaseOrderRef(e.target.value)}
                    />
                  </label>
                </div>

                <div className="sde-field-grid">
                  <label className="block text-xs font-medium text-neutral-600">
                    Shipping
                    <input
                      type="number"
                      step="any"
                      className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      value={shipping}
                      onChange={(e) => setShipping(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-medium text-neutral-600">
                    Adjustment
                    <input
                      type="number"
                      step="any"
                      className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      value={adjustment}
                      onChange={(e) => setAdjustment(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="sde-card">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-neutral-900">Line items</h2>
                <button
                  type="button"
                  className="text-sm font-medium text-brand-600 hover:underline"
                  onClick={() => setLines((prev) => [...prev, emptyLine()])}
                >
                  + Add item
                </button>
              </div>
              <div className="sde-line-stack">
                {lines.map((line, idx) => (
                  <div key={idx} className="sde-line-card">
                    <input
                      placeholder="Description"
                      className="mb-1.5 w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm font-medium"
                      value={line.name}
                      onChange={(e) => {
                        const v = e.target.value
                        setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, name: v } : x)))
                      }}
                    />
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <label className="text-[11px] text-neutral-500">
                        Qty
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                          value={line.quantity}
                          onChange={(e) =>
                            setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))
                          }
                        />
                      </label>
                      <label className="text-[11px] text-neutral-500">
                        Rate
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                          value={line.unitPrice}
                          onChange={(e) =>
                            setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, unitPrice: e.target.value } : x)))
                          }
                        />
                      </label>
                      <label className="text-[11px] text-neutral-500">
                        Tax %
                        <input
                          type="number"
                          min="0"
                          className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                          value={line.taxPct}
                          onChange={(e) =>
                            setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, taxPct: e.target.value } : x)))
                          }
                        />
                      </label>
                      <div className="flex items-end justify-end">
                        <button
                          type="button"
                          disabled={lines.length <= 1}
                          className={cn(
                            'rounded-md p-2 text-xs text-neutral-500 hover:bg-red-50 hover:text-red-600',
                            lines.length <= 1 && 'pointer-events-none opacity-30',
                          )}
                          onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="sde-card">
              <h2 className="text-sm font-semibold text-neutral-900">Appearance</h2>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block text-xs font-medium text-neutral-600">
                  Accent color
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      className="h-10 w-14 cursor-pointer rounded border border-neutral-200 bg-white"
                      value={documentTheme.accentColor || 'var(--brand-primary)'}
                      onChange={(e) => setDocumentTheme((t) => ({ ...t, accentColor: e.target.value }))}
                    />
                    <input
                      className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm"
                      value={documentTheme.accentColor || ''}
                      onChange={(e) => setDocumentTheme((t) => ({ ...t, accentColor: e.target.value }))}
                    />
                  </div>
                </label>
                <label className="block text-xs font-medium text-neutral-600">
                  Header style
                  <select
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    value={documentTheme.headerTone || 'light'}
                    onChange={(e) => setDocumentTheme((t) => ({ ...t, headerTone: e.target.value }))}
                  >
                    <option value="light">Light band</option>
                    <option value="dark">Dark band</option>
                  </select>
                </label>
                <label className="block text-xs font-medium text-neutral-600 sm:col-span-2">
                  Layout preset
                  <select
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    value={layoutPreset}
                    onChange={(e) => setLayoutPreset(Number(e.target.value))}
                  >
                    {QUOTATION_PRESET_LABELS.map((label, i) => (
                      <option key={label} value={i + 1}>
                        {i + 1}. {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="sde-card">
              <label className="block text-xs font-medium text-neutral-600">
                Terms (shown on PDF)
                <textarea
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  value={termsSnapshot}
                  onChange={(e) => setTermsSnapshot(e.target.value)}
                />
              </label>
              <label className="mt-2.5 block text-xs font-medium text-neutral-600">
                Notes
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
            </section>
          </div>

          <div
            className={cn(
              'flex w-full min-h-[360px] flex-col lg:sticky lg:top-4 lg:min-h-[calc(100dvh-4rem)] lg:self-start',
              !showPreviewMobile && 'hidden lg:flex',
            )}
          >
            <div className="flex min-h-0 flex-1 flex-col rounded-xl bg-neutral-100 p-1 lg:p-2">
              <ScaledA4PreviewViewport fit="width" className="min-h-[280px]">
                <SalesDocumentPreview
                  embedded
                  variant="quotation"
                  preset={layoutPreset}
                  billing={billing}
                  customer={customerSnapshot}
                  headerNumber={previewNumber}
                  headerTitle="Quotation"
                  issueDate={issueDate}
                  secondaryDateLabel="Valid until"
                  secondaryDate={expiryDate || null}
                  lines={previewLines.length ? previewLines : [{ name: 'Sample item', quantity: 1, unitPrice: 0, lineTotal: 0 }]}
                  subtotal={totals.subtotal}
                  discountTotal={totals.discountTotal}
                  shipping={totals.shipping}
                  adjustment={totals.adjustment}
                  grandTotal={totals.grandTotal}
                  taxBreakdown={totals.taxBreakdown}
                  terms={termsSnapshot || null}
                  notes={notes || null}
                  watermark={savedId ? null : 'Draft'}
                  currency={currency}
                  theme={documentTheme.accentColor ? documentTheme : null}
                />
              </ScaledA4PreviewViewport>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
