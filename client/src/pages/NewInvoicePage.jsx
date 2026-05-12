import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Printer } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { SalesDocumentPreview } from '@/features/sales-docs/components/SalesDocumentPreview'
import { ScaledA4PreviewViewport } from '@/features/sales-docs/components/ScaledA4PreviewViewport'
import { useGetBillingProfileQuery } from '@/features/sales-docs/billingProfileApi'
import {
  useCreateInvoiceMutation,
  useGetInvoiceQuery,
  useGetInvoiceTemplateQuery,
  usePatchInvoiceMutation,
} from '@/features/sales-docs/invoicesApi'
import { useGetLeadsQuery, useGetLeadQuery } from '@/features/leads/leadsApi'
import { useGetDealQuery } from '@/features/deals/dealsApi'
import { INVOICE_PRESET_LABELS } from '@/features/sales-docs/presetLabels'
import { buildCustomerSnapshotFromLead, formatAddressLines } from '@/features/sales-docs/customerSnapshot'
import { aggregateInvoiceTotals } from '@/features/sales-docs/previewTotals'
import { suggestedInvoiceNumber } from '@/features/sales-docs/suggestedDocNumber'
import { cn } from '@/utils/cn'
import { pickTemplateIdFromSearch } from '@/utils/docTemplateQuery'
import { shortDealId } from '@/utils/shortDealId'

const emptyLine = () => ({
  name: '',
  quantity: 1,
  unitPrice: 0,
  taxPct: '',
  discountPct: '',
})

const INVOICE_CURRENCY_FALLBACK = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'CAD', 'AUD', 'SGD', 'JPY']

function getCurrencyOptions() {
  try {
    const values = Intl.supportedValuesOf?.('currency')
    if (Array.isArray(values) && values.length) {
      return [...values].sort((a, b) => a.localeCompare(b))
    }
  } catch {
    // ignore and use fallback list below
  }
  return INVOICE_CURRENCY_FALLBACK
}

const INVOICE_CURRENCY_OPTIONS = getCurrencyOptions()

function normalizeCurrencyCode(value) {
  const code = String(value || '')
    .trim()
    .toUpperCase()
  return /^[A-Z]{3}$/.test(code) ? code : 'USD'
}

function addressFromSnapshot(snapshot) {
  const b = snapshot?.billingAddress
  if (!b || typeof b !== 'object') return ''
  return [b.street, b.city, b.state, b.postalCode, b.country].filter(Boolean).join(', ')
}

function toIsoDate(d) {
  try {
    return new Date(d).toISOString()
  } catch {
    return new Date().toISOString()
  }
}

export function NewInvoicePage() {
  const location = useLocation()
  const [, setSearchParams] = useSearchParams()
  const query = useMemo(() => new URLSearchParams(location.search), [location.search])

  const templateId = useMemo(
    () => pickTemplateIdFromSearch(location.search, 'invoiceTemplateId', 'templateId'),
    [location.search],
  )
  const invoiceId = useMemo(() => query.get('invoiceId')?.trim() || '', [query])
  const leadId = useMemo(() => query.get('leadId')?.trim() || '', [query])
  const dealId = useMemo(() => query.get('dealId')?.trim() || '', [query])

  useEffect(() => {
    const sp = new URLSearchParams(location.search)
    if (!sp.has('quotationTemplateId')) return
    sp.delete('quotationTemplateId')
    setSearchParams(sp, { replace: true })
  }, [location.search, setSearchParams])

  return (
    <NewInvoiceEditor
      key={`${invoiceId || '__new__'}:${templateId || '__blank__'}:${leadId || '__lead__'}:${dealId || '__deal__'}`}
      templateId={templateId}
      invoiceId={invoiceId}
      initialLeadId={leadId}
      initialDealId={dealId}
    />
  )
}

function NewInvoiceEditor({ templateId, invoiceId = '', initialLeadId = '', initialDealId = '' }) {
  const navigate = useNavigate()
  const hydratedInvoiceIdRef = useRef('')
  const isEditingExisting = Boolean(invoiceId)

  const [leadId, setLeadId] = useState(initialLeadId)
  const [invoiceTemplateId, setInvoiceTemplateId] = useState(templateId)
  const [layoutPreset, setLayoutPreset] = useState(1)
  const [currency, setCurrency] = useState('USD')
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [reference, setReference] = useState('')
  const [purchaseOrderRef, setPurchaseOrderRef] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [notes, setNotes] = useState('')
  const [termsSnapshot, setTermsSnapshot] = useState('')
  const [lines, setLines] = useState([emptyLine()])
  const [documentTheme, setDocumentTheme] = useState({ accentColor: '#059669', headerTone: 'light' })
  const [savedId, setSavedId] = useState(null)
  const [previewNumber, setPreviewNumber] = useState('Preview')
  const [showPreviewMobile, setShowPreviewMobile] = useState(true)

  const { data: billRes } = useGetBillingProfileQuery()
  const { data: tplRes, isFetching: tplLoading } = useGetInvoiceTemplateQuery(templateId, { skip: !templateId })
  const { data: invoiceRes, isFetching: invoiceLoading } = useGetInvoiceQuery(invoiceId, { skip: !invoiceId })
  const tplPayload = tplRes?.data
  const tpl = tplPayload?.data ?? tplPayload
  const invoicePayload = invoiceRes?.data
  const existingInvoice = invoicePayload?.data ?? invoicePayload

  const activeDealId = String(initialDealId || '').trim()
  const { data: dealRes } = useGetDealQuery(activeDealId, { skip: !activeDealId })
  const dealCard = dealRes?.data
  const parentLeadIdForDeal = dealCard?.parentOpportunityLeadId || ''
  const { data: dealParentLeadRes } = useGetLeadQuery(parentLeadIdForDeal, { skip: !parentLeadIdForDeal })
  const dealParentLead = dealParentLeadRes?.data

  const { data: leadsRes } = useGetLeadsQuery({ page: 1, limit: 400, search: '' })
  const leads = leadsRes?.data || []
  const dealOptions = useMemo(() => {
    const onlyDeals = leads.filter((l) =>
      Boolean(l?.isOpportunity) || Boolean(l?.opportunityStage) || Boolean(l?.pipelineStage) || Boolean(l?.dealValue),
    )
    return onlyDeals.length ? onlyDeals : leads
  }, [leads])

  function applyLeadSelection(id) {
    setLeadId(id)
    const lead = leads.find((l) => l.id === id)
    if (lead) setAddressLine(formatAddressLines(buildCustomerSnapshotFromLead(lead)))
  }

  const [createInvoice, { isLoading: creating }] = useCreateInvoiceMutation()
  const [patchInvoice, { isLoading: patching }] = usePatchInvoiceMutation()

  const billPayload = billRes?.data
  const billing = billPayload?.data ?? billPayload

  useEffect(() => {
    if (savedId) return
    const seq = billing?.invoiceNextSeq
    if (seq == null) return
    setPreviewNumber(suggestedInvoiceNumber(issueDate, seq))
  }, [savedId, billing?.invoiceNextSeq, issueDate])

  useEffect(() => {
    if (!templateId || !tpl) return
    if (isEditingExisting) return
    if (String(tpl.id).toLowerCase() !== String(templateId).toLowerCase()) return
    setInvoiceTemplateId(tpl.id)
    if (tpl.layoutPreset != null) setLayoutPreset(Number(tpl.layoutPreset))
    if (tpl.defaultCurrency != null) setCurrency(normalizeCurrencyCode(tpl.defaultCurrency))
    if (tpl.defaultPaymentTerms) setTermsSnapshot(tpl.defaultPaymentTerms)
  }, [tpl, templateId, isEditingExisting])

  useEffect(() => {
    if (!invoiceId || !existingInvoice) return
    if (hydratedInvoiceIdRef.current === invoiceId) return
    hydratedInvoiceIdRef.current = invoiceId

    setSavedId(existingInvoice.id || null)
    setLeadId(existingInvoice.leadId || '')
    setInvoiceTemplateId(existingInvoice.invoiceTemplateId || '')
    setLayoutPreset(Number(existingInvoice.layoutPreset) || 1)
    setCurrency(normalizeCurrencyCode(existingInvoice.currency))
    setIssueDate(existingInvoice.issueDate ? String(existingInvoice.issueDate).slice(0, 10) : new Date().toISOString().slice(0, 10))
    setDueDate(existingInvoice.dueDate ? String(existingInvoice.dueDate).slice(0, 10) : '')
    setReference(existingInvoice.reference || '')
    setPurchaseOrderRef(existingInvoice.purchaseOrderRef || '')
    setAddressLine(addressFromSnapshot(existingInvoice.customerSnapshot))
    setNotes(existingInvoice.notes || '')
    setTermsSnapshot(existingInvoice.termsSnapshot || '')
    setPreviewNumber(existingInvoice.invoiceNumber || 'Invoice')

    const fetchedItems = Array.isArray(existingInvoice.items) ? existingInvoice.items : []
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

    const t = existingInvoice.documentTheme
    if (t && typeof t === 'object') {
      setDocumentTheme({
        accentColor: String(t.accentColor || '#059669'),
        headerTone: t.headerTone === 'dark' ? 'dark' : 'light',
      })
    }
  }, [existingInvoice, invoiceId])

  useEffect(() => {
    if (activeDealId) return
    if (!initialLeadId || !leads.length) return
    if (!leadId) applyLeadSelection(initialLeadId)
  }, [activeDealId, initialLeadId, leads, leadId])

  const selectedLead = useMemo(() => {
    if (activeDealId && dealParentLead) return dealParentLead
    return leads.find((l) => l.id === leadId)
  }, [leads, leadId, activeDealId, dealParentLead])

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

  const showBankOnPreview = useMemo(() => {
    if (!tpl?.sectionSettings || typeof tpl.sectionSettings !== 'object') return true
    return tpl.sectionSettings.showBankDetails !== false
  }, [tpl])

  const totals = useMemo(() => {
    const raw = lines.map((l) => ({
      name: l.name,
      quantity: Number(l.quantity) || 0,
      unitPrice: Number(l.unitPrice) || 0,
      taxPct: l.taxPct === '' || l.taxPct == null ? null : Number(l.taxPct),
      discountPct: l.discountPct === '' || l.discountPct == null ? null : Number(l.discountPct),
    }))
    return aggregateInvoiceTotals(raw, { roundOff: 0 })
  }, [lines])

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

  async function saveDraft() {
    const items = buildItemsPayload()
    if (!activeDealId && !leadId) {
      toast.error('Select a client')
      return
    }
    if (!items.length) {
      toast.error('Add at least one line item')
      return
    }

    const themePayload =
      documentTheme.accentColor || documentTheme.headerTone
        ? {
            accentColor: documentTheme.accentColor || undefined,
            headerTone: documentTheme.headerTone || undefined,
          }
        : null

    const normalizedCurrency = normalizeCurrencyCode(currency)
    const createBody = {
      ...(activeDealId ? { dealId: activeDealId } : { leadId }),
      invoiceTemplateId: invoiceTemplateId || null,
      issueDate: toIsoDate(issueDate),
      dueDate: dueDate ? toIsoDate(dueDate) : null,
      reference: reference.trim() || null,
      purchaseOrderRef: purchaseOrderRef.trim() || null,
      customerSnapshot,
      currency: normalizedCurrency,
      layoutPreset,
      notes: notes.trim() || null,
      termsSnapshot: termsSnapshot.trim() || null,
      status: 'draft',
      items,
      documentTheme: themePayload,
    }

    const patchBody = {
      invoiceTemplateId: invoiceTemplateId || null,
      issueDate: toIsoDate(issueDate),
      dueDate: dueDate ? toIsoDate(dueDate) : null,
      reference: reference.trim() || null,
      purchaseOrderRef: purchaseOrderRef.trim() || null,
      customerSnapshot,
      currency: normalizedCurrency,
      layoutPreset,
      notes: notes.trim() || null,
      termsSnapshot: termsSnapshot.trim() || null,
      status: 'draft',
      items,
      documentTheme: themePayload,
    }

    try {
      if (savedId) {
        const res = await patchInvoice({ id: savedId, ...patchBody }).unwrap()
        const inv = res?.data ?? res
        toast.success('Draft saved')
        setPreviewNumber(inv.invoiceNumber || previewNumber)
      } else {
        const res = await createInvoice(createBody).unwrap()
        const inv = res?.data ?? res
        setSavedId(inv.id)
        setPreviewNumber(inv.invoiceNumber || 'Invoice')
        toast.success('Draft saved')
      }
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Save failed')
    }
  }

  async function sendInvoice() {
    const items = buildItemsPayload()
    if (!activeDealId && !leadId) {
      toast.error('Select a client')
      return
    }
    if (!items.length) {
      toast.error('Add at least one line item')
      return
    }

    const themePayload =
      documentTheme.accentColor || documentTheme.headerTone
        ? {
            accentColor: documentTheme.accentColor || undefined,
            headerTone: documentTheme.headerTone || undefined,
          }
        : null

    try {
      if (savedId) {
        await patchInvoice({
          id: savedId,
          status: 'issued',
          issueDate: toIsoDate(issueDate),
          dueDate: dueDate ? toIsoDate(dueDate) : null,
          reference: reference.trim() || null,
          purchaseOrderRef: purchaseOrderRef.trim() || null,
          customerSnapshot,
          currency: normalizeCurrencyCode(currency),
          layoutPreset,
          notes: notes.trim() || null,
          termsSnapshot: termsSnapshot.trim() || null,
          items,
          documentTheme: themePayload,
        }).unwrap()
        toast.success('Invoice issued')
        navigate(`/invoices/${savedId}/print`)
      } else {
        const res = await createInvoice({
          ...(activeDealId ? { dealId: activeDealId } : { leadId }),
          invoiceTemplateId: invoiceTemplateId || null,
          issueDate: toIsoDate(issueDate),
          dueDate: dueDate ? toIsoDate(dueDate) : null,
          reference: reference.trim() || null,
          purchaseOrderRef: purchaseOrderRef.trim() || null,
          customerSnapshot,
          currency: normalizeCurrencyCode(currency),
          layoutPreset,
          notes: notes.trim() || null,
          termsSnapshot: termsSnapshot.trim() || null,
          status: 'issued',
          items,
          documentTheme: themePayload,
        }).unwrap()
        const inv = res?.data ?? res
        toast.success('Invoice issued')
        navigate(`/invoices/${inv.id}/print`)
      }
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Could not issue invoice')
    }
  }

  const busy = creating || patching || tplLoading || invoiceLoading

  return (
    <PageShell fullWidth>
      <div className="flex min-h-0 w-full min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">New invoice</h1>
            <p className="text-xs text-neutral-500">{INVOICE_PRESET_LABELS[layoutPreset - 1] || 'Invoice'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600 lg:hidden">
              <input type="checkbox" checked={showPreviewMobile} onChange={(e) => setShowPreviewMobile(e.target.checked)} />
              Show preview
            </label>
            {savedId ? (
              <Link
                to={`/invoices/${savedId}/print`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50"
              >
                <Printer className="h-4 w-4" />
                Print / PDF
              </Link>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={saveDraft}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 shadow-sm hover:bg-neutral-50 disabled:opacity-50"
            >
              {creating || patching ? 'Saving…' : 'Save as draft'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={sendInvoice}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              Send invoice
            </button>
          </div>
        </div>

        <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
          <div className="flex min-w-0 flex-col gap-4">
            <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-neutral-900">Invoice details</h2>
              <div className="mt-4 space-y-4">
                <label className="block text-xs font-medium text-neutral-600">
                  Deal
                  <select
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs"
                    value={leadId}
                    disabled={Boolean(activeDealId)}
                    onChange={(e) => applyLeadSelection(e.target.value)}
                  >
                    <option value="">Select deal…</option>
                    {dealOptions.map((l) => {
                      const who = (l.contactName || l.title || 'Lead').trim()
                      const co = (l.company || '').trim() || '—'
                      const stage = String(l.opportunityStage || l.pipelineStage || l.currentStage || 'Open')
                      return (
                        <option key={l.id} value={l.id}>
                          Deal #{shortDealId(l)} · {who} · {co} · {stage}
                        </option>
                      )
                    })}
                  </select>
                </label>

                <label className="block text-xs font-medium text-neutral-600">
                  Bill to
                  <select
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs"
                    value={leadId}
                    disabled={Boolean(activeDealId)}
                    onChange={(e) => applyLeadSelection(e.target.value)}
                  >
                    <option value="">Select client…</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {(l.contactName || l.title || 'Lead').trim()} · {(l.company || '').trim() || '—'}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-neutral-600">
                    Invoice number
                    <input
                      readOnly
                      className="mt-1 w-full rounded-lg border border-neutral-100 bg-neutral-50 px-2.5 py-1.5 text-xs text-neutral-600"
                      value={previewNumber}
                    />
                  </label>
                  <label className="block text-xs font-medium text-neutral-600">
                    Due date
                    <input
                      type="date"
                      className="mt-1 w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-neutral-600">
                    Issue date
                    <input
                      type="date"
                      className="mt-1 w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-medium text-neutral-600">
                    Currency
                    <select
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs"
                      value={currency}
                      onChange={(e) => setCurrency(normalizeCurrencyCode(e.target.value))}
                    >
                      {INVOICE_CURRENCY_OPTIONS.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block text-xs font-medium text-neutral-600">
                  Billing address
                  <textarea
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="Street, city, region…"
                  />
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-neutral-600">
                    Reference
                    <input
                      className="mt-1 w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-medium text-neutral-600">
                    PO number
                    <input
                      className="mt-1 w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs"
                      value={purchaseOrderRef}
                      onChange={(e) => setPurchaseOrderRef(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-neutral-900">Line items</h2>
                <button
                  type="button"
                  className="text-sm font-medium text-[#534AB7] hover:underline"
                  onClick={() => setLines((prev) => [...prev, emptyLine()])}
                >
                  + Add item
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {lines.map((line, idx) => (
                  <div key={idx} className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-3">
                    <input
                      placeholder="Description"
                      className="mb-2 w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium"
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
                          className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-xs"
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
                          className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-xs"
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
                          className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-xs"
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
                            'rounded-md p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600',
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

            <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-neutral-900">Appearance</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-xs font-medium text-neutral-600">
                  Accent color
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      className="h-10 w-14 cursor-pointer rounded border border-neutral-200 bg-white"
                      value={documentTheme.accentColor || '#059669'}
                      onChange={(e) => setDocumentTheme((t) => ({ ...t, accentColor: e.target.value }))}
                    />
                    <input
                      className="flex-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 font-mono text-xs"
                      value={documentTheme.accentColor || ''}
                      onChange={(e) => setDocumentTheme((t) => ({ ...t, accentColor: e.target.value }))}
                    />
                  </div>
                </label>
                <label className="block text-xs font-medium text-neutral-600">
                  Header style
                  <select
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs"
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
                    className="mt-1 w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs"
                    value={layoutPreset}
                    onChange={(e) => setLayoutPreset(Number(e.target.value))}
                  >
                    {INVOICE_PRESET_LABELS.map((label, i) => (
                      <option key={label} value={i + 1}>
                        {i + 1}. {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <label className="block text-xs font-medium text-neutral-600">
                Terms (shown on PDF)
                <textarea
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs"
                  value={termsSnapshot}
                  onChange={(e) => setTermsSnapshot(e.target.value)}
                />
              </label>
              <label className="mt-4 block text-xs font-medium text-neutral-600">
                Notes
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs"
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
            <div className="flex min-h-0 flex-1 flex-col rounded-2xl bg-neutral-100 p-2 lg:p-3">
              <ScaledA4PreviewViewport fit="width" className="min-h-[280px]">
                <SalesDocumentPreview
                  embedded
                  variant="invoice"
                  preset={layoutPreset}
                  showBankDetails={showBankOnPreview}
                  billing={billing}
                  customer={customerSnapshot}
                  headerNumber={previewNumber}
                  headerTitle="Invoice"
                  issueDate={issueDate}
                  secondaryDateLabel="Due"
                  secondaryDate={dueDate || null}
                  lines={previewLines.length ? previewLines : [{ name: 'Sample item', quantity: 1, unitPrice: 0, lineTotal: 0 }]}
                  subtotal={totals.subtotal}
                  discountTotal={totals.discountTotal}
                  shipping={0}
                  adjustment={0}
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
