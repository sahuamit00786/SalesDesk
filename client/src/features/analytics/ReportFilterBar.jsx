import { useState } from 'react'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { PageFilterBar } from '@/components/layout/PageFilterBar'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { REPORT_PRESETS } from './useReportDateRange'
import { cn } from '@/utils/cn'

const VIEW_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
]

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i, 1).toLocaleString('default', { month: 'long' }),
}))

export function ReportFilterBar({
  filters,
  meta,
  teamUsers = [],
  statusOptions = [],
  stageOptions = [],
  sourceOptions = [],
  onExport,
  exportSlot,
  leading,
  className,
}) {
  const [rangeOpen, setRangeOpen] = useState(false)
  const showUser = meta?.filters?.includes('userId')
  const showStatus = meta?.filters?.includes('status')
  const showStage = meta?.filters?.includes('stage')
  const showSource = meta?.filters?.includes('source')
  const showView = meta?.filters?.includes('view')
  const showMonth = meta?.filters?.includes('month')
  const showYear = meta?.filters?.includes('year')

  const userOptions = [
    { value: '', label: 'All employees' },
    ...teamUsers.map((u) => ({ value: u.id, label: u.name || u.email || u.id })),
  ]

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = new Date().getFullYear() - i
    return { value: String(y), label: String(y) }
  })

  return (
    <PageFilterBar className={cn('justify-between border-[#F7F5FB] py-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {leading}
        <div className="relative">
          <Button
            type="button"
            variant="secondary"
            className="gap-2 px-3"
            onClick={() => setRangeOpen((p) => !p)}
            aria-expanded={rangeOpen}
            aria-haspopup="true"
          >
            <CalendarDays className="h-4 w-4 text-ink-muted" aria-hidden />
            {filters.rangeLabel}
            <ChevronDown className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
          </Button>
          {rangeOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setRangeOpen(false)} />
              <div className="absolute left-0 z-20 mt-1 w-64 rounded-xl border border-[#F7F5FB] bg-white py-1 shadow-lg">
                {REPORT_PRESETS.filter((r) => r.key !== 'custom').map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => { filters.setPresetKey(r.key); filters.setFilter('preset', r.key); setRangeOpen(false) }}
                    className={cn(
                      'flex w-full px-4 py-2 text-sm transition-colors hover:bg-surface-subtle',
                      filters.presetKey === r.key ? 'font-semibold text-ink' : 'text-ink-muted',
                    )}
                  >
                    {r.label}
                  </button>
                ))}
                <div className="border-t border-[#F0EEF7] px-3 pb-1 pt-2">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Custom range</p>
                  <div className="space-y-2">
                    <label className="block">
                      <span className="text-[11px] text-ink-muted">From</span>
                      <input
                        type="date"
                        value={filters.customFrom}
                        onChange={(e) => {
                          filters.setCustomFrom(e.target.value)
                          filters.setPresetKey('custom')
                          filters.setFilter('preset', 'custom')
                          filters.setFilter('from', e.target.value)
                        }}
                        className="mt-0.5 h-8 w-full rounded-lg border border-[#F7F5FB] px-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-ink-muted">To</span>
                      <input
                        type="date"
                        value={filters.customTo}
                        onChange={(e) => {
                          filters.setCustomTo(e.target.value)
                          filters.setPresetKey('custom')
                          filters.setFilter('preset', 'custom')
                          filters.setFilter('to', e.target.value)
                        }}
                        className="mt-0.5 h-8 w-full rounded-lg border border-[#F7F5FB] px-2 text-sm"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {showUser && (
          <Select value={filters.userId} onChange={(e) => filters.setFilter('userId', e.target.value)} className="h-10 w-44 shrink-0">
            {userOptions.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
          </Select>
        )}
        {showStatus && statusOptions.length > 0 && (
          <Select value={filters.status} onChange={(e) => filters.setFilter('status', e.target.value)} className="h-10 w-36 shrink-0">
            <option value="">All statuses</option>
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        )}
        {showStage && stageOptions.length > 0 && (
          <Select value={filters.stage} onChange={(e) => filters.setFilter('stage', e.target.value)} className="h-10 w-40 shrink-0">
            <option value="">All stages</option>
            {stageOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        )}
        {showSource && sourceOptions.length > 0 && (
          <Select value={filters.source} onChange={(e) => filters.setFilter('source', e.target.value)} className="h-10 w-36 shrink-0">
            <option value="">All sources</option>
            {sourceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        )}
        {showView && (
          <Select value={filters.view} onChange={(e) => filters.setFilter('view', e.target.value)} className="h-10 w-32 shrink-0">
            {VIEW_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        )}
        {showMonth && (
          <Select value={filters.month || String(new Date().getMonth() + 1)} onChange={(e) => filters.setFilter('month', e.target.value)} className="h-10 w-32 shrink-0">
            {MONTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        )}
        {showYear && (
          <Select value={filters.year || String(new Date().getFullYear())} onChange={(e) => filters.setFilter('year', e.target.value)} className="h-10 w-28 shrink-0">
            {yearOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        )}

        <label className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-[#F7F5FB] px-3 text-sm text-ink-muted whitespace-nowrap">
          <input
            type="checkbox"
            checked={filters.comparePrevious}
            onChange={(e) => filters.setFilter('comparePrevious', e.target.checked ? 'true' : '')}
            className="rounded border-[#F7F5FB] text-brand-600"
          />
          vs prior period
        </label>
      </div>

      {exportSlot || (onExport ? (
        <Button type="button" variant="secondary" onClick={onExport}>
          Export
        </Button>
      ) : null)}
    </PageFilterBar>
  )
}
