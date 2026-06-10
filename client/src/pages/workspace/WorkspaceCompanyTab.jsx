import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Building2, ImagePlus, Landmark, Loader2, Save, Trash2 } from 'lucide-react'
import { useGetBillingProfileQuery, usePatchBillingProfileMutation } from '@/features/sales-docs/billingProfileApi'
import { useUploadDocumentMutation } from '@/features/documents/documentsApi'
import { PhoneField } from '@/components/ui/PhoneField'
import { cn } from '@/utils/cn'

function isoCountryForPhone(countryField) {
  const c = String(countryField || '')
    .trim()
    .toUpperCase()
  return c.length === 2 ? c : 'IN'
}

const IN_BANK_ACCOUNT_TYPES = [
  { value: '', label: 'Account type' },
  { value: 'Savings', label: 'Savings' },
  { value: 'Current', label: 'Current' },
  { value: 'Cash Credit', label: 'Cash Credit' },
  { value: 'Overdraft', label: 'Overdraft' },
]

const COMPANY_FORM_TABS = [
  { id: 'profile', label: 'Company & address', icon: Building2 },
  { id: 'payments', label: 'Bank & documents', icon: Landmark },
]

const TAX_LABEL_OPTIONS = [
  { value: 'GSTIN', label: 'GSTIN (India)' },
  { value: 'VAT ID', label: 'VAT ID' },
  { value: 'EIN', label: 'EIN (US)' },
  { value: 'ABN', label: 'ABN (Australia)' },
  { value: 'Company registration no.', label: 'Company registration no.' },
  { value: 'PAN', label: 'PAN (India)' },
  { value: 'Custom', label: 'Custom label…' },
]

function taxIdMaxLen(label) {
  if (label === 'GSTIN') return 15
  if (label === 'PAN') return 10
  return 64
}

function taxIdHintFor(label) {
  if (label === 'GSTIN') {
    return '15-character GSTIN (state + PAN core + entity / Z / checksum). Letters and digits only, uppercase.'
  }
  if (label === 'PAN') return '10-character PAN: five letters, four digits, one letter (e.g. AABCU9604R).'
  if (label === 'Custom') return 'Enter the ID that matches your custom label above.'
  return 'Enter the number or code for the selected type.'
}

function normalizeTaxIdValue(draft, raw) {
  const s = String(raw ?? '')
  if (draft.taxIdLabel === 'GSTIN') return s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15)
  if (draft.taxIdLabel === 'PAN') return s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
  return s.slice(0, 64)
}

function apiErrorMessage(err) {
  return err?.data?.error?.message ?? err?.error ?? 'Something went wrong'
}

function publicAssetUrl(path) {
  if (!path) return ''
  const p = String(path).trim()
  if (p.startsWith('http://') || p.startsWith('https://')) return p
  return p.startsWith('/') ? p : `/${p}`
}

function emptyDraft() {
  return {
    legalName: '',
    email: '',
    phone: '',
    website: '',
    logoUrl: '',
    taxIdLabel: 'GSTIN',
    taxIdValue: '',
    taxIdCustomLabel: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    bankName: '',
    bankAccountHolderName: '',
    bankBranch: '',
    micrCode: '',
    bankAccountType: '',
    bankAccountNumber: '',
    bankIfsc: '',
    bankSwift: '',
    upiId: '',
    paymentLinkUrl: '',
    paymentInstructions: '',
    signatureImageUrl: '',
    stampImageUrl: '',
  }
}

function profileToDraft(p) {
  if (!p) return emptyDraft()
  const label = (p.taxIdLabel || '').trim()
  const known = TAX_LABEL_OPTIONS.some((o) => o.value !== 'Custom' && o.value === label)
  return {
    legalName: p.legalName ?? '',
    email: p.email ?? '',
    phone: p.phone ?? '',
    website: p.website ?? '',
    logoUrl: p.logoUrl ?? '',
    taxIdLabel: known ? label : label ? 'Custom' : 'GSTIN',
    taxIdValue: p.taxIdValue ?? '',
    taxIdCustomLabel: known || !label ? '' : label,
    addressLine1: p.addressLine1 ?? '',
    addressLine2: p.addressLine2 ?? '',
    city: p.city ?? '',
    state: p.state ?? '',
    postalCode: p.postalCode ?? '',
    country: (p.country ?? '').toUpperCase().slice(0, 2),
    bankName: p.bankName ?? '',
    bankAccountHolderName: p.bankAccountHolderName ?? '',
    bankBranch: p.bankBranch ?? '',
    micrCode: p.micrCode ?? '',
    bankAccountType: p.bankAccountType ?? '',
    bankAccountNumber: p.bankAccountNumber ?? '',
    bankIfsc: (p.bankIfsc ?? '').toUpperCase(),
    bankSwift: p.bankSwift ?? '',
    upiId: p.upiId ?? '',
    paymentLinkUrl: p.paymentLinkUrl ?? '',
    paymentInstructions: p.paymentInstructions ?? '',
    signatureImageUrl: p.signatureImageUrl ?? '',
    stampImageUrl: p.stampImageUrl ?? '',
  }
}

function draftToPatchBody(d) {
  const taxLabel =
    d.taxIdLabel === 'Custom' ? (d.taxIdCustomLabel || '').trim() || null : (d.taxIdLabel || '').trim() || null
  const trim = (v) => {
    const s = typeof v === 'string' ? v.trim() : v
    return s === '' ? null : s
  }
  return {
    legalName: trim(d.legalName),
    email: trim(d.email),
    phone: trim(d.phone),
    website: trim(d.website),
    logoUrl: trim(d.logoUrl),
    taxIdLabel: taxLabel,
    taxIdValue: (() => {
      const n = normalizeTaxIdValue(d, d.taxIdValue).trim()
      return n === '' ? null : n
    })(),
    addressLine1: trim(d.addressLine1),
    addressLine2: trim(d.addressLine2),
    city: trim(d.city),
    state: trim(d.state),
    postalCode: trim(d.postalCode),
    country: trim((d.country || '').toUpperCase().slice(0, 2)),
    bankName: trim(d.bankName),
    bankAccountHolderName: trim(d.bankAccountHolderName),
    bankBranch: trim(d.bankBranch),
    micrCode: trim(String(d.micrCode || '').replace(/\D/g, '').slice(0, 9)) || null,
    bankAccountType: trim(d.bankAccountType),
    bankAccountNumber: trim(d.bankAccountNumber),
    bankIfsc: trim(String(d.bankIfsc || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11)),
    bankSwift: trim(d.bankSwift),
    upiId: trim(d.upiId),
    paymentLinkUrl: trim(d.paymentLinkUrl),
    paymentInstructions: trim(d.paymentInstructions),
    signatureImageUrl: trim(d.signatureImageUrl),
    stampImageUrl: trim(d.stampImageUrl),
  }
}

function FieldLabel({ children, hint }) {
  return (
    <div className="mb-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{children}</span>
      {hint ? <p className="mt-0.5 text-[11px] font-normal normal-case text-ink-faint">{hint}</p> : null}
    </div>
  )
}

function inputClass(extra = '') {
  return cn(
    'w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm text-ink shadow-sm outline-none transition placeholder:text-ink-faint hover:border-zinc-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/25 dark:border-zinc-600 dark:bg-zinc-950/40 dark:hover:border-zinc-500',
    extra,
  )
}

export function WorkspaceCompanyTab() {
  const { data, isLoading, isError, error, refetch } = useGetBillingProfileQuery()
  const [patchProfile, { isLoading: saving }] = usePatchBillingProfileMutation()
  const [uploadDocument, { isLoading: uploadingImage }] = useUploadDocumentMutation()
  const [companyTab, setCompanyTab] = useState('profile')

  const profile = data?.data
  const [draft, setDraft] = useState(emptyDraft)
  const [baselineJson, setBaselineJson] = useState(null)

  useEffect(() => {
    if (!profile) return
    const d = profileToDraft(profile)
    setDraft(d)
    setBaselineJson(JSON.stringify(draftToPatchBody(d)))
  }, [profile])

  const dirty = useMemo(() => {
    if (baselineJson === null) return false
    return JSON.stringify(draftToPatchBody(draft)) !== baselineJson
  }, [draft, baselineJson])

  async function handleSave(e) {
    e.preventDefault()
    try {
      await patchProfile(draftToPatchBody(draft)).unwrap()
      toast.success('Company information saved')
      refetch()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  async function onDocImageUpload(field, ev) {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be 5MB or smaller')
      return
    }
    const names = { logoUrl: 'company-logo', signatureImageUrl: 'company-signature', stampImageUrl: 'company-stamp' }
    try {
      const res = await uploadDocument({
        file,
        name: file.name || names[field] || 'company-image',
        fileType: 'Image',
      }).unwrap()
      const row = res?.data
      const fp = row?.filePath || row?.file_path
      if (!fp) {
        toast.error('Upload succeeded but no file path returned')
        return
      }
      setDraft((d) => ({ ...d, [field]: fp }))
      toast.success('Image uploaded — save to keep it on documents')
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-white px-3 py-4 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading company profile…
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="w-full">
        <div className="rounded-xl border border-surface-border bg-white px-3 py-4 text-sm text-ink-muted">
          {apiErrorMessage(error)}
          <button type="button" className="ml-2 font-medium text-brand-600 hover:underline" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="w-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-border bg-white px-2.5 py-2 sm:px-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">Company information</h2>
          <p className="mt-0.5 text-xs leading-snug text-ink-muted">
            Shown on quotations and invoices. Numbers auto-format as{' '}
            <span className="font-mono text-ink">QT/DDMMYYYY/n</span> / <span className="font-mono text-ink">INV/DDMMYYYY/n</span>. Country: ISO-2.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving || !dirty}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-slate-800 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 sm:h-10 sm:px-4"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" aria-hidden />}
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-surface-border bg-white/90 p-1" role="tablist" aria-label="Company form sections">
        {COMPANY_FORM_TABS.map((t) => {
          const Icon = t.icon
          const active = companyTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCompanyTab(t.id)}
              className={cn(
                'inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition sm:flex-none sm:px-3',
                active ? 'bg-slate-100 text-brand-800 ring-1 ring-brand-200/80' : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
              <span className="truncate">{t.label}</span>
            </button>
          )
        })}
      </div>

      {companyTab === 'profile' ? (
        <>
      <section className="rounded-xl border border-surface-border bg-white p-2.5 sm:p-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-muted">Identity & contact</h3>
        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
          <div>
            <FieldLabel>Legal / company name</FieldLabel>
            <input
              type="text"
              value={draft.legalName}
              onChange={(e) => setDraft((d) => ({ ...d, legalName: e.target.value }))}
              className={inputClass()}
              placeholder="Registered business name"
              maxLength={240}
            />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              className={inputClass()}
              placeholder="billing@company.com"
            />
          </div>
          <div>
            <PhoneField
              label="Phone"
              mode="e164"
              defaultCountry={isoCountryForPhone(draft.country)}
              value={draft.phone}
              onChange={(v) => setDraft((d) => ({ ...d, phone: v || '' }))}
            />
          </div>
          <div>
            <FieldLabel hint="Shown on documents and footers.">Website</FieldLabel>
            <input
              type="url"
              value={draft.website}
              onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))}
              className={inputClass()}
              placeholder="https://"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-white p-2.5 sm:p-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-muted">Logo</h3>
        <p className="mt-1 text-xs text-ink-muted">Upload stores the file in your workspace library, or paste an image URL.</p>
        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 sm:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-300 bg-surface-muted dark:border-zinc-600">
            {draft.logoUrl ? (
              <img src={publicAssetUrl(draft.logoUrl)} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="px-2 text-center text-[10px] text-ink-faint">No logo</span>
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <div>
              <FieldLabel>Logo image URL (optional)</FieldLabel>
              <input
                type="text"
                value={draft.logoUrl}
                onChange={(e) => setDraft((d) => ({ ...d, logoUrl: e.target.value }))}
                className={inputClass('font-mono text-xs')}
                placeholder="/uploads/… or https://…"
                maxLength={512}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-surface-subtle px-2.5 py-1.5 text-xs font-medium text-ink transition hover:bg-surface-muted dark:border-zinc-600">
                <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                {uploadingImage ? 'Uploading…' : 'Choose image file'}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => onDocImageUpload('logoUrl', e)} disabled={uploadingImage} />
              </label>
              {draft.logoUrl ? (
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, logoUrl: '' }))}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-white p-2.5 sm:p-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-muted">Tax & registration</h3>
        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
          <div>
            <FieldLabel>Tax ID type</FieldLabel>
            <select
              value={draft.taxIdLabel}
              onChange={(e) => {
                const next = e.target.value
                setDraft((d) => ({
                  ...d,
                  taxIdLabel: next,
                  taxIdValue: normalizeTaxIdValue({ ...d, taxIdLabel: next }, d.taxIdValue),
                }))
              }}
              className={inputClass()}
            >
              {TAX_LABEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {draft.taxIdLabel === 'Custom' ? (
            <div>
              <FieldLabel>Custom label</FieldLabel>
              <input
                type="text"
                value={draft.taxIdCustomLabel}
                onChange={(e) => setDraft((d) => ({ ...d, taxIdCustomLabel: e.target.value }))}
                className={inputClass()}
                placeholder="e.g. UEN"
                maxLength={64}
              />
            </div>
          ) : (
            <div>
              <FieldLabel hint={taxIdHintFor(draft.taxIdLabel)}>Tax ID number</FieldLabel>
              <input
                type="text"
                value={draft.taxIdValue}
                onChange={(e) => setDraft((d) => ({ ...d, taxIdValue: normalizeTaxIdValue(d, e.target.value) }))}
                className={cn(inputClass(), draft.taxIdLabel === 'GSTIN' || draft.taxIdLabel === 'PAN' ? 'font-mono uppercase' : '')}
                placeholder={draft.taxIdLabel === 'GSTIN' ? '22AAAAA0000A1Z5' : draft.taxIdLabel === 'PAN' ? 'AABCU9604R' : 'Number or ID'}
                maxLength={taxIdMaxLen(draft.taxIdLabel)}
              />
            </div>
          )}
          {draft.taxIdLabel === 'Custom' ? (
            <div className="sm:col-span-2">
              <FieldLabel hint={taxIdHintFor(draft.taxIdLabel)}>Tax ID number</FieldLabel>
              <input
                type="text"
                value={draft.taxIdValue}
                onChange={(e) => setDraft((d) => ({ ...d, taxIdValue: normalizeTaxIdValue(d, e.target.value) }))}
                className={inputClass()}
                placeholder="Number or ID"
                maxLength={taxIdMaxLen(draft.taxIdLabel)}
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-white p-2.5 sm:p-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-muted">Registered address</h3>
        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
          <div>
            <FieldLabel>Address line 1</FieldLabel>
            <input
              type="text"
              value={draft.addressLine1}
              onChange={(e) => setDraft((d) => ({ ...d, addressLine1: e.target.value }))}
              className={inputClass()}
              maxLength={255}
            />
          </div>
          <div>
            <FieldLabel>Address line 2</FieldLabel>
            <input
              type="text"
              value={draft.addressLine2}
              onChange={(e) => setDraft((d) => ({ ...d, addressLine2: e.target.value }))}
              className={inputClass()}
              maxLength={255}
            />
          </div>
          <div>
            <FieldLabel>City</FieldLabel>
            <input type="text" value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} className={inputClass()} maxLength={120} />
          </div>
          <div>
            <FieldLabel>State / province</FieldLabel>
            <input type="text" value={draft.state} onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))} className={inputClass()} maxLength={120} />
          </div>
          <div>
            <FieldLabel>Postal code</FieldLabel>
            <input
              type="text"
              value={draft.postalCode}
              onChange={(e) => setDraft((d) => ({ ...d, postalCode: e.target.value }))}
              className={inputClass()}
              maxLength={32}
            />
          </div>
          <div>
            <FieldLabel hint="Two-letter ISO code, e.g. IN, US, GB.">Country</FieldLabel>
            <input
              type="text"
              value={draft.country}
              onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value.toUpperCase().slice(0, 2) }))}
              className={inputClass('uppercase tabular-nums tracking-widest')}
              placeholder="IN"
              maxLength={2}
            />
          </div>
        </div>
      </section>
        </>
      ) : (
        <>
      <section className="rounded-xl border border-surface-border bg-white p-2.5 sm:p-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-muted">Bank & payments</h3>
        <p className="mt-1 text-xs text-ink-muted">These details appear on invoices and quotations for this workspace.</p>

        <div className="mt-3 rounded-lg border-l-4 border-emerald-700/80 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-950">
          <p className="font-semibold">India — NEFT, RTGS & IMPS</p>
          <p className="mt-1 leading-relaxed text-emerald-900/90">
            Add IFSC and account details exactly as on your cheque book or bank statement. MICR is optional (9 digits, printed on cheques).
          </p>
        </div>

        <div className="mt-4 space-y-1">
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Bank account</h4>
          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
            <div>
              <FieldLabel>Bank name</FieldLabel>
              <input
                type="text"
                value={draft.bankName}
                onChange={(e) => setDraft((d) => ({ ...d, bankName: e.target.value }))}
                className={inputClass()}
                placeholder="e.g. State Bank of India"
                maxLength={160}
              />
            </div>
            <div>
              <FieldLabel hint="Branch / location as registered with the bank.">Branch</FieldLabel>
              <input
                type="text"
                value={draft.bankBranch}
                onChange={(e) => setDraft((d) => ({ ...d, bankBranch: e.target.value }))}
                className={inputClass()}
                placeholder="e.g. MG Road, Bengaluru — Main branch"
                maxLength={255}
              />
            </div>
            <div>
              <FieldLabel hint="Beneficiary name as per bank records (may differ from legal name).">Account holder name</FieldLabel>
              <input
                type="text"
                value={draft.bankAccountHolderName}
                onChange={(e) => setDraft((d) => ({ ...d, bankAccountHolderName: e.target.value }))}
                className={inputClass()}
                maxLength={240}
              />
            </div>
            <div>
              <FieldLabel>Account type</FieldLabel>
              <select
                value={draft.bankAccountType}
                onChange={(e) => setDraft((d) => ({ ...d, bankAccountType: e.target.value }))}
                className={inputClass()}
              >
                {IN_BANK_ACCOUNT_TYPES.map((o) => (
                  <option key={o.value || 'none'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Account number</FieldLabel>
              <input
                type="text"
                inputMode="numeric"
                value={draft.bankAccountNumber}
                onChange={(e) => setDraft((d) => ({ ...d, bankAccountNumber: e.target.value }))}
                className={inputClass('tabular-nums')}
                maxLength={64}
              />
            </div>
            <div>
              <FieldLabel hint="11 characters, e.g. SBIN0001234.">IFSC code</FieldLabel>
              <input
                type="text"
                value={draft.bankIfsc}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    bankIfsc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11),
                  }))
                }
                className={inputClass('font-mono uppercase')}
                placeholder="SBIN0001234"
                maxLength={11}
              />
            </div>
            <div>
              <FieldLabel hint="Optional; 9 digits on cheque leaf.">MICR code</FieldLabel>
              <input
                type="text"
                inputMode="numeric"
                value={draft.micrCode}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    micrCode: e.target.value.replace(/\D/g, '').slice(0, 9),
                  }))
                }
                className={inputClass('tabular-nums')}
                placeholder="560002001"
                maxLength={9}
              />
            </div>
            <div className="hidden sm:block" aria-hidden />
          </div>
        </div>

        <div className="mt-4 space-y-1 border-t border-surface-border pt-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">India — UPI & payment links</h4>
          <p className="text-xs text-ink-muted">Shown on invoices when you add a UPI ID or a payment / collect link.</p>
          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
            <div>
              <FieldLabel>UPI ID</FieldLabel>
              <input
                type="text"
                value={draft.upiId}
                onChange={(e) => setDraft((d) => ({ ...d, upiId: e.target.value }))}
                className={inputClass()}
                placeholder="business@paytm"
                maxLength={120}
              />
            </div>
            <div>
              <FieldLabel>Payment / collect link</FieldLabel>
              <input
                type="url"
                value={draft.paymentLinkUrl}
                onChange={(e) => setDraft((d) => ({ ...d, paymentLinkUrl: e.target.value }))}
                className={inputClass()}
                placeholder="https://…"
                maxLength={512}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1 border-t border-surface-border pt-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">International wire (optional)</h4>
          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
            <div>
              <FieldLabel>SWIFT / BIC</FieldLabel>
              <input
                type="text"
                value={draft.bankSwift}
                onChange={(e) => setDraft((d) => ({ ...d, bankSwift: e.target.value.toUpperCase().slice(0, 32) }))}
                className={inputClass('font-mono uppercase')}
                maxLength={32}
              />
            </div>
            <div className="hidden sm:block" aria-hidden />
            <div className="sm:col-span-2">
              <FieldLabel hint="Any extra instructions (e.g. FIRC, NOSTRO, or NEFT narration).">Other payment instructions</FieldLabel>
              <textarea
                value={draft.paymentInstructions}
                onChange={(e) => setDraft((d) => ({ ...d, paymentInstructions: e.target.value }))}
                rows={3}
                className={inputClass('resize-y')}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-surface-border bg-white p-2.5 sm:p-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-muted">Optional document images</h3>
        <p className="mt-1 text-xs text-ink-muted">Signature and stamp for PDFs — paste a URL or upload an image (stored in your workspace files).</p>
        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-300 bg-surface-muted/30 p-2.5 dark:border-zinc-600">
            <FieldLabel>Signature</FieldLabel>
            <div className="mt-2 grid gap-2.5 sm:grid-cols-2 sm:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-300 bg-white dark:border-zinc-600">
                {draft.signatureImageUrl ? (
                  <img src={publicAssetUrl(draft.signatureImageUrl)} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="px-1 text-center text-[9px] text-ink-faint">None</span>
                )}
              </div>
              <div className="min-w-0 space-y-1.5 sm:col-span-1">
                <input
                  type="text"
                  value={draft.signatureImageUrl}
                  onChange={(e) => setDraft((d) => ({ ...d, signatureImageUrl: e.target.value }))}
                  className={inputClass('font-mono text-xs')}
                  placeholder="URL or upload below"
                  maxLength={512}
                />
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-[11px] font-medium text-ink dark:border-zinc-600">
                    <ImagePlus className="h-3 w-3" aria-hidden />
                    {uploadingImage ? '…' : 'Upload'}
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => onDocImageUpload('signatureImageUrl', e)} disabled={uploadingImage} />
                  </label>
                  {draft.signatureImageUrl ? (
                    <button
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, signatureImageUrl: '' }))}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-300 bg-surface-muted/30 p-2.5 dark:border-zinc-600">
            <FieldLabel>Company stamp</FieldLabel>
            <div className="mt-2 grid gap-2.5 sm:grid-cols-2 sm:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-300 bg-white dark:border-zinc-600">
                {draft.stampImageUrl ? (
                  <img src={publicAssetUrl(draft.stampImageUrl)} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="px-1 text-center text-[9px] text-ink-faint">None</span>
                )}
              </div>
              <div className="min-w-0 space-y-1.5 sm:col-span-1">
                <input
                  type="text"
                  value={draft.stampImageUrl}
                  onChange={(e) => setDraft((d) => ({ ...d, stampImageUrl: e.target.value }))}
                  className={inputClass('font-mono text-xs')}
                  placeholder="URL or upload below"
                  maxLength={512}
                />
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-[11px] font-medium text-ink dark:border-zinc-600">
                    <ImagePlus className="h-3 w-3" aria-hidden />
                    {uploadingImage ? '…' : 'Upload'}
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => onDocImageUpload('stampImageUrl', e)} disabled={uploadingImage} />
                  </label>
                  {draft.stampImageUrl ? (
                    <button
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, stampImageUrl: '' }))}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
        </>
      )}
    </form>
  )
}
