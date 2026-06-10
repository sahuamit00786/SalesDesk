import { useState } from 'react'
import { AlertTriangle, Trash2, GitMerge, Plus, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  useGetDuplicateLeadsQuery,
  useDeleteDuplicateLeadMutation,
  useCreateDuplicateAsLeadMutation,
} from '@/features/leads/duplicateLeadsApi'
import { MergeLeadModal } from '@/features/leads/components/MergeLeadModal'

const SOURCE_LABELS = {
  manual: 'Manual',
  csv_import: 'CSV Import',
  opportunity: 'Opportunity',
}

const FIELD_LABELS = {
  email: 'Email',
  phone: 'Phone',
  both: 'Email & Phone',
  email_or_phone: 'Email / Phone',
}

function formatPhone(lead) {
  if (!lead) return '—'
  const code = lead.phoneCountryCode || ''
  const phone = lead.phone || ''
  return `${code ? `${code} ` : ''}${phone}`.trim() || '—'
}

function getIncomingName(record) {
  const d = record.leadData || {}
  return d.contactName || d.fullName || d.title || '—'
}

function getIncomingEmail(record) {
  return record.leadData?.email || '—'
}

function getIncomingPhone(record) {
  const d = record.leadData || {}
  const code = d.phoneCountryCode || ''
  const phone = d.phone || ''
  return `${code ? `${code} ` : ''}${phone}`.trim() || '—'
}

function MatchedLeadLink({ record }) {
  if (!record.matchedLeadId) return <span className="text-ink-faint">—</span>

  const name = record.matchedLeadTitle || record.matchedLead?.contactName || record.matchedLead?.title || 'Existing Lead'
  return (
    <a
      href={`/leads/${record.matchedLeadId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[var(--brand-primary)] underline underline-offset-2 hover:text-[#4C1D95]"
      title="Open in new tab"
    >
      {name}
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  )
}

/** The "Duplicate Leads" review tab shown inside the Add Lead modal. */
export function DuplicateLeadsTab() {
  const { data, isLoading, refetch } = useGetDuplicateLeadsQuery(undefined, { refetchOnMountOrArgChange: true })
  const [deleteDuplicate, { isLoading: deleting }] = useDeleteDuplicateLeadMutation()
  const [createAsLead, { isLoading: creating }] = useCreateDuplicateAsLeadMutation()
  const [mergeRecord, setMergeRecord] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [pendingCreate, setPendingCreate] = useState(null)

  const records = data?.data || []

  async function handleDelete(record) {
    if (pendingDelete !== record.id) {
      setPendingDelete(record.id)
      return
    }
    setPendingDelete(null)
    try {
      await deleteDuplicate(record.id).unwrap()
      toast.success('Duplicate record removed')
    } catch {
      toast.error('Could not delete')
    }
  }

  async function handleCreate(record) {
    if (pendingCreate !== record.id) {
      setPendingCreate(record.id)
      return
    }
    setPendingCreate(null)
    try {
      await createAsLead(record.id).unwrap()
      toast.success('Lead created with "potential-duplicate" tag')
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not create lead')
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
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <AlertTriangle className="h-5 w-5 text-green-600" />
        </div>
        <p className="text-sm font-semibold text-ink">No duplicate leads</p>
        <p className="text-xs text-ink-muted">All potential duplicates have been reviewed.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Duplicate Review Queue</p>
          <p className="text-xs text-ink-muted">{records.length} pending record{records.length !== 1 ? 's' : ''} — decide whether to merge, create, or delete each one.</p>
        </div>
        <button type="button" onClick={refetch} className="text-xs text-[var(--brand-primary)] hover:underline">Refresh</button>
      </div>

      <div className="space-y-2">
        {records.map((record) => {
          const isDeleting = pendingDelete === record.id
          const isCreating = pendingCreate === record.id

          return (
            <div key={record.id} className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
              {/* Tag badge */}
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Potential Duplicate
                </span>
                <span className="text-[10px] text-ink-faint">{SOURCE_LABELS[record.source] || record.source}</span>
                <span className="text-[10px] text-ink-faint">· matched by {FIELD_LABELS[record.matchField] || record.matchField || '—'}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {/* Incoming */}
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Incoming</p>
                  <p className="text-sm font-semibold text-ink">{getIncomingName(record)}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{getIncomingEmail(record)}</p>
                  <p className="text-xs text-ink-muted">{getIncomingPhone(record)}</p>
                </div>

                {/* Existing (matched) */}
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Conflicts with</p>
                  <p className="text-sm font-semibold">
                    <MatchedLeadLink record={record} />
                  </p>
                  {record.matchedLead && (
                    <>
                      <p className="mt-0.5 text-xs text-ink-muted">{record.matchedLead.email || '—'}</p>
                      <p className="text-xs text-ink-muted">{formatPhone(record.matchedLead)}</p>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="col-span-2 sm:col-span-1">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Actions</p>
                  <div className="flex flex-wrap gap-2">
                    {/* Merge */}
                    <button
                      type="button"
                      onClick={() => setMergeRecord(record)}
                      disabled={!record.matchedLeadId}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      <GitMerge className="h-3 w-3" />
                      Merge
                    </button>

                    {/* Create anyway */}
                    {isCreating ? (
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => setPendingCreate(null)} className="h-8 rounded-lg border border-surface-border px-3 text-xs text-ink-muted">Cancel</button>
                        <button type="button" onClick={() => handleCreate(record)} className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white">Confirm create</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCreate(record)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        <Plus className="h-3 w-3" />
                        Create anyway
                      </button>
                    )}

                    {/* Delete */}
                    {isDeleting ? (
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => setPendingDelete(null)} className="h-8 rounded-lg border border-surface-border px-3 text-xs text-ink-muted">Cancel</button>
                        <button type="button" onClick={() => handleDelete(record)} disabled={deleting} className="h-8 rounded-lg bg-red-500 px-3 text-xs font-semibold text-white disabled:opacity-60">Confirm delete</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDelete(record)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <MergeLeadModal
        open={Boolean(mergeRecord)}
        record={mergeRecord}
        onClose={() => setMergeRecord(null)}
        onMerged={() => { setMergeRecord(null); refetch() }}
      />
    </div>
  )
}
