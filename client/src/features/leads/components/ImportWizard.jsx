import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronRight, Upload } from '@/components/ui/icons'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { useGetLeadsQuery } from '@/features/leads/leadsApi'
import { cn } from '@/utils/cn'

function parseCSVRows(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [contactName, company, email, phone, value] = line.split(',').map((v) => v?.trim())
      return {
        title: contactName || email || 'Imported lead',
        contactName,
        company,
        email: email?.toLowerCase() || '',
        phone,
        value: Number(value || 0),
        source: 'csv_import',
      }
    })
}

/** Step 1: paste CSV */
function PasteStep({ rowsText, onChange }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        Paste CSV rows: <code className="rounded bg-surface-subtle px-1 text-xs">name, company, email, phone, value</code>
      </p>
      <textarea
        className="min-h-[320px] w-full rounded-xl border border-surface-border p-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        placeholder={'John Doe, Acme Corp, john@acme.com, +91 9876543210, 50000\nJane Smith, Beta Inc, jane@beta.com, +91 9000000001, 30000'}
        value={rowsText}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

/** Step 2: dedup review */
function DedupeStep({ rows, existingEmails, selected, onToggle }) {
  const dupes = rows.filter((r) => r.email && existingEmails.has(r.email))
  const fresh = rows.filter((r) => !r.email || !existingEmails.has(r.email))

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-semibold text-emerald-800">{fresh.length} new leads</p>
          <p className="text-[11px] text-emerald-700">Will be imported</p>
        </div>
        <div className="flex-1 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-800">{dupes.length} duplicates</p>
          <p className="text-[11px] text-amber-700">Email matches existing lead</p>
        </div>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-ink-muted text-center py-6">No valid rows to preview.</p>
      )}

      <div className="space-y-1.5 max-h-[380px] overflow-y-auto">
        {rows.map((row, i) => {
          const isDupe = row.email && existingEmails.has(row.email)
          const isSelected = selected.has(i)
          return (
            <label
              key={i}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                isDupe
                  ? isSelected
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-surface-border bg-surface-subtle/60 opacity-70'
                  : isSelected
                    ? 'border-brand-300 bg-brand-50'
                    : 'border-surface-border bg-white hover:bg-surface-subtle/50',
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-surface-border text-brand-600"
                checked={isSelected}
                onChange={() => onToggle(i)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-ink truncate">
                    {row.contactName || row.email || 'Unnamed'}
                  </span>
                  {isDupe && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-700">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Duplicate
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-ink-muted truncate">
                  {[row.email, row.company].filter(Boolean).join(' · ')}
                </p>
              </div>
              {isSelected ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-500 mt-0.5" />
              ) : null}
            </label>
          )
        })}
      </div>
    </div>
  )
}

export function ImportWizard({ open, onClose, onImport }) {
  const [step, setStep] = useState(1)
  const [rowsText, setRowsText] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [busy, setBusy] = useState(false)

  // Fetch existing leads to detect duplicates by email
  const { data: existingLeadsData } = useGetLeadsQuery({ limit: 2000 }, { skip: !open })
  const existingEmails = useMemo(() => {
    const leads = existingLeadsData?.data?.rows || existingLeadsData?.data || []
    const set = new Set()
    leads.forEach((l) => { if (l.email) set.add(l.email.toLowerCase()) })
    return set
  }, [existingLeadsData])

  const parsedRows = useMemo(() => parseCSVRows(rowsText), [rowsText])

  // When entering step 2, select all non-duplicate rows by default
  function goToReview() {
    const defaults = new Set()
    parsedRows.forEach((row, i) => {
      if (!row.email || !existingEmails.has(row.email)) defaults.add(i)
    })
    setSelected(defaults)
    setStep(2)
  }

  function toggleRow(i) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  async function handleImport() {
    const toImport = parsedRows.filter((_, i) => selected.has(i))
    if (!toImport.length) return
    setBusy(true)
    try {
      await onImport?.(toImport)
      handleClose()
    } finally {
      setBusy(false)
    }
  }

  function handleClose() {
    setStep(1)
    setRowsText('')
    setSelected(new Set())
    onClose?.()
  }

  const selectedCount = selected.size

  return (
    <RightDrawer
      open={open}
      onClose={handleClose}
      title="Import Leads"
      description={step === 1 ? 'Paste CSV data to import' : 'Review and deselect duplicates'}
      footer={
        <div className="flex items-center justify-between gap-2">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="h-10 rounded-xl border border-surface-border px-5 text-sm font-medium text-ink-muted hover:bg-surface-subtle"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              className="h-10 rounded-xl border border-surface-border px-5 text-sm font-medium text-ink-muted hover:bg-surface-subtle"
            >
              Cancel
            </button>
          )}
          {step === 1 ? (
            <button
              type="button"
              disabled={parsedRows.length === 0}
              onClick={goToReview}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--brand-primary-dark)] disabled:opacity-50"
            >
              Review <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || selectedCount === 0}
              onClick={handleImport}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--brand-primary-dark)] disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {busy ? 'Importing…' : `Import ${selectedCount} lead${selectedCount !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      }
    >
      {/* Step indicator */}
      <div className="mb-4 flex items-center gap-2 text-xs text-ink-muted">
        <span className={cn('font-semibold', step === 1 ? 'text-brand-600' : 'text-ink-faint')}>1. Paste CSV</span>
        <ChevronRight className="h-3 w-3" />
        <span className={cn('font-semibold', step === 2 ? 'text-brand-600' : 'text-ink-faint')}>2. Review & Deduplicate</span>
      </div>

      {step === 1 ? (
        <PasteStep rowsText={rowsText} onChange={setRowsText} />
      ) : (
        <DedupeStep
          rows={parsedRows}
          existingEmails={existingEmails}
          selected={selected}
          onToggle={toggleRow}
        />
      )}
    </RightDrawer>
  )
}
