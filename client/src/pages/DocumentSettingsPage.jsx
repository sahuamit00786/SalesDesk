import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AlertTriangle, FileText, Receipt } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { PageStack } from '@/components/layout/PageStack'
import { Button } from '@/components/ui/Button'
import { inputFieldClassName } from '@/components/ui/Input'
import { cn } from '@/utils/cn'
import {
  useGetBillingProfileQuery,
  usePatchBillingProfileMutation,
} from '@/features/sales-docs/billingProfileApi'
import { DOC_NUMBER_FORMATS, buildDocNumberPreview } from '@/features/sales-docs/docNumberPreview'

const fieldLabel = 'block text-xs font-medium text-ink-muted'
const fieldInput = cn(inputFieldClassName, 'mt-1')

function NumberingCard({ icon: Icon, iconClass, title, description, value, initial, onChange, children }) {
  const preview = buildDocNumberPreview({ prefix: value.prefix, format: value.format, seq: value.nextSeq })
  const lowered = initial != null && Number(value.nextSeq) < Number(initial)

  return (
    <section className="rounded-2xl border border-surface-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', iconClass)}>
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className={fieldLabel}>
          Prefix
          <input
            className={fieldInput}
            maxLength={32}
            value={value.prefix}
            onChange={(e) => onChange({ ...value, prefix: e.target.value })}
            placeholder="e.g. INV"
          />
        </label>
        <label className={fieldLabel}>
          Next number
          <input
            type="number"
            min={1}
            className={fieldInput}
            value={value.nextSeq}
            onChange={(e) => onChange({ ...value, nextSeq: e.target.value })}
          />
        </label>
        <label className={fieldLabel}>
          Format
          <select
            className={fieldInput}
            value={value.format}
            onChange={(e) => onChange({ ...value, format: e.target.value })}
          >
            {DOC_NUMBER_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label} — {buildDocNumberPreview({ prefix: value.prefix || 'DOC', format: f.value, seq: value.nextSeq })}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-surface-border bg-surface-subtle/50 px-3.5 py-2.5">
        <span className="text-xs text-ink-muted">Next document number:</span>
        <span className="font-mono text-sm font-semibold tabular-nums text-ink">{preview}</span>
      </div>

      {lowered && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          Lowering the next number below its current value ({initial}) can produce duplicate document numbers. Allowed, but double-check before saving.
        </div>
      )}

      {children}
    </section>
  )
}

export function DocumentSettingsPage() {
  const { data, isLoading } = useGetBillingProfileQuery()
  const [patchProfile, { isLoading: saving }] = usePatchBillingProfileMutation()
  const profile = data?.data

  const [quotation, setQuotation] = useState({ prefix: 'QT', nextSeq: 1001, format: 'PREFIX/DDMMYYYY/SEQ' })
  const [invoice, setInvoice] = useState({ prefix: 'INV', nextSeq: 1001, format: 'PREFIX/DDMMYYYY/SEQ' })
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    if (!profile || seeded) return
    setQuotation({
      prefix: profile.quotationPrefix || 'QT',
      nextSeq: profile.quotationNextSeq ?? 1001,
      format: profile.quotationNumberFormat || 'PREFIX/DDMMYYYY/SEQ',
    })
    setInvoice({
      prefix: profile.invoicePrefix || 'INV',
      nextSeq: profile.invoiceNextSeq ?? 1001,
      format: profile.invoiceNumberFormat || 'PREFIX/DDMMYYYY/SEQ',
    })
    setSeeded(true)
  }, [profile, seeded])

  async function save() {
    const qPrefix = quotation.prefix.trim()
    const iPrefix = invoice.prefix.trim()
    if (!qPrefix || !iPrefix) return toast.error('Prefixes cannot be empty')
    const qSeq = Number(quotation.nextSeq)
    const iSeq = Number(invoice.nextSeq)
    if (!Number.isInteger(qSeq) || qSeq < 1 || !Number.isInteger(iSeq) || iSeq < 1) {
      return toast.error('Next number must be a whole number of at least 1')
    }
    try {
      await patchProfile({
        quotationPrefix: qPrefix,
        quotationNextSeq: qSeq,
        quotationNumberFormat: quotation.format,
        invoicePrefix: iPrefix,
        invoiceNextSeq: iSeq,
        invoiceNumberFormat: invoice.format,
      }).unwrap()
      toast.success('Document numbering saved')
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Could not save settings')
    }
  }

  return (
    <PageShell>
      <PageStack>
        {isLoading ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-4">
            <NumberingCard
              icon={FileText}
              iconClass="bg-brand-50 text-brand-700"
              title="Quotation numbering"
              description="Prefix, sequence, and format applied to every new quotation in this workspace."
              value={quotation}
              initial={profile?.quotationNextSeq}
              onChange={setQuotation}
            />

            <NumberingCard
              icon={Receipt}
              iconClass="bg-violet-50 text-violet-700"
              title="Invoice numbering"
              description="Prefix, sequence, and format applied to new invoices, including quotations converted to invoices."
              value={invoice}
              initial={profile?.invoiceNextSeq}
              onChange={setInvoice}
            >
              <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                Invoice templates with <span className="font-medium text-ink">“Use template numbering”</span> enabled
                override these settings for invoices created from that template — manage them in{' '}
                <Link to="/sales-docs/templates?tab=invoice" className="font-medium text-brand-700 hover:underline">
                  Doc templates
                </Link>
                .
              </p>
            </NumberingCard>

            <div className="flex justify-end">
              <Button type="button" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save numbering settings'}
              </Button>
            </div>
          </div>
        )}
      </PageStack>
    </PageShell>
  )
}
