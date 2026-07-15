import { useRef } from 'react'
import { Filter, Search, X } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import { inputFieldClassName } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageFilterBar } from '@/components/layout/PageFilterBar'

/**
 * Single-row list toolbar inside PageFilterBar: search + filters (left), actions (right).
 */
export function ListSearchToolbar({
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search…',
  filterOpen = false,
  onFilterOpenChange,
  filterCount = 0,
  filterPanel = null,
  chips = [],
  onRemoveChip,
  onClearAll,
  actions = null,
  children = null,
  className,
}) {
  const filterBtnRef = useRef(null)

  const toggleFilters = () => {
    onFilterOpenChange?.(!filterOpen)
  }

  const chipRow =
    chips.length > 0 && filterCount > 0 ? (
      <>
        {chips.map((chip) => (
          <span
            key={chip.id}
            className="inline-flex items-center gap-1 rounded-full border border-surface-border bg-brand-50 px-2.5 py-0.5 text-xs text-ink"
          >
            {chip.label}
            {onRemoveChip ? (
              <button
                type="button"
                className="rounded p-0.5 hover:bg-brand-100"
                onClick={() => onRemoveChip(chip.id)}
                aria-label={`Remove ${chip.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </span>
        ))}
        {onClearAll ? (
          <button
            type="button"
            className="text-xs text-ink-muted hover:text-brand-700"
            onClick={onClearAll}
          >
            Clear all
          </button>
        ) : null}
      </>
    ) : null

  return (
    <PageFilterBar className={cn('relative border-0 shadow-none', className)} chips={chipRow}>
      <div className="relative min-w-[180px] flex-1 sm:min-w-[220px] sm:max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          className={cn(inputFieldClassName, 'w-full pl-9 pr-8')}
        />
        {search ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-faint hover:text-ink"
            onClick={() => onSearchChange?.('')}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {onFilterOpenChange ? (
        <button
          ref={filterBtnRef}
          type="button"
          onClick={toggleFilters}
          aria-expanded={filterOpen}
          aria-haspopup="dialog"
          className={cn(
            'inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors',
            filterOpen || filterCount > 0
              ? 'border-brand-300 bg-brand-50 text-brand-800'
              : 'border-surface-field bg-white text-ink hover:border-brand-700 hover:bg-brand-50/50',
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          {filterCount > 0 ? (
            <span className="rounded-full bg-[var(--brand-primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {filterCount}
            </span>
          ) : null}
        </button>
      ) : null}

      {children}

      {actions ? (
        <div className="ml-auto flex shrink-0 items-center gap-2 overflow-x-auto">{actions}</div>
      ) : null}

      {filterPanel && onFilterOpenChange ? (
        <Modal
          open={filterOpen}
          onClose={() => onFilterOpenChange(false)}
          title="Filter"
          maxWidthClassName="max-w-2xl"
        >
          {filterPanel}
        </Modal>
      ) : null}
    </PageFilterBar>
  )
}
