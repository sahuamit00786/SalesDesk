import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { SalesDocumentPreview } from '@/features/sales-docs/components/SalesDocumentPreview'

/** Logical A4 at 96dpi — matches full-size preview sheet */
const A4_W = 794
const A4_H = 1123
const PREVIEW_VISIBLE_FRACTION = 0.52

const SAMPLE_BILLING = {
  legalName: 'Acme Inc.',
  addressLine1: '100 Market St',
  city: 'San Francisco',
  state: 'CA',
  postalCode: '94105',
}

const SAMPLE_CUSTOMER = {
  companyName: 'Client Co.',
  contactName: 'Jane Doe',
  email: 'jane@client.com',
  billingAddress: { street: '1 Main Rd', city: 'Austin', state: 'TX' },
}

const SAMPLE_LINES = [
  { name: 'Professional services', quantity: 1, unitPrice: 1200, lineTotal: 1200 },
  { name: 'Implementation', quantity: 2, unitPrice: 450, lineTotal: 900 },
]

const SAMPLE_BANK_LINES = {
  bankName: 'Example Bank Ltd.',
  bankBranch: 'Main branch',
  bankAccountHolderName: 'Acme Inc.',
  bankAccountType: 'Current',
  bankAccountNumber: '12345678901234',
  bankIfsc: 'HDFC0001234',
  micrCode: '400240123',
  upiId: 'payments@acme.example',
}

/**
 * Cropped A4 thumbnail for template cards (top half), with template accent / font.
 * @param {{ accentColor?: string, headerTone?: 'light' | 'dark' } | null | undefined} theme
 */
export function TemplateMiniPreview({
  variant,
  layoutPreset,
  showBankDetails = true,
  theme = null,
  bodyFont = null,
}) {
  const p = Math.min(Math.max(Number(layoutPreset) || 1, 1), 8)
  const title = variant === 'invoice' ? 'Invoice' : 'Quotation'
  const secLabel = variant === 'invoice' ? 'Due date' : 'Valid until'
  const secDate = variant === 'invoice' ? '2026-01-15' : '2026-02-01'

  const hostRef = useRef(null)
  const [scale, setScale] = useState(0.12)

  const billing = useMemo(() => {
    if (variant !== 'invoice') return SAMPLE_BILLING
    if (showBankDetails === false) return SAMPLE_BILLING
    return { ...SAMPLE_BILLING, ...SAMPLE_BANK_LINES }
  }, [variant, showBankDetails])

  useLayoutEffect(() => {
    const el = hostRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      if (w > 0) setScale(w / A4_W)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="rounded-lg border border-neutral-200/90 bg-gradient-to-b from-neutral-100 to-neutral-200/80 p-1.5 shadow-inner">
      <div
        ref={hostRef}
        className="pointer-events-none relative w-full overflow-hidden rounded-md bg-white shadow-[0_10px_28px_-10px_rgba(0,0,0,0.22)] ring-1 ring-neutral-900/5"
        style={{ aspectRatio: `${A4_W} / ${Math.round(A4_H * PREVIEW_VISIBLE_FRACTION)}` }}
        aria-hidden
      >
        <div
          className="pointer-events-none absolute left-0 top-0"
          style={{
            width: A4_W,
            height: A4_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <SalesDocumentPreview
            embedded
            variant={variant}
            preset={p}
            theme={theme || undefined}
            bodyFont={bodyFont || undefined}
            showBankDetails={variant === 'invoice' ? showBankDetails !== false : true}
            billing={billing}
            customer={SAMPLE_CUSTOMER}
            headerNumber={`${variant === 'invoice' ? 'INV' : 'QT'}-1001`}
            headerTitle={title}
            issueDate="2026-01-01"
            secondaryDateLabel={secLabel}
            secondaryDate={secDate}
            lines={SAMPLE_LINES}
            subtotal={2100}
            discountTotal={0}
            shipping={0}
            adjustment={0}
            grandTotal={2100}
            taxBreakdown={null}
            terms={null}
            notes={null}
            watermark={null}
            currency="USD"
          />
        </div>
      </div>
    </div>
  )
}
