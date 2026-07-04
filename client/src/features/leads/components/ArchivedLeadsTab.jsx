import { useEffect, useState } from 'react'
import { Archive, RotateCcw, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useGetArchivedLeadsQuery, useBulkArchivedLeadsMutation } from '@/features/leads/leadsApi'

function formatPhone(lead) {
  const code = lead.phoneCountryCode || ''
  const phone = lead.phone || ''
  return `${code ? `${code} ` : ''}${phone}`.trim() || '—'
}

const PAGE_SIZE = 20

/** The "Archived Leads/Opportunities" tab — shows soft-deleted records with restore / permanent-delete, single or bulk. */
export function ArchivedLeadsTab({ isOpportunity = false }) {
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState([])
  const { data, isLoading, isFetching, refetch } = useGetArchivedLeadsQuery(
    { page, limit: PAGE_SIZE, isOpportunity },
    { refetchOnMountOrArgChange: true },
  )
  const [bulkArchived, { isLoading: actionRunning }] = useBulkArchivedLeadsMutation()
  const [confirm, setConfirm] = useState(null) // { action: 'restore' | 'permanentDelete', ids: string[] }

  const records = data?.data || []
  const total = data?.meta?.total ?? records.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const noun = isOpportunity ? 'opportunity' : 'lead'
  const nounPlural = isOpportunity ? 'opportunities' : 'leads'

  useEffect(() => {
    setSelected([])
    setConfirm(null)
  }, [page, isOpportunity])

  function toggleOne(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleAll(checked) {
    setSelected(checked ? records.map((r) => r.id) : [])
  }

  async function runConfirmedAction() {
    if (!confirm) return
    const { action, ids } = confirm
    try {
      await bulkArchived({ ids, action }).unwrap()
      const count = ids.length
      const label = count === 1 ? noun : nounPlural
      toast.success(action === 'restore' ? `${count} ${label} restored` : `${count} ${label} permanently deleted`)
      setSelected((prev) => prev.filter((id) => !ids.includes(id)))
    } catch {
      toast.error(action === 'restore' ? `Could not restore ${nounPlural}` : `Could not delete ${nounPlural}`)
    } finally {
      setConfirm(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
      </div>
    )
  }

  if (!records.length) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted">
          <Archive className="h-5 w-5 text-ink-muted" />
        </div>
        <p className="text-sm font-semibold text-ink">No archived {nounPlural}</p>
        <p className="text-xs text-ink-muted">
          Deleted {nounPlural} show up here so you can restore or purge them.
        </p>
      </div>
    )
  }

  const allSelected = records.length > 0 && records.every((r) => selected.includes(r.id))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Archived {isOpportunity ? 'Opportunities' : 'Leads'}</p>
          <p className="text-xs text-ink-muted">
            Showing {records.length} of {total} deleted {nounPlural} — restore or permanently delete.
          </p>
        </div>
        <button type="button" onClick={refetch} className="text-xs text-[var(--brand-primary)] hover:underline">Refresh</button>
      </div>

      {selected.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-2.5">
          <p className="text-xs font-semibold text-ink">{selected.length} selected</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirm({ action: 'restore', ids: selected })}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore selected
            </button>
            <button
              type="button"
              onClick={() => setConfirm({ action: 'permanentDelete', ids: selected })}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600 hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete selected permanently
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-none border-0 bg-white">
        <div className="overflow-x-auto">
          <table className="cx-table cx-data-grid cx-table--dense min-w-[1000px] text-xs">
            <thead className="cx-table-sticky-head">
              <tr>
                <th className="w-10 align-middle">
                  <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} />
                </th>
                <th className="w-12 align-middle">#</th>
                <th className="align-middle">Name</th>
                <th className="align-middle">Email</th>
                <th className="align-middle">Phone</th>
                <th className="align-middle">Company</th>
                <th className="align-middle">Deleted</th>
                <th className="cx-table-cell-actions text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((lead, index) => (
                <tr key={lead.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(lead.id)}
                      onChange={() => toggleOne(lead.id)}
                    />
                  </td>
                  <td className="text-ink-muted">{(page - 1) * PAGE_SIZE + index + 1}</td>
                  <td className="font-semibold text-ink">{lead.contactName || lead.title || '—'}</td>
                  <td className="text-ink-muted">{lead.email || '—'}</td>
                  <td className="text-ink-muted">{formatPhone(lead)}</td>
                  <td className="text-ink-muted">{lead.company || '—'}</td>
                  <td className="text-ink-muted">
                    {lead.deletedAt ? new Date(lead.deletedAt).toLocaleString() : '—'}
                  </td>
                  <td className="cx-table-cell-actions text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => setConfirm({ action: 'restore', ids: [lead.id] })}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700"
                        aria-label={`Restore ${noun}`}
                        title={`Restore ${noun}`}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirm({ action: 'permanentDelete', ids: [lead.id] })}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-danger"
                        aria-label={`Delete ${noun} permanently`}
                        title="Delete permanently"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-ink-muted">Page {page} of {totalPages}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-8 rounded-lg border border-surface-border bg-white px-3 text-xs font-semibold text-ink hover:border-brand-200 hover:bg-brand-50 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages || isFetching}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-8 rounded-lg border border-surface-border bg-white px-3 text-xs font-semibold text-ink hover:border-brand-200 hover:bg-brand-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirmedAction}
        loading={actionRunning}
        variant={confirm?.action === 'permanentDelete' ? 'danger' : 'primary'}
        title={
          confirm?.action === 'restore'
            ? `Restore ${confirm.ids.length > 1 ? `${confirm.ids.length} ${nounPlural}` : noun}?`
            : `Permanently delete ${confirm?.ids.length > 1 ? `${confirm.ids.length} ${nounPlural}` : `this ${noun}`}?`
        }
        description={
          confirm?.action === 'restore'
            ? `This will move ${confirm.ids.length > 1 ? 'them' : `it`} back to the active ${nounPlural} list.`
            : 'This cannot be undone.'
        }
        confirmLabel={confirm?.action === 'restore' ? 'Restore' : 'Delete permanently'}
      />
    </div>
  )
}
