import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Folder, Printer, Search } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { cn } from '@/utils/cn'
import { useGetLeadQuery } from '@/features/leads/leadsApi'
import { useGetDocumentsQuery, useGetLeadDocumentSummariesQuery } from '@/features/documents/documentsApi'
import { LeadDocumentsWorkspace } from '@/features/documents/components/LeadDocumentsWorkspace'
import { LeadFolderSummaryCard } from '@/features/documents/components/LeadFolderSummaryCard'
import { useGetQuotationsQuery } from '@/features/sales-docs/quotationsApi'
import { useGetInvoicesQuery } from '@/features/sales-docs/invoicesApi'
import { QUOTATION_PRESET_LABELS, INVOICE_PRESET_LABELS } from '@/features/sales-docs/presetLabels'
import { TemplateMiniPreview } from '@/features/sales-docs/components/TemplateMiniPreview'
import { resolveGalleryPreviewTheme } from '@/features/sales-docs/templateGalleryPreviewTheme'
import { DOC_CARD_GRID } from '@/features/documents/components/DocumentCard'

const LEAD_DOC_TABS = [
  { id: 'files', label: 'Files' },
  { id: 'quotations', label: 'Quotations' },
  { id: 'invoices', label: 'Invoices' },
 
]

function fmtMoney(n, c = 'USD') {
  const v = Number(n ?? 0)
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(v)
  } catch {
    return `${c} ${v.toFixed(2)}`
  }
}

function normalizeListPayload(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.data?.items)) return data.data.items
  return []
}

function quotationStatusClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'converted') return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80'
  if (s === 'draft') return 'bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200/80'
  return 'bg-sky-50 text-sky-800 ring-1 ring-sky-200/80'
}

function invoiceStatusClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'paid') return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80'
  if (s === 'draft') return 'bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200/80'
  return 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/80'
}

function SalesDocsPreviewCards({ variant, rows, loading, emptyLabel, presetLabels }) {
  const isQuotation = variant === 'quotation'
  if (loading) {
    return <p className="py-12 text-center text-sm text-ink-muted">Loading…</p>
  }
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-surface-border bg-surface-muted/30 py-14 text-center text-sm text-ink-muted">
        {emptyLabel}
      </div>
    )
  }
  return (
    <div className={DOC_CARD_GRID}>
      {rows.map((row) => {
        const id = row.id
        const number = isQuotation ? row.quotationNumber : row.invoiceNumber
        const presetIdx = (Number(row.layoutPreset) || 1) - 1
        const presetName = presetLabels[presetIdx] || '—'
        const theme = resolveGalleryPreviewTheme(isQuotation ? 'quotation' : 'invoice', row)
        const printHref = isQuotation ? `/quotations/${id}/print` : `/invoices/${id}/print`
        const showBank = !isQuotation && row.sectionSettings && typeof row.sectionSettings === 'object'
          ? row.sectionSettings.showBankDetails !== false
          : true

        return (
          <article
            key={id}
            className="flex flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white/95 shadow-sm ring-1 ring-black/[0.03] transition hover:border-zinc-200 hover:shadow-md"
          >
            <Link
              to={printHref}
              className="group block w-full shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
            >
              <div className="aspect-square w-full overflow-hidden bg-zinc-50 p-2">
                <TemplateMiniPreview
                  variant={isQuotation ? 'quotation' : 'invoice'}
                  layoutPreset={row.layoutPreset}
                  theme={theme}
                  showBankDetails={isQuotation ? true : showBank}
                />
              </div>
            </Link>
            <div className="flex min-h-0 flex-1 flex-col gap-2 border-t border-zinc-100 p-3">
              <p className="line-clamp-2 text-sm font-semibold text-zinc-800">{number}</p>
              <span
                className={cn(
                  'w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  isQuotation ? quotationStatusClass(row.status) : invoiceStatusClass(row.status),
                )}
              >
                {row.status}
              </span>
              <p className="text-sm font-semibold tabular-nums text-ink">{fmtMoney(row.grandTotal, row.currency)}</p>
              {!isQuotation ? (
                <p className="text-xs text-zinc-500">
                  Paid <span className="font-medium tabular-nums text-ink">{fmtMoney(row.amountPaid, row.currency)}</span>
                </p>
              ) : null}
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{presetName}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                <Link
                  to={printHref}
                  className="inline-flex items-center gap-1 rounded-lg border border-surface-border bg-white px-2.5 py-1.5 text-xs font-semibold text-ink shadow-sm hover:bg-surface-muted"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden />
                  PDF / Print
                </Link>
                {!isQuotation ? (
                  <Link
                    to={`/invoices/new?invoiceId=${encodeURIComponent(id)}`}
                    className="inline-flex items-center rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-100"
                  >
                    Edit
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export function DocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedLeadId = searchParams.get('leadId') || ''

  const [docTab, setDocTab] = useState('files')
  const [folderSearch, setFolderSearch] = useState('')

  const setLeadParam = (id) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (id) p.set('leadId', id)
        else p.delete('leadId')
        return p
      },
      { replace: true },
    )
  }

  const { data: summariesRes, isLoading: summariesLoading } = useGetLeadDocumentSummariesQuery()
  const summaries = useMemo(() => {
    const raw = summariesRes?.data
    return Array.isArray(raw) ? raw : []
  }, [summariesRes?.data])

  const { data: leadRes } = useGetLeadQuery(selectedLeadId, { skip: !selectedLeadId })
  const lead = leadRes?.data

  const filteredSummaries = useMemo(() => {
    const q = folderSearch.trim().toLowerCase()
    if (!q) return summaries
    return summaries.filter((s) => String(s.name || '').toLowerCase().includes(q))
  }, [summaries, folderSearch])

  const selectedSummary = useMemo(
    () => summaries.find((s) => String(s.id) === String(selectedLeadId)),
    [summaries, selectedLeadId],
  )

  const folderTitle = useMemo(() => {
    if (!selectedLeadId) return ''
    if (selectedSummary?.name) return String(selectedSummary.name).trim()
    const n = String(lead?.contactName || lead?.company || '').trim()
    return n || 'Lead'
  }, [selectedLeadId, selectedSummary, lead])

  const qArg = useMemo(() => ({ limit: 80, ...(selectedLeadId ? { leadId: selectedLeadId } : {}) }), [selectedLeadId])
  const { data: qData, isLoading: qLoading } = useGetQuotationsQuery(qArg, { skip: !selectedLeadId })
  const { data: invData, isLoading: invLoading } = useGetInvoicesQuery(qArg, { skip: !selectedLeadId })
  const { data: docsData, isLoading: docsLoading } = useGetDocumentsQuery({ leadId: selectedLeadId }, { skip: !selectedLeadId })

  const quotationRows = useMemo(() => normalizeListPayload(qData?.data ?? qData), [qData])
  const invoiceRows = useMemo(() => normalizeListPayload(invData?.data ?? invData), [invData])
  const fileRows = docsData?.data || []

  return (
    <PageShell fullWidth mainClassName="pt-3 sm:pt-4">
      <div className="-mt-2 pt-1 sm:-mt-4 sm:pt-2">
        <div className="flex h-[calc(100dvh-84px)] min-h-[620px] flex-col overflow-hidden border-y border-surface-border bg-white text-ink shadow-sm sm:rounded-2xl sm:border">
          <div className="grid min-h-0 flex-1 grid-cols-1">
            <section className="scrollbar-subtle flex min-h-0 min-w-0 flex-col overflow-hidden">
              {!selectedLeadId ? (
                <div className="scrollbar-subtle flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 pb-3 pt-7 sm:px-4 sm:pb-4 sm:pt-9">
                  <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-sm font-semibold text-ink sm:text-base">Lead folders</h2>
                    <div className="relative w-full shrink-0 sm:max-w-xs">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
                      <input
                        value={folderSearch}
                        onChange={(e) => setFolderSearch(e.target.value)}
                        placeholder="Search by lead name…"
                        className="h-10 w-full rounded-xl border border-surface-border bg-white pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  {summariesLoading ? (
                    <p className="py-12 text-center text-sm text-ink-muted">Loading folders…</p>
                  ) : filteredSummaries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border bg-surface-muted/30 py-16 text-center">
                      <Folder className="mb-3 h-11 w-11 text-ink-faint" aria-hidden />
                      <p className="text-sm font-medium text-ink">
                        {summaries.length === 0 ? 'No document folders yet' : 'No matching folders'}
                      </p>
                      <p className="mt-1 max-w-md px-4 text-sm text-ink-muted">
                        {summaries.length === 0
                          ? 'Upload a file from a lead’s Documents tab to create a folder here.'
                          : 'Try a different search.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid min-w-0 w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {filteredSummaries.map((row) => (
                        <LeadFolderSummaryCard
                          key={row.id}
                          name={row.name}
                          email={row.email}
                          documentCount={row.documentCount}
                          totalFileBytes={row.totalFileBytes ?? 0}
                          lastDocumentAt={row.lastDocumentAt}
                          onClick={() => {
                            setLeadParam(row.id)
                            setDocTab('files')
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-surface-border px-4 pb-3 pt-5 sm:px-5 sm:pb-3.5 sm:pt-6">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Open folder</p>
                      <p className="text-base font-semibold text-ink">{folderTitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLeadParam('')}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-surface-border bg-white px-3 py-2 text-xs font-semibold text-ink shadow-sm hover:bg-surface-muted"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                      All folders
                    </button>
                  </div>
                  <div className="flex shrink-0 gap-1 border-b border-surface-border px-2 pt-2 sm:px-4">
                    {LEAD_DOC_TABS.map((tab) => {
                      const count =
                        tab.id === 'quotations'
                          ? quotationRows.length
                          : tab.id === 'invoices'
                            ? invoiceRows.length
                            : fileRows.length
                      const loading = tab.id === 'quotations' ? qLoading : tab.id === 'invoices' ? invLoading : docsLoading
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setDocTab(tab.id)}
                          className={cn(
                            'relative rounded-t-lg px-3 py-2.5 text-sm font-semibold transition',
                            docTab === tab.id
                              ? 'bg-white text-brand-800 after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-500'
                              : 'text-ink-muted hover:bg-white/60 hover:text-ink',
                          )}
                        >
                          {tab.label}
                          <span className="ml-1.5 tabular-nums text-xs font-normal text-ink-muted">
                            {loading ? '…' : `(${count})`}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                    {docTab === 'quotations' ? (
                      <SalesDocsPreviewCards
                        variant="quotation"
                        rows={quotationRows}
                        loading={qLoading}
                        emptyLabel="No quotations for this lead yet."
                        presetLabels={QUOTATION_PRESET_LABELS}
                      />
                    ) : null}

                    {docTab === 'invoices' ? (
                      <SalesDocsPreviewCards
                        variant="invoice"
                        rows={invoiceRows}
                        loading={invLoading}
                        emptyLabel="No invoices for this lead yet."
                        presetLabels={INVOICE_PRESET_LABELS}
                      />
                    ) : null}

                    {docTab === 'files' ? <LeadDocumentsWorkspace leadId={selectedLeadId} showUpload /> : null}
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
