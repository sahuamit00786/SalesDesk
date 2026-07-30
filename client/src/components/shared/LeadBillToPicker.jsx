import { useEffect, useRef, useState } from 'react'
import { X } from '@/components/ui/icons'
import { useGetLeadsQuery } from '@/features/leads/leadsApi'

/**
 * Search-driven replacement for a `<select>` populated from a capped lead list.
 *
 * BUG FIX (§15.2 of the bug audit) — `useGetLeadsQuery({ page: 1, limit: 400 })` (and
 * the near-identical `limit: 300` in the email composer) silently truncated the lead
 * dropdown: past the cap, the lead you wanted simply wasn't in the list, with no
 * search and no indication why. This queries the server as you type instead, so any
 * lead is reachable.
 *
 * Controlled by `selectedLead` (the full lead object, not just an id) — the parent
 * owns the id and resolves the full lead via `useGetLeadQuery` so this component
 * never needs its own notion of "the current selection," only what to show when it
 * isn't actively being edited.
 */
export function LeadBillToPicker({
  selectedLead,
  onSelect,
  disabled = false,
  inputClassName = '',
  placeholder = 'Search for a lead…',
  /** Optional client-side filter over search results, e.g. `(l) => Boolean(l.email)`. */
  filterResults = null,
}) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebouncedQuery(query), 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  const { data, isFetching } = useGetLeadsQuery(
    { search: debouncedQuery, limit: 20 },
    { skip: !open || debouncedQuery.trim().length < 2 },
  )
  const rawResults = Array.isArray(data?.data) ? data.data : []
  const results = filterResults ? rawResults.filter(filterResults) : rawResults

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function label(lead) {
    return `${(lead.contactName || lead.title || 'Lead').trim()} · ${(lead.company || '').trim() || '—'}`
  }

  const displayValue = open ? query : selectedLead ? label(selectedLead) : ''

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        className={inputClassName || 'mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm'}
        placeholder={placeholder}
        disabled={disabled}
        value={displayValue}
        onFocus={() => {
          if (disabled) return
          setOpen(true)
          setQuery('')
        }}
        onChange={(e) => setQuery(e.target.value)}
      />
      {selectedLead && !open && !disabled ? (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-neutral-400 hover:text-neutral-600"
          onClick={() => onSelect(null)}
          aria-label="Clear selected lead"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
          {debouncedQuery.trim().length < 2 ? (
            <div className="px-3 py-2 text-xs text-neutral-400">Type at least 2 characters…</div>
          ) : isFetching ? (
            <div className="px-3 py-2 text-xs text-neutral-400">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-neutral-400">No leads found</div>
          ) : (
            results.map((l) => (
              <button
                key={l.id}
                type="button"
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-neutral-50"
                onClick={() => {
                  onSelect(l)
                  setOpen(false)
                  setQuery('')
                }}
              >
                <span className="font-medium text-neutral-800">{(l.contactName || l.title || 'Lead').trim()}</span>
                <span className="text-xs text-neutral-500">
                  {(l.company || '').trim() || '—'}
                  {l.email ? ` · ${l.email}` : ''}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

export default LeadBillToPicker
