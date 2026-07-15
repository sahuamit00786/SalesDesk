import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Building2,
  Globe2,
  ImagePlus,
  Landmark,
  Loader2,
  MapPin,
  PenLine,
  ReceiptText,
  Save,
  Trash2,
  Wallet,
} from '@/components/ui/icons'
import { useGetBillingProfileQuery, usePatchBillingProfileMutation } from '@/features/sales-docs/billingProfileApi'
import { useUploadDocumentMutation } from '@/features/documents/documentsApi'
import { useAppSelector } from '@/app/hooks'
import { usePatchMyCompanyMutation } from '@/features/company/companyApi'
import { DEAL_CURRENCY_OPTIONS } from '@/features/deals/dealCurrencies'
import { PhoneField } from '@/components/ui/PhoneField'
import { Button } from '@/components/ui/Button'
import { controlClassName } from '@/components/ui/fieldTokens'
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
    <div className="mb-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{children}</span>
    </div>
  )
}

function inputClass(extra = '') {
  return cn(controlClassName, extra)
}

function SectionCard({ icon: Icon, title, description, children, className }) {
  return (
    <section className={cn('rounded-2xl border border-surface-border/70 bg-gradient-to-br from-white/80 to-white p-5 shadow-sm backdrop-blur-sm transition-all hover:border-surface-border', className)}>
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50 to-brand-100/50 text-brand-700">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {description ? <p className="mt-1 text-xs leading-relaxed text-ink-muted">{description}</p> : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

/** Preview box + upload/clear controls, shared by logo / signature / stamp. */
function ImageField({ label, hint, value, onValueChange, onUpload, uploading, previewClass = 'h-20 w-20' }) {
  return (
    <div>
      {label ? <FieldLabel hint={hint}>{label}</FieldLabel> : null}
      <div className="flex flex-col items-start gap-3">
        <div
          className={cn(
            'flex items-center justify-center overflow-hidden rounded-xl border bg-surface-muted/30 transition-colors',
            value ? 'border-surface-border' : 'border-dashed border-surface-border/60 bg-surface-muted/10',
            previewClass,
          )}
        >
          {value ? (
            <img src={publicAssetUrl(value)} alt="" className="h-full w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5">
              <ImagePlus className="h-5 w-5 text-ink-faint" aria-hidden />
              <span className="text-[11px] text-ink-faint">No image</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-surface-border bg-white px-3.5 text-xs font-medium text-ink transition hover:border-brand-300 hover:bg-brand-50">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
            {uploading ? 'Uploading…' : 'Upload'}
            <input type="file" accept="image/*" className="sr-only" onChange={onUpload} disabled={uploading} />
          </label>
          {value ? (
            <button
              type="button"
              onClick={() => onValueChange('')}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 text-xs font-medium text-danger transition hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function WorkspaceCompanyTab() {
  const { data, isLoading, isError, error, refetch } = useGetBillingProfileQuery()
  const [patchProfile, { isLoading: savingProfile }] = usePatchBillingProfileMutation()
  const [patchMyCompany, { isLoading: savingCurrency }] = usePatchMyCompanyMutation()
  const [uploadDocument, { isLoading: uploadingImage }] = useUploadDocumentMutation()
  const [companyTab, setCompanyTab] = useState('profile')

  const user = useAppSelector((s) => s.auth.user)
  const savedCurrency = String(user?.company?.baseCurrency || 'USD').toUpperCase()
  const [currency, setCurrency] = useState(savedCurrency)

  useEffect(() => {
    setCurrency(savedCurrency)
  }, [savedCurrency])

  const profile = data?.data
  const [draft, setDraft] = useState(emptyDraft)
  const [baselineJson, setBaselineJson] = useState(null)

  useEffect(() => {
    if (!profile) return
    const d = profileToDraft(profile)
    setDraft(d)
    setBaselineJson(JSON.stringify(draftToPatchBody(d)))
  }, [profile])

  const currencyDirty = currency !== savedCurrency
  const dirty = useMemo(() => {
    if (currencyDirty) return true
    if (baselineJson === null) return false
    return JSON.stringify(draftToPatchBody(draft)) !== baselineJson
  }, [draft, baselineJson, currencyDirty])

  const saving = savingProfile || savingCurrency

  async function handleSave(e) {
    e.preventDefault()
    try {
      await patchProfile(draftToPatchBody(draft)).unwrap()
      if (currencyDirty) {
        await patchMyCompany({ baseCurrency: currency }).unwrap()
      }
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
      <div className="flex items-center gap-2 rounded-2xl border border-surface-border bg-white px-4 py-6 text-sm text-ink-muted shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading company profile…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-surface-border bg-white px-4 py-6 text-sm text-ink-muted shadow-sm">
        {apiErrorMessage(error)}
        <button type="button" className="ml-2 font-medium text-brand-600 hover:underline" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="w-full space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-gradient-to-br from-white to-white/50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brand-100 bg-brand-50 text-brand-700 shadow-sm">
            {draft.logoUrl ? (
              <img src={publicAssetUrl(draft.logoUrl)} alt="" className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-5 w-5" aria-hidden />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-ink">
              {draft.legalName.trim() || 'Company information'}
            </h2>
            <p className="mt-1 text-xs leading-snug text-ink-muted">
              Shown on quotations and invoices. Numbers auto-format as{' '}
              <span className="font-mono text-ink">QT/DDMMYYYY/n</span> ·{' '}
              <span className="font-mono text-ink">INV/DDMMYYYY/n</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:justify-end">
          {dirty ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
              Unsaved changes
            </span>
          ) : null}
          <Button type="submit" disabled={saving || !dirty} className="whitespace-nowrap">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-2 rounded-2xl border border-surface-border/50 bg-gradient-to-br from-white/60 to-white p-2 shadow-sm"
        role="tablist"
        aria-label="Company form sections"
      >
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
                'inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3.5 text-xs font-medium transition-all sm:flex-none sm:px-4',
                active
                  ? 'bg-[var(--brand-primary)] text-white shadow-md'
                  : 'text-ink-muted hover:bg-brand-50 hover:text-brand-700 hover:shadow-sm',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{t.label}</span>
            </button>
          )
        })}
      </div>

      {companyTab === 'profile' ? (
        <div className="space-y-4">
          <div className="space-y-4">
            <SectionCard icon={Building2} title="Identity & contact" description="Legal identity and how customers reach you.">
              <div className="grid gap-3.5">
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
                <div className="grid gap-3.5 sm:grid-cols-2">
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
                </div>
                <div className="grid gap-3.5 sm:grid-cols-2">
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
                  <div>
                    <FieldLabel hint="Default for new deals, leads, and reports.">Base currency</FieldLabel>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass()}>
                      {DEAL_CURRENCY_OPTIONS.some((o) => o.value === currency) ? null : (
                        <option value={currency}>{currency}</option>
                      )}
                      {DEAL_CURRENCY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={MapPin} title="Registered address" description="Appears in the header of quotations and invoices.">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel>Address line 1</FieldLabel>
                  <input
                    type="text"
                    value={draft.addressLine1}
                    onChange={(e) => setDraft((d) => ({ ...d, addressLine1: e.target.value }))}
                    className={inputClass()}
                    placeholder="Street address, building, floor"
                    maxLength={255}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Address line 2</FieldLabel>
                  <input
                    type="text"
                    value={draft.addressLine2}
                    onChange={(e) => setDraft((d) => ({ ...d, addressLine2: e.target.value }))}
                    className={inputClass()}
                    placeholder="Area, landmark (optional)"
                    maxLength={255}
                  />
                </div>
                <div>
                  <FieldLabel>City</FieldLabel>
                  <input
                    type="text"
                    value={draft.city}
                    onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                    className={inputClass()}
                    placeholder="e.g. Bengaluru"
                    maxLength={120}
                  />
                </div>
                <div>
                  <FieldLabel>State / province</FieldLabel>
                  <input
                    type="text"
                    value={draft.state}
                    onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}
                    className={inputClass()}
                    placeholder="e.g. Karnataka"
                    maxLength={120}
                  />
                </div>
                <div>
                  <FieldLabel>Postal code</FieldLabel>
                  <input
                    type="text"
                    value={draft.postalCode}
                    onChange={(e) => setDraft((d) => ({ ...d, postalCode: e.target.value }))}
                    className={inputClass()}
                    placeholder="e.g. 560001"
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
            </SectionCard>
          </div>

          <div className="space-y-4">
            <SectionCard
              icon={ImagePlus}
              title="Company logo"
              description="Upload stores the file in your workspace library, or paste an image URL."
            >
              <ImageField
                value={draft.logoUrl}
                onValueChange={(v) => setDraft((d) => ({ ...d, logoUrl: v }))}
                onUpload={(e) => onDocImageUpload('logoUrl', e)}
                uploading={uploadingImage}
                previewClass="h-24 w-24"
              />
            </SectionCard>

            <SectionCard icon={ReceiptText} title="Tax & registration" description="Printed next to your company name on documents.">
              <div className="grid gap-3.5 sm:grid-cols-2">
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
                      className={cn(
                        inputClass(),
                        draft.taxIdLabel === 'GSTIN' || draft.taxIdLabel === 'PAN' ? 'font-mono uppercase' : '',
                      )}
                      placeholder={
                        draft.taxIdLabel === 'GSTIN' ? '22AAAAA0000A1Z5' : draft.taxIdLabel === 'PAN' ? 'AABCU9604R' : 'Number or ID'
                      }
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
            </SectionCard>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <SectionCard
            icon={Landmark}
            title="Bank account"
            description="These details appear on invoices and quotations for this workspace."
          >
            <div className="mb-4 rounded-xl border border-brand-100 bg-brand-50/60 px-3.5 py-2.5 text-xs text-ink">
              <p className="font-semibold text-brand-800">India — NEFT, RTGS &amp; IMPS</p>
              <p className="mt-1 leading-relaxed text-ink-muted">
                Add IFSC and account details exactly as on your cheque book or bank statement. MICR is optional (9 digits,
                printed on cheques).
              </p>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
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
                <FieldLabel hint="Beneficiary name as per bank records (may differ from legal name).">
                  Account holder name
                </FieldLabel>
                <input
                  type="text"
                  value={draft.bankAccountHolderName}
                  onChange={(e) => setDraft((d) => ({ ...d, bankAccountHolderName: e.target.value }))}
                  className={inputClass()}
                  placeholder="e.g. Upgrow Ventures Pvt Ltd"
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
                  placeholder="e.g. 000123456789"
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
            </div>
          </SectionCard>

          <div className="space-y-4">
            <SectionCard
              icon={Wallet}
              title="UPI & payment links"
              description="Shown on invoices when you add a UPI ID or a payment / collect link."
            >
              <div className="grid gap-3.5 sm:grid-cols-2">
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
            </SectionCard>

            <SectionCard icon={Globe2} title="International wire" description="Optional — for customers paying from abroad.">
              <div className="grid gap-3.5">
                <div>
                  <FieldLabel>SWIFT / BIC</FieldLabel>
                  <input
                    type="text"
                    value={draft.bankSwift}
                    onChange={(e) => setDraft((d) => ({ ...d, bankSwift: e.target.value.toUpperCase().slice(0, 32) }))}
                    className={inputClass('font-mono uppercase')}
                    placeholder="e.g. SBININBB123"
                    maxLength={32}
                  />
                </div>
                <div>
                  <FieldLabel hint="Any extra instructions (e.g. FIRC, NOSTRO, or NEFT narration).">
                    Other payment instructions
                  </FieldLabel>
                  <textarea
                    value={draft.paymentInstructions}
                    onChange={(e) => setDraft((d) => ({ ...d, paymentInstructions: e.target.value }))}
                    rows={3}
                    className={inputClass('h-auto resize-y py-2.5')}
                    placeholder="e.g. Include the invoice number in the transfer note. FIRC available on request."
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              icon={PenLine}
              title="Signature & stamp"
              description="Optional images for PDFs — upload or paste a URL (stored in your workspace files)."
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <ImageField
                  label="Signature"
                  value={draft.signatureImageUrl}
                  onValueChange={(v) => setDraft((d) => ({ ...d, signatureImageUrl: v }))}
                  onUpload={(e) => onDocImageUpload('signatureImageUrl', e)}
                  uploading={uploadingImage}
                  previewClass="h-20 w-32"
                />
                <ImageField
                  label="Company stamp"
                  value={draft.stampImageUrl}
                  onValueChange={(v) => setDraft((d) => ({ ...d, stampImageUrl: v }))}
                  onUpload={(e) => onDocImageUpload('stampImageUrl', e)}
                  uploading={uploadingImage}
                  previewClass="h-20 w-20"
                />
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </form>
  )
}
