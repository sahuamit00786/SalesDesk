import { QUOTATION_PRESET_LABELS, INVOICE_PRESET_LABELS } from '@/features/sales-docs/presetLabels'
import {
  billToSectionClass,
  getPresetSurface,
  tableClasses,
  totalsSectionClass,
} from '@/features/sales-docs/presetVisuals'
import { hexWithAlpha } from '@/features/sales-docs/themeUtils'
import { cn } from '@/utils/cn'
import { DataGrid } from '@/components/shared/DataGrid'

function fmtMoney(n, currency = 'USD') {
  const v = Number(n ?? 0)
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(v)
  } catch {
    return `${currency} ${v.toFixed(2)}`
  }
}

function BillToBlock({ surface, customer }) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{surface.billToLabel}</p>
      <p className="mt-1 text-base font-semibold">{customer?.companyName || customer?.contactName || 'Customer'}</p>
      <p className="text-sm text-neutral-700">{customer?.contactName}</p>
      <p className="mt-1 text-xs text-neutral-600">{customer?.email}</p>
      <p className="text-xs text-neutral-600">{customer?.phone}</p>
      {customer?.billingAddress ? (
        <p className="mt-2 max-w-md text-xs leading-relaxed text-neutral-600">
          {[customer.billingAddress.street, customer.billingAddress.city, customer.billingAddress.state]
            .filter(Boolean)
            .join(', ')}
        </p>
      ) : null}
    </>
  )
}

export function SalesDocumentPreview({
  variant,
  preset,
  billing,
  customer,
  headerNumber,
  headerTitle,
  issueDate,
  secondaryDateLabel,
  secondaryDate,
  lines = [],
  subtotal,
  discountTotal,
  shipping,
  adjustment,
  grandTotal,
  taxBreakdown,
  terms,
  notes,
  watermark,
  currency = 'USD',
  theme = null,
  embedded = false,
  /** Optional body font (e.g. quotation template `fontFamily`). */
  bodyFont = null,
  /** When false, payment / bank block is hidden even if billing contains bank fields (invoice templates). */
  showBankDetails = true,
}) {
  const p = Math.min(Math.max(Number(preset) || 1, 1), 8)
  const presetLabel =
    variant === 'invoice' ? INVOICE_PRESET_LABELS[p - 1] : QUOTATION_PRESET_LABELS[p - 1]

  const accent = theme?.accentColor?.trim() || null
  const headerTone = theme?.headerTone === 'dark' ? 'dark' : 'light'

  const surface = getPresetSurface(variant, p, accent)
  const tc = tableClasses(surface.tableVariant)

  const shell = cn('sales-doc', surface.shell)

  let headBg = surface.headBg

  let headerStyle = {}
  if (accent) {
    headBg = cn(
      'text-neutral-900',
      headerTone === 'dark' ? 'text-white print:text-neutral-900' : '',
    )
    headerStyle =
      headerTone === 'dark'
        ? { backgroundColor: accent, color: '#fafafa' }
        : { backgroundColor: hexWithAlpha(accent, 0.12) || '#f5f5f5', color: '#171717' }
  }

  const accentBarStyle = accent ? { backgroundColor: accent } : undefined

  const mutedText =
    accent && headerTone === 'dark'
      ? 'text-white/80 print:text-neutral-600'
      : 'text-neutral-600 print:text-neutral-600'
  const labelMuted =
    accent && headerTone === 'dark' ? 'text-white/70 print:text-neutral-500' : 'text-neutral-500'

  const dateStrong = cn(
    'font-medium',
    accent && headerTone === 'dark' ? 'text-white print:text-neutral-800' : 'text-neutral-800',
  )

  const companyLines = [billing?.addressLine1, billing?.city, billing?.state, billing?.postalCode]
    .filter(Boolean)
    .join(', ')

  const logoBlock = billing?.logoUrl ? (
    <img src={billing.logoUrl} alt="" className="mb-3 h-10 w-auto object-contain" />
  ) : (
    <div
      className={cn(
        'mb-2 h-10 w-28 rounded print:bg-neutral-200',
        accent && headerTone === 'dark' ? 'bg-white/20 print:bg-neutral-200' : 'bg-neutral-200/80',
      )}
    />
  )

  const companyBlock = (
    <div className="min-w-0">
      {logoBlock}
      <p className="text-lg font-semibold leading-tight">{billing?.legalName || 'Your company'}</p>
      <p className={cn('mt-1 max-w-sm text-xs leading-relaxed', mutedText)}>{companyLines}</p>
      <p className={cn('mt-1 text-xs', mutedText)}>
        {billing?.taxIdLabel && billing?.taxIdValue ? `${billing.taxIdLabel}: ${billing.taxIdValue}` : null}
      </p>
    </div>
  )

  const docMetaBlock = (opts = {}) => {
    const { numberClass = 'mt-1 text-2xl font-bold tabular-nums', showPreset = true } = opts
    return (
      <div className="text-right">
        <p className={cn('text-xs font-semibold uppercase tracking-wider', labelMuted)}>{headerTitle}</p>
        <p className={numberClass}>{headerNumber}</p>
        <p className={cn('mt-2 text-xs', labelMuted)}>
          Issued <span className={dateStrong}>{issueDate}</span>
        </p>
        {secondaryDate ? (
          <p className={cn('text-xs', labelMuted)}>
            {secondaryDateLabel} <span className={dateStrong}>{secondaryDate}</span>
          </p>
        ) : null}
        {showPreset ? (
          <p className="mt-3 text-[10px] uppercase tracking-wide text-neutral-400 print:text-neutral-400">{presetLabel}</p>
        ) : null}
      </div>
    )
  }

  const layout = accent ? 'dual' : surface.headerLayout

  let documentHeader = null
  if (layout === 'strip') {
    documentHeader = (
      <>
        <div className={cn('h-2.5 w-full shrink-0 print:h-2', surface.stripAccent || 'bg-neutral-600')} aria-hidden />
        <header className={cn('flex flex-wrap items-start justify-between gap-4 px-8 pb-5 pt-6', headBg)} style={headerStyle}>
          {companyBlock}
          {docMetaBlock()}
        </header>
      </>
    )
  } else if (layout === 'skyBanner') {
    documentHeader = (
      <>
        <div className={cn('h-2 w-full shrink-0 print:h-1.5', surface.stripAccent || 'bg-[var(--brand-primary)]')} aria-hidden />
        <header className={cn('flex flex-wrap items-start justify-between gap-4 px-8 pb-6 pt-7', headBg)} style={headerStyle}>
          {companyBlock}
          {docMetaBlock()}
        </header>
      </>
    )
  } else if (layout === 'masthead') {
    documentHeader = (
      <header className={cn('px-8 pb-5 pt-7 text-center', headBg)} style={headerStyle}>
        <p className={cn('text-xs font-semibold uppercase tracking-[0.2em]', labelMuted)}>{headerTitle}</p>
        <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">{headerNumber}</p>
        <p className={cn('mt-2 text-xs', labelMuted)}>
          Issued <span className={dateStrong}>{issueDate}</span>
          {secondaryDate ? (
            <>
              {' · '}
              {secondaryDateLabel} <span className={dateStrong}>{secondaryDate}</span>
            </>
          ) : null}
        </p>
        <p className="mt-3 text-[10px] uppercase tracking-wide text-neutral-400 print:text-neutral-400">{presetLabel}</p>
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4 border-t border-neutral-200/70 pt-5 text-left print:border-neutral-200">
          {companyBlock}
        </div>
      </header>
    )
  } else if (layout === 'serifMasthead') {
    documentHeader = (
      <header className={cn('px-8 pb-5 pt-7 text-center font-serif', headBg)} style={headerStyle}>
        <p className={cn('text-xs font-semibold uppercase tracking-[0.2em]', labelMuted)}>{headerTitle}</p>
        <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">{headerNumber}</p>
        <p className={cn('mt-2 text-xs', labelMuted)}>
          Issued <span className={dateStrong}>{issueDate}</span>
          {secondaryDate ? (
            <>
              {' · '}
              {secondaryDateLabel} <span className={dateStrong}>{secondaryDate}</span>
            </>
          ) : null}
        </p>
        <p className="mt-3 text-[10px] uppercase tracking-wide text-neutral-400 print:text-neutral-400">{presetLabel}</p>
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4 border-t border-neutral-200/70 pt-5 text-left print:border-neutral-200">
          {companyBlock}
        </div>
      </header>
    )
  } else if (layout === 'sidebarStripe') {
    documentHeader = (
      <header className={cn('flex min-h-[140px]', headBg)} style={headerStyle}>
        <div className={cn('w-3 shrink-0 print:opacity-100', surface.sidebarStripeClass)} aria-hidden />
        <div className="flex flex-1 flex-wrap items-start justify-between gap-4 px-8 py-7">
          {companyBlock}
          {docMetaBlock()}
        </div>
      </header>
    )
  } else if (layout === 'heroDark') {
    documentHeader = (
      <header className={cn('flex flex-wrap items-start justify-between gap-6 px-8 pb-8 pt-8', headBg)} style={headerStyle}>
        <div className="min-w-0 max-w-md">
          {logoBlock}
          <p className="text-xl font-semibold leading-tight">{billing?.legalName || 'Your company'}</p>
          <p className={cn('mt-2 text-sm leading-relaxed', mutedText)}>{companyLines}</p>
        </div>
        <div className="text-right">
          <p className={cn('text-[11px] font-semibold uppercase tracking-[0.25em]', labelMuted)}>{headerTitle}</p>
          <p className="mt-2 text-4xl font-black tabular-nums tracking-tight">{headerNumber}</p>
          <p className={cn('mt-4 text-xs', labelMuted)}>
            Issued <span className={dateStrong}>{issueDate}</span>
          </p>
          {secondaryDate ? (
            <p className={cn('text-xs', labelMuted)}>
              {secondaryDateLabel} <span className={dateStrong}>{secondaryDate}</span>
            </p>
          ) : null}
          <p className="mt-4 text-[10px] uppercase tracking-wide text-white/50 print:text-neutral-400">{presetLabel}</p>
        </div>
      </header>
    )
  } else if (layout === 'minimalRule') {
    documentHeader = (
      <header className={cn('px-8 pb-4 pt-6', headBg)} style={headerStyle}>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-neutral-800 pb-3 print:border-neutral-800">
          <div className="min-w-0">
            <p className="text-base font-bold uppercase tracking-wide text-neutral-900">{billing?.legalName || 'Your company'}</p>
            <p className="mt-1 text-xs text-neutral-600">{companyLines}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{headerTitle}</p>
            <p className="text-xl font-bold tabular-nums text-neutral-900">{headerNumber}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap justify-end gap-x-6 gap-y-1 text-xs text-neutral-600">
          <span>
            Issued <span className="font-medium text-neutral-800">{issueDate}</span>
          </span>
          {secondaryDate ? (
            <span>
              {secondaryDateLabel} <span className="font-medium text-neutral-800">{secondaryDate}</span>
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-right text-[10px] uppercase tracking-wide text-neutral-400">{presetLabel}</p>
      </header>
    )
  } else if (layout === 'invoiceBanner') {
    documentHeader = (
      <header className="overflow-hidden">
        <div className={cn('px-8 py-6', headBg)} style={headerStyle}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-4xl font-black tracking-tight text-emerald-900 print:text-emerald-900">INVOICE</p>
              <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-emerald-800/90">{headerNumber}</p>
            </div>
            <div className="text-right text-sm text-neutral-700">
              <p>
                <span className="text-neutral-500">Issued </span>
                <span className="font-medium text-neutral-900">{issueDate}</span>
              </p>
              {secondaryDate ? (
                <p className="mt-1">
                  <span className="text-neutral-500">{secondaryDateLabel} </span>
                  <span className="font-medium text-neutral-900">{secondaryDate}</span>
                </p>
              ) : null}
              <p className="mt-2 text-[10px] uppercase tracking-wide text-neutral-400">{presetLabel}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-emerald-200/80 bg-white px-8 py-4">
          {companyBlock}
        </div>
      </header>
    )
  } else if (layout === 'invoiceFormal') {
    documentHeader = (
      <header className={cn('px-8 pb-5 pt-6', headBg)} style={headerStyle}>
        <div className="border-b-4 border-double border-brand-700 pb-4 print:border-brand-700">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {companyBlock}
            <div className="text-right">
              <p className="font-serif text-lg font-semibold text-blue-950">{headerTitle}</p>
              <p className="mt-1 font-serif text-2xl font-bold tabular-nums text-blue-950">{headerNumber}</p>
              <p className="mt-2 text-xs text-neutral-600">
                Issued <span className="font-medium text-neutral-900">{issueDate}</span>
              </p>
              {secondaryDate ? (
                <p className="text-xs text-neutral-600">
                  {secondaryDateLabel} <span className="font-medium text-neutral-900">{secondaryDate}</span>
                </p>
              ) : null}
              <p className="mt-2 text-[10px] uppercase tracking-wide text-neutral-400">{presetLabel}</p>
            </div>
          </div>
        </div>
      </header>
    )
  } else if (layout === 'invoiceReceipt') {
    documentHeader = (
      <header className={cn('border-b-2 border-dashed border-neutral-300 px-6 py-4', headBg)} style={headerStyle}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">{billing?.legalName || 'Your company'}</p>
            <p className="mt-1 text-[11px] leading-snug text-neutral-600">{companyLines}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{headerTitle}</p>
            <p className="text-lg font-bold tabular-nums">{headerNumber}</p>
            <p className="text-[11px] text-neutral-600">
              {issueDate}
              {secondaryDate ? ` · ${secondaryDate}` : ''}
            </p>
          </div>
        </div>
        <p className="mt-2 text-[9px] uppercase tracking-wide text-neutral-400">{presetLabel}</p>
      </header>
    )
  } else {
    documentHeader = (
      <header className={cn('flex flex-wrap items-start justify-between gap-4 px-8 pb-6 pt-8', headBg)} style={headerStyle}>
        {companyBlock}
        {docMetaBlock()}
      </header>
    )
  }

  const totalsWrap = cn('flex flex-wrap justify-end gap-8', totalsSectionClass(surface.totalsVariant))

  const billToWrap = cn(billToSectionClass(surface.billToVariant))

  const shellFont = bodyFont?.trim() ? { fontFamily: bodyFont.trim() } : undefined

  /** Full A4 logical height (96dpi) so short docs fill the sheet; spacer pushes totals/footer toward the bottom. */
  const pageMinH = 'min-h-[1123px]'

  const inner = (
    <div className={cn(shell, pageMinH, 'flex flex-col')} style={shellFont}>
      {accent ? <div className="h-1 w-full shrink-0 print:h-0.5" style={accentBarStyle} aria-hidden /> : null}

      {watermark && watermark !== 'none' ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06] print:opacity-[0.08]">
          <span className="rotate-[-18deg] text-6xl font-black uppercase tracking-widest">{watermark}</span>
        </div>
      ) : null}

      <div className="shrink-0">{documentHeader}</div>

      <div className={cn(billToWrap, 'shrink-0')}>
        <BillToBlock surface={surface} customer={customer} />
      </div>

      <div className="shrink-0 px-8 pb-6">
        <div className={cn(tc.wrap)}>
          <DataGrid
            gridColumns
            columns={[
              {
                field: 'name',
                headerName: 'Item',
                flex: 1,
                minWidth: 140,
                renderCell: ({ row }) => (
                  <div>
                    <span className="font-medium">{row.name}</span>
                    {row.description ? (
                      <p className="mt-0.5 text-xs text-neutral-500">{row.description}</p>
                    ) : null}
                  </div>
                ),
              },
              {
                field: 'quantity',
                headerName: 'Qty',
                width: 70,
                align: 'right',
                headerAlign: 'right',
              },
              {
                field: 'unitPrice',
                headerName: 'Price',
                width: 100,
                align: 'right',
                headerAlign: 'right',
                valueGetter: (_v, row) => fmtMoney(row.unitPrice, currency),
              },
              {
                field: 'lineTotal',
                headerName: 'Total',
                width: 100,
                align: 'right',
                headerAlign: 'right',
                renderCell: ({ row }) => (
                  <span className="font-medium tabular-nums">{fmtMoney(row.lineTotal, currency)}</span>
                ),
              },
            ]}
            data={lines.map((row, i) => ({ ...row, id: i }))}
            density="compact"
            searchable={false}
            showColumnToggle={false}
            showExportCsv={false}
            hideFooter
            className={cn('border-0 shadow-none text-sm', tc.wrap)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-8 shrink-0" aria-hidden />

      <div className={cn(totalsWrap, 'shrink-0')}>
        <dl className="w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Subtotal</dt>
            <dd className="tabular-nums font-medium">{fmtMoney(subtotal, currency)}</dd>
          </div>
          {Number(discountTotal) > 0 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Discount</dt>
              <dd className="tabular-nums">−{fmtMoney(discountTotal, currency)}</dd>
            </div>
          ) : null}
          {Number(shipping) > 0 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Shipping</dt>
              <dd className="tabular-nums">{fmtMoney(shipping, currency)}</dd>
            </div>
          ) : null}
          {Number(adjustment) !== 0 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Adjustment</dt>
              <dd className="tabular-nums">{fmtMoney(adjustment, currency)}</dd>
            </div>
          ) : null}
          {taxBreakdown && typeof taxBreakdown === 'object' ? (
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Tax</dt>
              <dd className="tabular-nums">{fmtMoney(taxBreakdown.tax ?? taxBreakdown.total, currency)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 border-t border-neutral-200 pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{fmtMoney(grandTotal, currency)}</dd>
          </div>
        </dl>
      </div>

      {showBankDetails !== false &&
      (billing?.bankName ||
        billing?.bankAccountNumber ||
        billing?.bankIfsc ||
        billing?.bankAccountHolderName ||
        billing?.bankBranch ||
        billing?.micrCode ||
        billing?.bankAccountType ||
        billing?.upiId ||
        billing?.paymentLinkUrl ||
        billing?.bankSwift ||
        billing?.paymentInstructions) ? (
        <div className="shrink-0 border-t border-neutral-100 px-8 py-5 text-xs text-neutral-600">
          <p className="font-semibold text-neutral-800">Payment details</p>
          {(billing.bankName ||
            billing.bankBranch ||
            billing.bankAccountHolderName ||
            billing.bankAccountType ||
            billing.bankAccountNumber ||
            billing.bankIfsc ||
            billing.micrCode) && (
            <div className="mt-2 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Bank transfer (India)</p>
              {billing.bankName ? <p className="font-medium text-neutral-800">{billing.bankName}</p> : null}
              {billing.bankBranch ? <p>Branch: {billing.bankBranch}</p> : null}
              {billing.bankAccountHolderName ? <p>Account name: {billing.bankAccountHolderName}</p> : null}
              {billing.bankAccountType ? <p>Account type: {billing.bankAccountType}</p> : null}
              {billing.bankAccountNumber ? <p className="tabular-nums">A/c no.: {billing.bankAccountNumber}</p> : null}
              {billing.bankIfsc ? <p className="font-mono tabular-nums">IFSC: {billing.bankIfsc}</p> : null}
              {billing.micrCode ? <p className="tabular-nums">MICR: {billing.micrCode}</p> : null}
            </div>
          )}
          {billing.upiId || billing.paymentLinkUrl ? (
            <div className="mt-3 space-y-1 border-t border-neutral-100 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">UPI & online</p>
              {billing.upiId ? <p className="font-mono">UPI: {billing.upiId}</p> : null}
              {billing.paymentLinkUrl ? (
                <p>
                  Pay link:{' '}
                  <span className="break-all text-neutral-800">{billing.paymentLinkUrl}</span>
                </p>
              ) : null}
            </div>
          ) : null}
          {billing.bankSwift ? (
            <p className="mt-3 border-t border-neutral-100 pt-3 font-mono text-[11px]">SWIFT / BIC: {billing.bankSwift}</p>
          ) : null}
          {billing.paymentInstructions ? <p className="mt-3 whitespace-pre-wrap">{billing.paymentInstructions}</p> : null}
        </div>
      ) : null}

      {terms ? (
        <div className="shrink-0 border-t border-neutral-100 px-8 py-5 text-xs leading-relaxed text-neutral-600">
          <p className="font-semibold text-neutral-800">Terms</p>
          <div className="mt-1 whitespace-pre-wrap">{terms}</div>
        </div>
      ) : null}

      {notes ? (
        <div className="shrink-0 border-t border-neutral-100 px-8 py-5 text-xs leading-relaxed text-neutral-600">
          <p className="font-semibold text-neutral-800">Notes</p>
          <p className="mt-1 whitespace-pre-wrap">{notes}</p>
        </div>
      ) : null}
    </div>
  )

  if (embedded) return inner

  return (
    <div className="sales-doc-a4-sheet mx-auto box-border w-full max-w-[210mm] bg-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] ring-1 ring-neutral-200/80 print:m-0 print:max-w-none print:shadow-none print:ring-0">
      {inner}
    </div>
  )
}
