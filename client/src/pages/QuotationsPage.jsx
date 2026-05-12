import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Printer, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageShell } from '@/components/layout/PageShell'
import { useGetQuotationsQuery } from '@/features/sales-docs/quotationsApi'
import { useConvertQuotationToInvoiceMutation } from '@/features/sales-docs/quotationsApi'
import { CreateQuotationDrawer } from '@/features/sales-docs/components/CreateQuotationDrawer'
import { QUOTATION_PRESET_LABELS } from '@/features/sales-docs/presetLabels'
import { cn } from '@/utils/cn'

function fmtMoney(n, c = 'USD') {
  const v = Number(n ?? 0)
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(v)
  } catch {
    return `${c} ${v.toFixed(2)}`
  }
}

export function QuotationsPage() {
  const [params] = useSearchParams()
  const leadFilter = params.get('leadId')
  const [drawerOpen, setDrawerOpen] = useState(Boolean(params.get('new')))
  const [initialLead, setInitialLead] = useState(leadFilter || null)

  const queryArg = useMemo(() => ({ limit: 50, ...(leadFilter ? { leadId: leadFilter } : {}) }), [leadFilter])
  const { data, isLoading, refetch } = useGetQuotationsQuery(queryArg)
  const [convert, { isLoading: converting }] = useConvertQuotationToInvoiceMutation()

  const rows = data?.data?.items ?? data?.items ?? []

  return (
    <PageShell>
      <div className="flex w-full min-w-0 flex-col gap-6 py-2">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Quotations</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Structured quotes from deals — print-ready layouts and one-click conversion to invoices.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <Link
              to="/quotations/new"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 shadow-sm hover:bg-neutral-50"
            >
              Full editor
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-[#534AB7] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#483fa3]"
              onClick={() => {
                setInitialLead(leadFilter || null)
                setDrawerOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Quick add
            </button>
          </div>
        </header>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Preset</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                    No quotations yet. Create one from a deal or click New quotation.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-neutral-50/80">
                    <td className="px-4 py-3 font-medium text-neutral-900">{row.quotationNumber}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          row.status === 'converted'
                            ? 'bg-emerald-50 text-emerald-800'
                            : row.status === 'draft'
                              ? 'bg-neutral-100 text-neutral-700'
                              : 'bg-sky-50 text-sky-800',
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-neutral-800">
                      {fmtMoney(row.grandTotal, row.currency)}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      {QUOTATION_PRESET_LABELS[(Number(row.layoutPreset) || 1) - 1] || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/quotations/${row.id}/print`}
                          className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          PDF / Print
                        </Link>
                        {row.status !== 'converted' ? (
                          <button
                            type="button"
                            disabled={converting}
                            className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                            onClick={async () => {
                              try {
                                await convert({ id: row.id }).unwrap()
                                toast.success('Converted to invoice')
                                refetch()
                              } catch (e) {
                                toast.error(e?.data?.error?.message || 'Conversion failed')
                              }
                            }}
                          >
                            To invoice
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-neutral-400">
          Manage reusable layouts under{' '}
          <Link className="font-medium text-[#534AB7] hover:underline" to="/quotations/templates">
            Quotation templates
          </Link>
          .
        </p>
      </div>

      <CreateQuotationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialLeadId={initialLead}
      />
    </PageShell>
  )
}
