import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { controlClassName } from '@/components/ui/fieldTokens'
import { cn } from '@/utils/cn'

/**
 * Searchable dropdown with optional flag emoji per option.
 * @param {{ value: string, label: string, flag?: string, meta?: string }[]} options
 */
export function FlagSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyLabel = 'No matches',
  className,
  id,
  'aria-label': ariaLabel,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const listRef = useRef(null)

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        (o.meta && o.meta.toLowerCase().includes(q)),
    )
  }, [options, query])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (open && listRef.current && selected) {
      const el = listRef.current.querySelector(`[data-value="${selected.value}"]`)
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [open, selected])

  function pick(next) {
    onChange(next)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className={cn('relative max-w-xl', className)}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          controlClassName,
          'h-11 !w-full cursor-pointer text-left',
          'flex items-center justify-between gap-2',
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
          {selected ? (
            <>
              {selected.flag ? (
                <span className="shrink-0 text-lg leading-none" aria-hidden>
                  {selected.flag}
                </span>
              ) : null}
              <span className="truncate font-medium">{selected.label}</span>
              {selected.meta ? (
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  {selected.meta}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-ink-faint">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={cn('shrink-0 text-ink-faint transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-brand-200/70 bg-white shadow-lg shadow-brand-900/10">
          <div className="border-b border-brand-100/80 p-2">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 pl-8 text-sm"
                autoFocus
                aria-label={searchPlaceholder}
              />
            </div>
          </div>
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-64 overflow-y-auto py-1"
            aria-label={ariaLabel}
          >
            {filtered.map((opt) => {
              const active = opt.value === value
              return (
                <li key={opt.value} role="option" aria-selected={active} data-value={opt.value}>
                  <button
                    type="button"
                    onClick={() => pick(opt.value)}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors',
                      active ? 'bg-brand-50 text-ink' : 'text-ink-muted hover:bg-brand-50/50 hover:text-ink',
                    )}
                  >
                    {opt.flag ? (
                      <span className="shrink-0 text-lg leading-none" aria-hidden>
                        {opt.flag}
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate font-medium">{opt.label}</span>
                    {opt.meta ? (
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                        {opt.meta}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-ink-muted">{emptyLabel}</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
