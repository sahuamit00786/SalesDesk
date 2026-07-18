import { useEffect, useRef, useState } from 'react'
import { Search, X } from '@/components/ui/icons'
import { useGetLeadsQuery } from '@/features/leads/leadsApi'

/**
 * Debounced search input that searches leads and shows a dropdown.
 * @param {{ onSelect: (lead: object) => void, placeholder?: string, className?: string }} props
 */
export function LeadSearchInput({ onSelect, placeholder = 'Search for a lead...', className = '' }) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const containerRef = useRef(null)
  const timerRef = useRef(null)

  // Debounce the query
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  const { data, isFetching } = useGetLeadsQuery(
    { search: debouncedQuery, limit: 10 },
    { skip: !debouncedQuery || debouncedQuery.length < 2 },
  )

  const leads = Array.isArray(data?.data) ? data.data : []

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(lead) {
    setSelected(lead)
    setQuery(lead.title || lead.contactName || lead.email || lead.id)
    setOpen(false)
    onSelect?.(lead)
  }

  function handleClear() {
    setSelected(null)
    setQuery('')
    setDebouncedQuery('')
    onSelect?.(null)
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          type="text"
          className="h-10 w-full rounded-xl border border-surface-border bg-white pl-9 pr-8 text-sm text-ink outline-none focus:border-brand-500 placeholder:text-ink-faint"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (!e.target.value) setSelected(null)
          }}
          onFocus={() => {
            if (query.length >= 2) setOpen(true)
          }}
        />
        {query ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-faint hover:text-ink"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {open && debouncedQuery.length >= 2 ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-surface-border bg-white shadow-lg">
          {isFetching ? (
            <div className="px-4 py-3 text-sm text-ink-muted">Searching...</div>
          ) : leads.length === 0 ? (
            <div className="px-4 py-3 text-sm text-ink-muted">No leads found</div>
          ) : (
            leads.map((lead) => {
              const name = lead.title || lead.contactName || 'Untitled'
              const email = lead.email || ''
              const company = lead.company || ''
              return (
                <button
                  key={lead.id}
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-surface-subtle"
                  onClick={() => handleSelect(lead)}
                >
                  <span className="text-sm font-medium text-ink">{name}</span>
                  <span className="text-xs text-ink-muted">
                    {[email, company].filter(Boolean).join(' · ')}
                  </span>
                </button>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}

export default LeadSearchInput
