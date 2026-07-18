import { useParams } from 'react-router-dom'
import { useGetBillingProfileQuery } from '@/features/sales-docs/billingProfileApi'
import { useGetInvoiceQuery } from '@/features/sales-docs/invoicesApi'
import { SalesDocumentPreview } from '@/features/sales-docs/components/SalesDocumentPreview'

export default function InvoicePrintPage() {
  const { id } = useParams()
  const { data: invRes, isLoading } = useGetInvoiceQuery(id)
  const { data: billRes } = useGetBillingProfileQuery()

  const invPayload = invRes?.data
  const inv = invPayload?.data ?? invPayload
  const billPayload = billRes?.data
  const billing = billPayload?.data ?? billPayload

  if (isLoading || !inv) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-neutral-100 text-sm text-neutral-500">
        Loading…
      </div>
    )
  }

  const pay = inv.paymentBlockSnapshot || {}

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
        variant="invoice"
        preset={inv.layoutPreset}
        showBankDetails={inv.showBankDetails !== false}
        billing={{
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
        }}
        customer={inv.customerSnapshot}
        headerNumber={inv.invoiceNumber}
        headerTitle="Invoice"
        issueDate={inv.issueDate}
        secondaryDateLabel="Due"
        secondaryDate={inv.dueDate}
        lines={inv.items || []}
        subtotal={inv.subtotal}
        discountTotal={inv.discountTotal}
        shipping={inv.shipping || 0}
        adjustment={inv.adjustment || 0}
        grandTotal={inv.grandTotal}
        taxBreakdown={inv.taxFinancial}
        terms={inv.termsSnapshot}
        notes={inv.notes}
        watermark={inv.status === 'draft' ? 'Draft' : null}
        currency={inv.currency || 'USD'}
        theme={inv.documentTheme || null}
        payments={inv.payments || []}
        invoiceStatus={inv.status}
      />
    </div>
  )
}
