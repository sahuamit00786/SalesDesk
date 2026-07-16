import { useParams } from 'react-router-dom'
import { useGetBillingProfileQuery } from '@/features/sales-docs/billingProfileApi'
import { useGetQuotationQuery } from '@/features/sales-docs/quotationsApi'
import { SalesDocumentPreview } from '@/features/sales-docs/components/SalesDocumentPreview'

export default function QuotationPrintPage() {
  const { id } = useParams()
  const { data: qRes, isLoading } = useGetQuotationQuery(id)
  const { data: billRes } = useGetBillingProfileQuery()

  const qPayload = qRes?.data
  const q = qPayload?.data ?? qPayload
  const billPayload = billRes?.data
  const billing = billPayload?.data ?? billPayload

  if (isLoading || !q) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-neutral-100 text-sm text-neutral-500">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-8 print:bg-white print:p-0">
      <div className="no-print mb-4 flex w-full justify-end gap-2">
        <button
          type="button"
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-neutral-50"
          onClick={() => window.print()}
        >
          Print / Save as PDF
        </button>
      </div>
      <SalesDocumentPreview
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
    </div>
  )
}
