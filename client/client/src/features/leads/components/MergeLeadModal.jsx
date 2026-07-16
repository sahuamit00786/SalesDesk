import { useState, useMemo } from 'react'
import { GitMerge } from '@/components/ui/icons'
import toast from 'react-hot-toast'
import { useMergeDuplicateLeadMutation } from '@/features/leads/duplicateLeadsApi'

const MERGE_FIELDS = [
  { key: 'contactName', label: 'Contact Name' },
  { key: 'company', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'phoneCountryCode', label: 'Phone Code' },
  { key: 'altPhone', label: 'Alt Phone' },
  { key: 'altPhoneCountryCode', label: 'Alt Code' },
  { key: 'designation', label: 'Designation' },
  { key: 'street', label: 'Street' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'postalCode', label: 'Postal Code' },
  { key: 'value', label: 'Deal Value' },
  { key: 'requirement', label: 'Requirement' },
  { key: 'status', label: 'Status' },
]

function normalizeIncoming(leadData) {
  return {
    contactName: leadData.contactName || leadData.fullName || '',
    company: leadData.company || leadData.companyName || '',
    email: leadData.email || '',
    phone: leadData.phone || '',
    phoneCountryCode: leadData.phoneCountryCode || '',
    altPhone: leadData.altPhone || '',
    altPhoneCountryCode: leadData.altPhoneCountryCode || '',
    designation: leadData.designation || leadData.jobTitle || '',
    street: leadData.street || '',
    city: leadData.city || '',
    state: leadData.state || '',
    country: leadData.country || '',
    postalCode: leadData.postalCode || '',
    value: String(leadData.value ?? leadData.dealValue ?? ''),
    requirement: leadData.requirement || leadData.dealDescription || '',
    status: leadData.status || '',
  }
}

export function MergeLeadModal({ open, record, onClose, onMerged }) {
  const [mergeDuplicate, { isLoading }] = useMergeDuplicateLeadMutation()
  const [selections, setSelections] = useState({})

  const incoming = useMemo(() => (record ? normalizeIncoming(record.leadData || {}) : {}), [record])
  const existing = useMemo(() => record?.matchedLead || {}, [record])

  function select(field, side) {
    setSelections((s) => ({ ...s, [field]: side }))
  }

  function selectAll(side) {
    const s = {}
    for (const f of MERGE_FIELDS) s[f.key] = side
    setSelections(s)
  }

  async function doMerge() {
    const fieldSelections = {}
    for (const f of MERGE_FIELDS) {
      fieldSelections[f.key] = selections[f.key] || 'existing'
    }
    try {
      await mergeDuplicate({ id: record.id, fieldSelections }).unwrap()
      toast.success('Leads merged successfully')
      onMerged?.()
      onClose?.()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Merge failed')
    }
  }

  if (!open || !record) return null

  const incomingName = record.leadData
    ? (record.leadData.contactName || record.leadData.fullName || record.leadData.title || 'Incoming')
    : 'Incoming'
  const existingName = existing.contactName || existing.title || record.matchedLeadTitle || 'Existing'

  // Only show rows where at least one side has a value
  const visibleFields = MERGE_FIELDS.filter((f) => {
    const incVal = String(incoming[f.key] ?? '').trim()
    const exVal = String(existing[f.key] ?? '').trim()
    return incVal || exVal
  })

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
      <div
        className="flex w-full max-w-3xl flex-col rounded-2xl border border-surface-border bg-white shadow-2xl"
        style={{ maxHeight: '85vh' }}
      >
        {/* Modal header */}
        <div className="flex items-center gap-2.5 border-b border-surface-border px-5 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <GitMerge className="h-4 w-4 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Merge Leads</p>
            <p className="text-[11px] text-ink-muted">Select which value to keep. Existing lead will be updated.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint hover:bg-slate-100 hover:text-ink"
          >
            ×
          </button>
        </div>

        {/* Column headers — gray sticky bar */}
        <div className="grid grid-cols-[140px_1fr_1fr] border-b border-surface-border bg-slate-50 px-5 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
          <span className="self-center">Field</span>

          {/* Incoming header */}
          <div className="flex items-center gap-2 border-r border-surface-border pr-3">
            <span className="truncate font-bold text-amber-600">Incoming: {incomingName}</span>
            <button
              type="button"
              onClick={() => selectAll('incoming')}
              className="ml-auto shrink-0 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-amber-700 hover:bg-amber-200"
            >
              ← Use all
            </button>
          </div>

          {/* Existing header */}
          <div className="flex items-center gap-2 pl-3">
            <button
              type="button"
              onClick={() => selectAll('existing')}
              className="shrink-0 rounded bg-violet-100 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-violet-700 hover:bg-violet-200"
            >
              Use all →
            </button>
            <span className="truncate font-bold text-violet-700">Existing: {existingName}</span>
          </div>
        </div>

        {/* Field rows */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
          {visibleFields.map((f) => {
            const incVal = String(incoming[f.key] ?? '').trim()
            const exVal = String(existing[f.key] ?? '').trim()
            const same = incVal === exVal
            const sel = selections[f.key] || 'existing'

            return (
              <div
                key={f.key}
                className={`mb-1 grid grid-cols-[140px_1fr_1fr] items-stretch rounded-lg border text-xs ${
                  same
                    ? 'border-transparent bg-slate-50/60 opacity-55'
                    : 'border-surface-border bg-white'
                }`}
              >
                {/* Field label */}
                <div className="flex items-center border-r border-surface-border px-3 py-1.5">
                  <span className="text-[11px] font-medium text-ink-muted">{f.label}</span>
                </div>

                {/* Incoming value */}
                <button
                  type="button"
                  disabled={same}
                  onClick={() => select(f.key, 'incoming')}
                  className={`border-r border-surface-border px-3 py-1.5 text-left text-xs transition-colors ${
                    !same && sel === 'incoming'
                      ? 'bg-amber-50 font-medium text-amber-900 ring-1 ring-inset ring-amber-400'
                      : same
                      ? 'text-ink-muted'
                      : 'text-ink hover:bg-amber-50/50'
                  }`}
                >
                  {incVal || <span className="italic text-ink-faint">—</span>}
                </button>

                {/* Existing value */}
                <button
                  type="button"
                  disabled={same}
                  onClick={() => select(f.key, 'existing')}
                  className={`px-3 py-1.5 text-left text-xs transition-colors ${
                    !same && sel === 'existing'
                      ? 'bg-violet-50 font-medium text-violet-900 ring-1 ring-inset ring-violet-400'
                      : same
                      ? 'text-ink-muted'
                      : 'text-ink hover:bg-violet-50/50'
                  }`}
                >
                  {exVal || <span className="italic text-ink-faint">—</span>}
                </button>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-surface-border px-5 py-3">
          <p className="mr-auto text-[11px] text-ink-muted">
            Incoming entry removed from queue after merge.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl border border-surface-border px-4 text-sm text-ink hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={doMerge}
            disabled={isLoading}
            className="h-9 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isLoading ? 'Merging…' : 'Merge Leads'}
          </button>
        </div>
      </div>
    </div>
  )
}
