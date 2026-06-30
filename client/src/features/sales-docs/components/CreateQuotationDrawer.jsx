import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { cn } from '@/utils/cn'
import { useCreateQuotationMutation, useGetQuotationTemplatesQuery } from '@/features/sales-docs/quotationsApi'
import { useGetDealsQuery } from '@/features/deals/dealsApi'
import { QUOTATION_PRESET_LABELS } from '@/features/sales-docs/presetLabels'
import { useEffectiveCurrency } from '@/hooks/useEffectiveCurrency'

const emptyLine = () => ({
  name: '',
  quantity: 1,
  unitPrice: 0,
  taxPct: 0,
  discountPct: 0,
})

function dealSelectLabel(d) {
  const dealName = (d.dealName || '').trim()
  const contact = (d.fullName || '').trim() || '—'
  const company = (d.companyName || '').trim() || '—'
  const head = dealName || contact
  return `${head} · ${contact} · ${company}`
}

export function CreateQuotationDrawer({ open, onClose, initialLeadId = null }) {
  const effectiveCurrency = useEffectiveCurrency()
  const [dealId, setDealId] = useState('')
  const [dealSearch, setDealSearch] = useState('')
  const [debouncedDealSearch, setDebouncedDealSearch] = useState('')
  const [quotationTemplateId, setQuotationTemplateId] = useState('')
  const [layoutPreset, setLayoutPreset] = useState(1)
  const [currency, setCurrency] = useState('USD')
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [lines, setLines] = useState([emptyLine()])
  const [createQuotation, { isLoading }] = useCreateQuotationMutation()
  const { data: dealsRes } = useGetDealsQuery(
    {
      page: 1,
      limit: 200,
      search: debouncedDealSearch || undefined,
      ...(initialLeadId ? { parentOpportunityLeadId: initialLeadId } : {}),
    },
    { skip: !open },
  )
  const { data: tplRes } = useGetQuotationTemplatesQuery()

  const deals = dealsRes?.data || []
  const templates = tplRes?.data?.items ?? tplRes?.items ?? []

  useEffect(() => {
    if (!open) {
      setDealId('')
      setDealSearch('')
    } else {
      setCurrency(effectiveCurrency)
    }
  }, [open, effectiveCurrency])

  useEffect(() => {
    if (!open || !initialLeadId) return
    if (deals.length === 1) setDealId(deals[0].id)
  }, [open, initialLeadId, deals])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedDealSearch(dealSearch.trim()), 300)
    return () => clearTimeout(t)
  }, [dealSearch])

  const templateOptions = useMemo(() => (Array.isArray(templates) ? templates : []), [templates])

  async function submit() {
    if (!dealId) {
      toast.error('Select a deal')
      return
    }
    const items = lines
      .map((l) => ({
        name: String(l.name || '').trim(),
        quantity: Number(l.quantity) || 1,
        unitPrice: Number(l.unitPrice) || 0,
        taxPct: l.taxPct === '' || l.taxPct == null ? null : Number(l.taxPct),
        discountPct: l.discountPct === '' || l.discountPct == null ? null : Number(l.discountPct),
      }))
      .filter((l) => l.name)

    if (!items.length) {
      toast.error('Add at least one line item with a name')
      return
    }

    try {
      await createQuotation({
        dealId,
        quotationTemplateId: quotationTemplateId || null,
        issueDate: new Date(issueDate).toISOString(),
        currency,
        layoutPreset,
        items,
      }).unwrap()
      toast.success('Quotation created')
      onClose?.()
      setLines([emptyLine()])
      setQuotationTemplateId('')
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Could not create quotation')
    }
  }

  return (
    <RightDrawer open={open} onClose={onClose} title="New quotation">
      <div className="flex flex-col gap-4 px-1 pb-8 pt-2">
        <label className="block text-xs font-medium text-neutral-600">
          Deal
          <input
            type="search"
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            placeholder="Search deals…"
            value={dealSearch}
            onChange={(e) => setDealSearch(e.target.value)}
          />
          <select
            className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            value={dealId}
            onChange={(e) => setDealId(e.target.value)}
          >
            <option value="">Select…</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>
                {dealSelectLabel(d)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-neutral-600">
          Template (optional)
          <select
            className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            value={quotationTemplateId}
            onChange={(e) => setQuotationTemplateId(e.target.value)}
          >
            <option value="">None</option>
            {templateOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.code})
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
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
            <input
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm uppercase"
              value={currency}
              maxLength={3}
              onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
            />
          </label>
        </div>

        <label className="block text-xs font-medium text-neutral-600">
          Layout preset (visual style)
          <select
            className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
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

        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Line items</p>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add line
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 text-sm shadow-sm"
              >
                <input
                  placeholder="Item name"
                  className="mb-2 w-full rounded border border-neutral-200 px-2 py-1.5 text-sm font-medium"
                  value={line.name}
                  onChange={(e) => {
                    const v = e.target.value
                    setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, name: v } : x)))
                  }}
                />
                <div className="grid grid-cols-5 gap-2">
                  <label className="text-[11px] text-neutral-500">
                    Qty
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1"
                      value={line.quantity}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)),
                        )
                      }
                    />
                  </label>
                  <label className="text-[11px] text-neutral-500">
                    Price
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1"
                      value={line.unitPrice}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, unitPrice: e.target.value } : x)),
                        )
                      }
                    />
                  </label>
                  <label className="text-[11px] text-neutral-500">
                    Disc %
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      placeholder="0"
                      className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1"
                      value={line.discountPct}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, discountPct: e.target.value } : x)),
                        )
                      }
                    />
                  </label>
                  <label className="text-[11px] text-neutral-500">
                    Tax %
                    <input
                      type="number"
                      min="0"
                      className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1"
                      value={line.taxPct}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, taxPct: e.target.value } : x)),
                        )
                      }
                    />
                  </label>
                  <div className="flex items-end justify-end">
                    <button
                      type="button"
                      className={cn(
                        'rounded-md p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600',
                        lines.length <= 1 && 'pointer-events-none opacity-30',
                      )}
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
          <button
            type="button"
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-primary-dark)] disabled:opacity-50"
            onClick={submit}
          >
            {isLoading ? 'Saving…' : 'Create quotation'}
          </button>
        </div>
      </div>
    </RightDrawer>
  )
}
