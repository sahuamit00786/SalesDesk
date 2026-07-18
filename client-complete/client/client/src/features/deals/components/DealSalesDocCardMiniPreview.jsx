import { useLayoutEffect, useRef, useState } from 'react'
import { SalesDocumentPreview } from '@/features/sales-docs/components/SalesDocumentPreview'
import { useGetBillingProfileQuery } from '@/features/sales-docs/billingProfileApi'
import { useGetQuotationQuery } from '@/features/sales-docs/quotationsApi'
import { useGetInvoiceQuery } from '@/features/sales-docs/invoicesApi'
import { cn } from '@/utils/cn'

const A4_W = 794
const A4_H = 1123
/** Fixed strip height — quotation/invoice/PDF cards use the same slot; overflow clips to the top of the sheet. */
export const DEAL_CARD_PREVIEW_H_CLASS = 'h-32'

export function isPdfDoc(doc) {
  const name = String(doc?.name || '').toLowerCase()
  const url = String(doc?.filePath || doc?.fileUrl || '').toLowerCase()
  return name.endsWith('.pdf') || url.includes('.pdf')
}

function MiniSheetHost({ children, className }) {
  const hostRef = useRef(null)
  const [scale, setScale] = useState(0.1)

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
    <div className={cn('rounded-md border border-neutral-200/80 bg-gradient-to-b from-neutral-50 to-neutral-100/90 p-0.5', className)}>
      <div
        ref={hostRef}
        className={cn(
          'relative w-full overflow-hidden rounded bg-white shadow-sm ring-1 ring-neutral-900/[0.06]',
          DEAL_CARD_PREVIEW_H_CLASS,
        )}
        aria-hidden
      >
        <div
          className="pointer-events-none absolute left-0 top-0 will-change-transform"
          style={{
            width: A4_W,
            height: A4_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export function QuotationCardMini({ quotationId }) {
  const { data: qRes, isFetching } = useGetQuotationQuery(quotationId, { skip: !quotationId })
  const { data: billRes } = useGetBillingProfileQuery()

  const qPayload = qRes?.data
  const q = qPayload?.data ?? qPayload
  const billPayload = billRes?.data
  const billing = billPayload?.data ?? billPayload

  if (!quotationId) return null
  if (isFetching || !q || !billing) {
    return (
      <div
        className={cn(
          'w-full animate-pulse rounded-md border border-neutral-200/80 bg-neutral-100 ring-1 ring-neutral-200/60',
          DEAL_CARD_PREVIEW_H_CLASS,
        )}
      />
    )
  }

  return (
    <MiniSheetHost>
      <SalesDocumentPreview
        embedded
        variant="quotation"
        preset={q.layoutPreset}
        billing={billing}
        customer={q.customerSnapshot}
        headerNumber={q.quotationNumber}
        headerTitle="Quotation"
        issueDate={q.issueDate}
        secondaryDateLabel="Valid until"
        secondaryDate={q.expiryDate}
        lines={q.items || []}
        subtotal={q.subtotal}
        discountTotal={q.discountTotal}
        shipping={q.shipping}
        adjustment={q.adjustment}
        grandTotal={q.grandTotal}
        taxBreakdown={q.taxBreakdown}
        terms={q.termsSnapshot}
        notes={q.notes}
        watermark={q.status === 'draft' ? 'Draft' : null}
        currency={q.currency || 'USD'}
        theme={q.documentTheme || null}
      />
    </MiniSheetHost>
  )
}

export function InvoiceCardMini({ invoiceId }) {
  const { data: invRes, isFetching } = useGetInvoiceQuery(invoiceId, { skip: !invoiceId })
  const { data: billRes } = useGetBillingProfileQuery()

  const invPayload = invRes?.data
  const inv = invPayload?.data ?? invPayload
  const billPayload = billRes?.data
  const billing = billPayload?.data ?? billPayload

  if (!invoiceId) return null
  if (isFetching || !inv || !billing) {
    return (
      <div
        className={cn(
          'w-full animate-pulse rounded-md border border-neutral-200/80 bg-neutral-100 ring-1 ring-neutral-200/60',
          DEAL_CARD_PREVIEW_H_CLASS,
        )}
      />
    )
  }

  const pay = inv.paymentBlockSnapshot || {}
  const billingMerged = {
    ...billing,
    bankName: pay.bankName || billing?.bankName,
    bankAccountHolderName: pay.bankAccountHolderName || billing?.bankAccountHolderName,
    bankBranch: pay.bankBranch || billing?.bankBranch,
    micrCode: pay.micrCode || billing?.micrCode,
    bankAccountType: pay.bankAccountType || billing?.bankAccountType,
    bankAccountNumber: pay.bankAccountNumber || billing?.bankAccountNumber,
    bankIfsc: pay.bankIfsc || billing?.bankIfsc,
    bankSwift: pay.bankSwift || billing?.bankSwift,
    upiId: pay.upiId || billing?.upiId,
    paymentLinkUrl: pay.paymentLinkUrl || billing?.paymentLinkUrl,
    paymentInstructions: pay.paymentInstructions || billing?.paymentInstructions,
  }

  return (
    <MiniSheetHost>
      <SalesDocumentPreview
        embedded
        variant="invoice"
        preset={inv.layoutPreset}
        showBankDetails={inv.showBankDetails !== false}
        billing={billingMerged}
        customer={inv.customerSnapshot}
        headerNumber={inv.invoiceNumber}
        headerTitle="Invoice"
        issueDate={inv.issueDate}
        secondaryDateLabel="Due"
        secondaryDate={inv.dueDate}
        lines={inv.items || []}
        subtotal={inv.subtotal}
        discountTotal={inv.discountTotal}
        shipping={0}
        adjustment={inv.roundOff}
        grandTotal={inv.grandTotal}
        taxBreakdown={inv.taxFinancial}
        terms={inv.termsSnapshot}
        notes={inv.notes}
        watermark={inv.status === 'draft' ? 'Draft' : null}
        currency={inv.currency || 'USD'}
        theme={inv.documentTheme || null}
      />
    </MiniSheetHost>
  )
}

/** Tiny PDF first-page strip (best-effort; same-origin uploads work best). */
export function PdfAttachmentMini({ fileUrl, className }) {
  if (!fileUrl) {
    return (
      <div className={cn('w-full rounded-md bg-neutral-100 ring-1 ring-neutral-200/60', DEAL_CARD_PREVIEW_H_CLASS, className)} />
    )
  }
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-md border border-neutral-200/90 bg-neutral-50 ring-1 ring-neutral-900/[0.05]',
        DEAL_CARD_PREVIEW_H_CLASS,
        className,
      )}
    >
      {/\.pdf(\?|$)/i.test(String(fileUrl)) ? (
        <iframe title="" src={fileUrl} className="pointer-events-none block h-[220%] w-full max-w-none border-0" loading="lazy" />
      ) : (
        <div className="flex h-full items-center justify-center text-[10px] text-neutral-400">No preview</div>
      )}
    </div>
  )
}
