import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, MailOpen, Menu, RefreshCcw } from '@/components/ui/icons'
import { cn } from '@/utils/cn'

export default function EmailListToolbar({
  allChecked, someChecked, onToggleAll,
  checkedCount, onBulkMarkRead, markingRead, showBulkMarkRead,
  onRefresh, refreshing,
  rangeLabel, onPrev, onNext, prevDisabled, nextDisabled,
  onOpenSidebar,
}) {
  const checkboxRef = useRef(null)
  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = !allChecked && someChecked
  }, [allChecked, someChecked])
  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-surface-border bg-white px-2 py-1.5 sm:px-3">
      <button type="button" onClick={onOpenSidebar} className="rounded-lg p-2 text-ink-muted hover:bg-surface-muted lg:hidden" aria-label="Open menu">
        <Menu size={16} />
      </button>
      <label className="flex cursor-pointer items-center justify-center rounded-lg p-2 hover:bg-surface-muted" title="Select all on page">
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={allChecked}
          onChange={onToggleAll}
          className="h-3.5 w-3.5 rounded border-slate-400 text-brand-700"
          aria-label="Select all conversations on this page"
        />
      </label>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="rounded-lg p-2 text-ink-muted hover:bg-surface-muted disabled:opacity-50"
        title="Refresh"
        aria-label="Refresh"
      >
        <RefreshCcw size={14} className={refreshing ? 'animate-spin' : ''} />
      </button>
      {checkedCount > 0 && showBulkMarkRead ? (
        <button
          type="button"
          onClick={onBulkMarkRead}
          disabled={markingRead}
          className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-white px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-surface-muted disabled:opacity-50"
        >
          <MailOpen size={13} />
          {markingRead ? 'Marking…' : `Mark ${checkedCount} read`}
        </button>
      ) : null}
      <div className="ml-auto flex items-center gap-0.5">
        {rangeLabel ? <span className="mr-1 text-xs tabular-nums text-ink-muted">{rangeLabel}</span> : null}
        <button type="button" onClick={onPrev} disabled={prevDisabled}
          className={cn('rounded-lg p-2 text-ink-muted hover:bg-surface-muted', prevDisabled && 'opacity-40 hover:bg-transparent')}
          aria-label="Newer page">
          <ChevronLeft size={16} />
        </button>
        <button type="button" onClick={onNext} disabled={nextDisabled}
          className={cn('rounded-lg p-2 text-ink-muted hover:bg-surface-muted', nextDisabled && 'opacity-40 hover:bg-transparent')}
          aria-label="Older page">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
