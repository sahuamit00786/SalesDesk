import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ExternalLink, FileText, Loader2, Plus, Printer, Receipt, Upload, X } from 'lucide-react'
import { useGetQuotationsQuery, useGetQuotationQuery } from '@/features/sales-docs/quotationsApi'
import { useGetInvoiceQuery, useGetInvoicesQuery } from '@/features/sales-docs/invoicesApi'
import { useGetBillingProfileQuery } from '@/features/sales-docs/billingProfileApi'
import { SalesDocumentPreview } from '@/features/sales-docs/components/SalesDocumentPreview'
import { ScaledA4PreviewViewport } from '@/features/sales-docs/components/ScaledA4PreviewViewport'
import { cn } from '@/utils/cn'
import {
  DEAL_CARD_PREVIEW_H_CLASS,
  InvoiceCardMini,
  isPdfDoc,
  PdfAttachmentMini,
  QuotationCardMini,
} from '@/features/deals/components/DealSalesDocCardMiniPreview'

function fmtMoney(n, c = 'USD') {
  const v = Number(n ?? 0)
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(v)
  } catch {
    return `${c} ${v.toFixed(2)}`
  }
}

function bytesLabel(bytes) {
  const n = Number(bytes || 0)
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatDocDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

function statusPillClass(status) {
  const s = String(status || '').toLowerCase()
  if (/(sent|issued)/.test(s)) return 'bg-sky-100 text-sky-800'
  if (/(accept|won)/.test(s)) return 'bg-emerald-100 text-emerald-800'
  if (/(draft)/.test(s)) return 'bg-neutral-100 text-neutral-700'
  if (/(reject|lost|expir)/.test(s)) return 'bg-rose-100 text-rose-800'
  return 'bg-amber-100 text-amber-900'
}

/** Centered preview: quotation, invoice, or uploaded file (PDF / open). */
function DealSalesDocPreviewModal({ detail, onClose }) {
  const modalScrollRef = useRef(null)
  const quotationId = detail.kind === 'quotation' ? detail.id : null
  const invoiceId = detail.kind === 'invoice' ? detail.id : null
  const fileDoc = detail.kind === 'file' ? detail.doc : null
  const fileUrl = fileDoc ? fileDoc.filePath || fileDoc.fileUrl || null : null
  const showPdf = fileDoc && fileUrl && isPdfDoc(fileDoc)

  const { data: qRes, isFetching: qLoading } = useGetQuotationQuery(quotationId, { skip: !quotationId })
  const { data: invRes, isFetching: invLoading } = useGetInvoiceQuery(invoiceId, { skip: !invoiceId })
  const { data: billRes, isFetching: billFetching } = useGetBillingProfileQuery(undefined, {
    skip: !quotationId && !invoiceId,
  })

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const qPayload = qRes?.data
  const q = qPayload?.data ?? qPayload
  const invPayload = invRes?.data
  const inv = invPayload?.data ?? invPayload
  const billPayload = billRes?.data
  const billing = billPayload?.data ?? billPayload

  const invPay = inv?.paymentBlockSnapshot || {}
  const billingForInvoice =
    billing && inv
      ? {
          ...billing,
          bankName: invPay.bankName || billing?.bankName,
          bankAccountHolderName: invPay.bankAccountHolderName || billing?.bankAccountHolderName,
          bankBranch: invPay.bankBranch || billing?.bankBranch,
          micrCode: invPay.micrCode || billing?.micrCode,
          bankAccountType: invPay.bankAccountType || billing?.bankAccountType,
          bankAccountNumber: invPay.bankAccountNumber || billing?.bankAccountNumber,
          bankIfsc: invPay.bankIfsc || billing?.bankIfsc,
          bankSwift: invPay.bankSwift || billing?.bankSwift,
          upiId: invPay.upiId || billing?.upiId,
          paymentLinkUrl: invPay.paymentLinkUrl || billing?.paymentLinkUrl,
          paymentInstructions: invPay.paymentInstructions || billing?.paymentInstructions,
        }
      : null

  useEffect(() => {
    const el = modalScrollRef.current
    if (!el) return
    el.scrollTop = 0
    el.scrollLeft = 0
  }, [detail.kind, quotationId, invoiceId, detail.kind === 'file' ? fileDoc?.id : null, qLoading, invLoading, billFetching])

  if (typeof document === 'undefined') return null

  const title =
    detail.kind === 'quotation'
      ? q?.quotationNumber || 'Quotation'
      : detail.kind === 'invoice'
        ? inv?.invoiceNumber || 'Invoice'
        : String(fileDoc?.name || 'File').trim() || 'Attachment'

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="deal-sales-doc-modal-title">
      <button type="button" className="absolute inset-0 bg-neutral-950/45 backdrop-blur-[2px]" onClick={onClose} aria-label="Close preview" />
      <div className="relative flex max-h-[min(94vh,960px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p id="deal-sales-doc-modal-title" className="truncate text-sm font-semibold text-neutral-900">
              {title}
            </p>
            {detail.kind === 'quotation' && q ? (
              <p className="mt-0.5 text-xs text-neutral-500">
                <span className={cn('mr-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase', statusPillClass(q.status))}>
                  {q.status}
                </span>
                {fmtMoney(q.grandTotal, q.currency)}
                {q.issueDate ? ` · ${formatDocDate(q.issueDate)}` : ''}
              </p>
            ) : detail.kind === 'invoice' && inv ? (
              <p className="mt-0.5 text-xs text-neutral-500">
                <span className={cn('mr-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase', statusPillClass(inv.status))}>
                  {inv.status}
                </span>
                {fmtMoney(inv.grandTotal, inv.currency)}
                {inv.issueDate ? ` · ${formatDocDate(inv.issueDate)}` : ''}
              </p>
            ) : detail.kind === 'file' ? (
              <p className="mt-0.5 text-xs text-neutral-500">
                {fileDoc?.fileType || 'File'}
                {bytesLabel(fileDoc?.fileSize) ? ` · ${bytesLabel(fileDoc.fileSize)}` : ''}
                {fileDoc?.uploader?.name ? ` · ${fileDoc.uploader.name}` : ''} · {formatDocDate(fileDoc?.createdAt)}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {detail.kind === 'quotation' && quotationId ? (
              <Link
                to={`/quotations/${quotationId}/print`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </Link>
            ) : detail.kind === 'invoice' && invoiceId ? (
              <Link
                to={`/invoices/${invoiceId}/print`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </Link>
            ) : fileUrl ? (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 shadow-sm hover:bg-neutral-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div ref={modalScrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-neutral-100 px-4 py-6 sm:px-6 sm:py-8">
          {detail.kind === 'quotation' ? (
            qLoading || !q ? (
              <div className="flex min-h-[200px] items-center justify-center gap-2 text-sm text-neutral-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading preview…
              </div>
            ) : billFetching && !billing ? (
              <div className="flex min-h-[200px] items-center justify-center gap-2 text-sm text-neutral-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading…
              </div>
            ) : billing ? (
              <div className="mx-auto w-full max-w-[880px]">
                <ScaledA4PreviewViewport fit="fillWidth" minimalChrome className="w-full">
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
                </ScaledA4PreviewViewport>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-neutral-500">Could not load billing profile for preview.</p>
            )
          ) : detail.kind === 'invoice' ? (
            invLoading || !inv ? (
              <div className="flex min-h-[200px] items-center justify-center gap-2 text-sm text-neutral-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading preview…
              </div>
            ) : billFetching && !billingForInvoice ? (
              <div className="flex min-h-[200px] items-center justify-center gap-2 text-sm text-neutral-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading…
              </div>
            ) : billingForInvoice ? (
              <div className="mx-auto w-full max-w-[880px]">
                <ScaledA4PreviewViewport fit="fillWidth" minimalChrome className="w-full">
                  <SalesDocumentPreview
                    variant="invoice"
                    preset={inv.layoutPreset}
                    showBankDetails={inv.showBankDetails !== false}
                    billing={billingForInvoice}
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
                </ScaledA4PreviewViewport>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-neutral-500">Could not load billing profile for preview.</p>
            )
          ) : showPdf ? (
            <iframe title={title} src={fileUrl} className="h-[min(72vh,760px)] min-h-[240px] w-full rounded-lg border border-neutral-200 bg-white shadow-inner" />
          ) : fileUrl ? (
            <div className="mx-auto max-w-md rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center shadow-sm">
              <FileText className="mx-auto h-10 w-10 text-violet-400" />
              <p className="mt-3 text-sm font-medium text-neutral-800">Preview not available</p>
              <p className="mt-1 text-xs text-neutral-500">Open this file in a new tab to view it.</p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
              >
                <ExternalLink className="h-4 w-4" />
                Open file
              </a>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-neutral-500">No file URL for this attachment.</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Structured quotations + optional uploaded proposal files (upload control in header). */
export function DealQuotationsPanel({
  leadId,
  dealId = null,
  proposalDocs = [],
  uploadingProposal = false,
  onUploadProposal,
}) {
  const [detail, setDetail] = useState(null)
  const listArg = dealId ? { dealId, limit: 50 } : { leadId, limit: 50 }
  const skipList = dealId ? !dealId : !leadId
  const { data, isFetching } = useGetQuotationsQuery(listArg, { skip: skipList })

  const rows = data?.data?.items ?? data?.items ?? []
  const inputId = `deal-proposal-upload-${dealId || leadId || 'x'}`
  const showFileUpload = typeof onUploadProposal === 'function'

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-neutral-200">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-white px-5 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Quotations {rows.length > 0 ? `(${rows.length})` : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={
              dealId
                ? `/quotations/new?dealId=${encodeURIComponent(dealId)}`
                : `/quotations/new?leadId=${encodeURIComponent(leadId)}`
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-900 shadow-sm hover:bg-orange-100"
          >
            <Plus className="h-3.5 w-3.5" />
            New quotation
          </Link>
          {showFileUpload ? (
            <label
              htmlFor={inputId}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-900 shadow-sm transition hover:bg-violet-100',
                uploadingProposal ? 'pointer-events-none opacity-50' : '',
              )}
            >
              <Upload className="h-3.5 w-3.5 shrink-0" />
              {uploadingProposal ? 'Uploading…' : 'Upload quotation file'}
              <input
                id={inputId}
                type="file"
                className="hidden"
                disabled={uploadingProposal}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) onUploadProposal(file)
                  e.target.value = ''
                }}
              />
            </label>
          ) : null}
          <Link
            to="/quotations/templates"
            className="text-xs font-medium text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
          >
            Templates
          </Link>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <div className="flex min-h-0 flex-1 flex-col border-b border-neutral-200 bg-neutral-50 md:min-h-[160px] md:border-b-0 md:border-r">
          <p className="shrink-0 px-4 pt-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 md:px-5">
            Structured quotations
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 scrollbar-subtle md:px-5">
            {isFetching && rows.length === 0 ? (
              <p className="text-center text-xs text-neutral-400">Loading quotations…</p>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-5 text-center shadow-sm">
                <FileText className="mx-auto h-7 w-7 text-orange-200" />
                <p className="mt-2 text-xs font-medium text-neutral-700">None yet</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">Create with line items and print layout.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-stretch">
                {rows.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setDetail({ kind: 'quotation', id: q.id })}
                    className="group flex h-full min-h-[240px] flex-col gap-2.5 rounded-xl border border-neutral-200 bg-white p-3 text-left shadow-sm ring-orange-300/0 transition hover:border-orange-200 hover:ring-2 hover:ring-orange-200/60"
                  >
                    <QuotationCardMini quotationId={q.id} />
                    <div className="flex items-start justify-between gap-2 px-0.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-orange-200 bg-orange-50 text-orange-600">
                        <FileText className="h-3 w-3" />
                      </span>
                      <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase', statusPillClass(q.status))}>
                        {q.status}
                      </span>
                    </div>
                    <p className="truncate px-0.5 text-xs font-semibold text-neutral-900">{q.quotationNumber}</p>
                    <p className="px-0.5 text-[11px] text-neutral-500">{fmtMoney(q.grandTotal, q.currency)}</p>
                    <p className="mt-auto px-0.5 pb-0.5 text-[10px] text-neutral-400">Click to enlarge</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col bg-neutral-50 md:min-h-[160px]">
          <p className="shrink-0 px-4 pt-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 md:px-5">
            Attached files
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 scrollbar-subtle md:px-5">
            {proposalDocs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-5 text-center shadow-sm">
                <FileText className="mx-auto h-7 w-7 text-violet-200" />
                <p className="mt-2 text-xs font-medium text-neutral-700">No files yet</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  {showFileUpload ? 'Use Upload quotation file in the header.' : 'Attachments appear here.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-stretch">
                {proposalDocs.map((doc) => {
                  const fileUrl = doc.filePath || doc.fileUrl || null
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setDetail({ kind: 'file', doc })}
                      className="group flex h-full min-h-[240px] flex-col gap-2.5 rounded-xl border border-neutral-200 bg-white p-3 text-left shadow-sm ring-violet-300/0 transition hover:border-violet-200 hover:ring-2 hover:ring-violet-200/60"
                    >
                      {fileUrl && isPdfDoc(doc) ? (
                        <PdfAttachmentMini fileUrl={fileUrl} />
                      ) : (
                        <div
                          className={cn(
                            'flex items-center justify-center rounded-md border border-dashed border-neutral-200 bg-neutral-50',
                            DEAL_CARD_PREVIEW_H_CLASS,
                          )}
                        >
                          <FileText className="h-8 w-8 text-neutral-300" />
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2 px-0.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-violet-200 bg-violet-50 text-violet-600">
                          <FileText className="h-3 w-3" />
                        </span>
                        {isPdfDoc(doc) ? (
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">PDF</span>
                        ) : null}
                      </div>
                      <p className="line-clamp-2 px-0.5 text-xs font-semibold text-neutral-900">{doc.name || 'Untitled'}</p>
                      <p className="px-0.5 text-[11px] text-neutral-500">
                        {bytesLabel(doc.fileSize) || '—'} · {formatDocDate(doc.createdAt)}
                      </p>
                      <p className="mt-auto px-0.5 pb-0.5 text-[10px] text-neutral-400">Click to enlarge</p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {detail ? <DealSalesDocPreviewModal detail={detail} onClose={() => setDetail(null)} /> : null}
    </section>
  )
}

/** Structured invoices + optional uploaded invoice files (upload control in header), matching {@link DealQuotationsPanel} layout. */
export function DealInvoicesPanel({
  leadId,
  dealId = null,
  invoiceFileDocs = [],
  uploadingInvoiceFile = false,
  onUploadInvoiceFile,
}) {
  const [detail, setDetail] = useState(null)
  const listArg = dealId ? { dealId, limit: 50 } : { leadId, limit: 50 }
  const skipList = dealId ? !dealId : !leadId
  const { data, isFetching } = useGetInvoicesQuery(listArg, { skip: skipList })

  const rows = data?.data?.items ?? data?.items ?? []
  const inputId = `deal-invoice-file-upload-${dealId || leadId || 'x'}`
  const showFileUpload = typeof onUploadInvoiceFile === 'function'

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-neutral-200">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-white px-5 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Invoices {rows.length > 0 ? `(${rows.length})` : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={
              dealId
                ? `/invoices/new?dealId=${encodeURIComponent(dealId)}`
                : `/invoices/new?leadId=${encodeURIComponent(leadId)}`
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-sm hover:bg-emerald-100"
          >
            <Plus className="h-3.5 w-3.5" />
            New invoice
          </Link>
          {showFileUpload ? (
            <label
              htmlFor={inputId}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-900 shadow-sm transition hover:bg-violet-100',
                uploadingInvoiceFile ? 'pointer-events-none opacity-50' : '',
              )}
            >
              <Upload className="h-3.5 w-3.5 shrink-0" />
              {uploadingInvoiceFile ? 'Uploading…' : 'Upload invoice file'}
              <input
                id={inputId}
                type="file"
                className="hidden"
                disabled={uploadingInvoiceFile}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) onUploadInvoiceFile(file)
                  e.target.value = ''
                }}
              />
            </label>
          ) : null}
          <Link
            to="/invoices/templates"
            className="text-xs font-medium text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
          >
            Templates
          </Link>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <div className="flex min-h-0 flex-1 flex-col border-b border-neutral-200 bg-neutral-50 md:min-h-[160px] md:border-b-0 md:border-r">
          <p className="shrink-0 px-4 pt-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 md:px-5">
            Structured invoices
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 scrollbar-subtle md:px-5">
            {isFetching && rows.length === 0 ? (
              <p className="text-center text-xs text-neutral-400">Loading invoices…</p>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-5 text-center shadow-sm">
                <Receipt className="mx-auto h-7 w-7 text-emerald-200" />
                <p className="mt-2 text-xs font-medium text-neutral-700">None yet</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">Create with line items and print layout.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-stretch">
                {rows.map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => setDetail({ kind: 'invoice', id: inv.id })}
                    className="group flex h-full min-h-[240px] flex-col gap-2.5 rounded-xl border border-neutral-200 bg-white p-3 text-left shadow-sm ring-emerald-300/0 transition hover:border-emerald-200 hover:ring-2 hover:ring-emerald-200/60"
                  >
                    <InvoiceCardMini invoiceId={inv.id} />
                    <div className="flex items-start justify-between gap-2 px-0.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600">
                        <Receipt className="h-3 w-3" />
                      </span>
                      <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase', statusPillClass(inv.status))}>
                        {inv.status}
                      </span>
                    </div>
                    <p className="truncate px-0.5 text-xs font-semibold text-neutral-900">{inv.invoiceNumber}</p>
                    <p className="px-0.5 text-[11px] text-neutral-500">
                      {fmtMoney(inv.grandTotal, inv.currency)}
                      {Number(inv.amountPaid) > 0 ? ` · paid ${fmtMoney(inv.amountPaid, inv.currency)}` : ''}
                    </p>
                    <p className="mt-auto px-0.5 pb-0.5 text-[10px] text-neutral-400">Click to enlarge</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col bg-neutral-50 md:min-h-[160px]">
          <p className="shrink-0 px-4 pt-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 md:px-5">
            Attached files
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 scrollbar-subtle md:px-5">
            {invoiceFileDocs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-5 text-center shadow-sm">
                <FileText className="mx-auto h-7 w-7 text-violet-200" />
                <p className="mt-2 text-xs font-medium text-neutral-700">No files yet</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  {showFileUpload ? 'Use Upload invoice file in the header.' : 'Attachments appear here.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-stretch">
                {invoiceFileDocs.map((doc) => {
                  const fileUrl = doc.filePath || doc.fileUrl || null
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setDetail({ kind: 'file', doc })}
                      className="group flex h-full min-h-[240px] flex-col gap-2.5 rounded-xl border border-neutral-200 bg-white p-3 text-left shadow-sm ring-violet-300/0 transition hover:border-violet-200 hover:ring-2 hover:ring-violet-200/60"
                    >
                      {fileUrl && isPdfDoc(doc) ? (
                        <PdfAttachmentMini fileUrl={fileUrl} />
                      ) : (
                        <div
                          className={cn(
                            'flex items-center justify-center rounded-md border border-dashed border-neutral-200 bg-neutral-50',
                            DEAL_CARD_PREVIEW_H_CLASS,
                          )}
                        >
                          <FileText className="h-8 w-8 text-neutral-300" />
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2 px-0.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-violet-200 bg-violet-50 text-violet-600">
                          <FileText className="h-3 w-3" />
                        </span>
                        {isPdfDoc(doc) ? (
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">PDF</span>
                        ) : null}
                      </div>
                      <p className="line-clamp-2 px-0.5 text-xs font-semibold text-neutral-900">{doc.name || 'Untitled'}</p>
                      <p className="px-0.5 text-[11px] text-neutral-500">
                        {bytesLabel(doc.fileSize) || '—'} · {formatDocDate(doc.createdAt)}
                      </p>
                      <p className="mt-auto px-0.5 pb-0.5 text-[10px] text-neutral-400">Click to enlarge</p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {detail ? <DealSalesDocPreviewModal detail={detail} onClose={() => setDetail(null)} /> : null}
    </section>
  )
}
