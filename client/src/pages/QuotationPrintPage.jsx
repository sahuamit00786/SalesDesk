import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useGetBillingProfileQuery } from '@/features/sales-docs/billingProfileApi'
import { useGetQuotationQuery, useLazyDownloadQuotationPdfQuery } from '@/features/sales-docs/quotationsApi'
import { SalesDocumentPreview } from '@/features/sales-docs/components/SalesDocumentPreview'

export default function QuotationPrintPage() {
  const { id } = useParams()
  const { data: qRes, isLoading } = useGetQuotationQuery(id)
  const { data: billRes, isLoading: billLoading } = useGetBillingProfileQuery()
  const [downloadPdf, { isFetching: downloading }] = useLazyDownloadQuotationPdfQuery()

  const qPayload = qRes?.data
  const q = qPayload?.data ?? qPayload
  const billPayload = billRes?.data
  const billing = billPayload?.data ?? billPayload

  async function handleDownloadPdf() {
    try {
      const { blob, filename } = await downloadPdf(id).unwrap()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not generate PDF')
    }
  }

  if (isLoading || billLoading || !q) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-neutral-100 text-sm text-neutral-500">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-8 print:bg-white print:p-0" data-pdf-ready="true">
      <div className="no-print mb-4 flex w-full justify-end gap-2">
        <button
          type="button"
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-neutral-50"
          onClick={() => window.print()}
        >
          Print
        </button>
        <button
          type="button"
          disabled={downloading}
          className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-primary-dark)] disabled:opacity-50"
          onClick={handleDownloadPdf}
        >
          {downloading ? 'Generating…' : 'Download PDF'}
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
