import { Select } from '@/components/ui/Select'
import { cn } from '@/utils/cn'

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7d', label: 'Last 7 days' },
  { value: 'last30d', label: 'Last 30 days' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'last6m', label: 'Last 6 months' },
  { value: 'custom', label: 'Custom range' },
]

const CALL_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'inbound', label: 'Incoming' },
  { value: 'outbound', label: 'Outgoing' },
  { value: 'missed', label: 'Missed' },
]

const HAS_LEAD_OPTIONS = [
  { value: '', label: 'All calls' },
  { value: 'true', label: 'With lead' },
  { value: 'false', label: 'No lead' },
]

const OUTCOME_OPTIONS = [
  { value: '', label: 'All outcomes' },
  { value: 'connected', label: 'Connected' },
  { value: 'no_answer', label: 'No answer' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'followup_needed', label: 'Follow-up needed' },
]

const DURATION_PRESET_OPTIONS = [
  { value: '', label: 'Any duration', min: null, max: null },
  { value: '0-60', label: '< 1 min', min: 0, max: 60 },
  { value: '60-300', label: '1-5 min', min: 60, max: 300 },
  { value: '300-900', label: '5-15 min', min: 300, max: 900 },
  { value: '900-', label: '15+ min', min: 900, max: null },
]

function durationPresetValue(min, max) {
  const match = DURATION_PRESET_OPTIONS.find((p) => p.min === min && p.max === max)
  return match ? match.value : ''
}

const inputClassName = 'h-10 rounded-lg border border-surface-border px-2 text-sm text-ink'

export function MoreFiltersMenu({
  dateRange,
  customDateStart,
  customDateEnd,
  callType,
  hasLead,
  outcome,
  durationMin,
  durationMax,
  sortBy,
  sortOrder,
  activeFilterCount,
  onDateRangeChange,
  onCallTypeChange,
  onHasLeadChange,
  onOutcomeChange,
  onDurationChange,
  onSortChange,
  onClearAll,
}) {
  function handleDatePreset(presetValue) {
    if (presetValue === 'custom') {
      onDateRangeChange({ preset: 'custom', customStart: customDateStart, customEnd: customDateEnd })
      return
    }
    onDateRangeChange({ preset: presetValue, customStart: '', customEnd: '' })
  }

  function handleDurationPreset(value) {
    const preset = DURATION_PRESET_OPTIONS.find((p) => p.value === value)
    onDurationChange({ min: preset?.min ?? null, max: preset?.max ?? null })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={dateRange}
        onChange={(e) => handleDatePreset(e.target.value)}
        className="h-10 w-40 shrink-0"
        aria-label="Date range"
      >
        {DATE_PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </Select>

      {dateRange === 'custom' && (
        <>
          <input
            type="date"
            value={customDateStart}
            onChange={(e) => onDateRangeChange({ preset: 'custom', customStart: e.target.value, customEnd: customDateEnd })}
            className={cn(inputClassName, 'w-36 shrink-0')}
            aria-label="Custom range start"
          />
          <input
            type="date"
            value={customDateEnd}
            onChange={(e) => onDateRangeChange({ preset: 'custom', customStart: customDateStart, customEnd: e.target.value })}
            className={cn(inputClassName, 'w-36 shrink-0')}
            aria-label="Custom range end"
          />
        </>
      )}

      <Select
        value={callType}
        onChange={(e) => onCallTypeChange(e.target.value)}
        className="h-10 w-32 shrink-0"
        aria-label="Call type"
      >
        {CALL_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>

      <Select
        value={hasLead}
        onChange={(e) => onHasLeadChange(e.target.value)}
        className="h-10 w-32 shrink-0"
        aria-label="Lead association"
      >
        {HAS_LEAD_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>

      <Select
        value={outcome}
        disabled={callType === 'missed'}
        onChange={(e) => onOutcomeChange(e.target.value)}
        className="h-10 w-36 shrink-0"
        aria-label="Outcome"
        title={callType === 'missed' ? 'Locked to "No answer" while type is Missed' : undefined}
      >
        {OUTCOME_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>

      <Select
        value={durationPresetValue(durationMin, durationMax)}
        onChange={(e) => handleDurationPreset(e.target.value)}
        className="h-10 w-32 shrink-0"
        aria-label="Duration"
      >
        {DURATION_PRESET_OPTIONS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </Select>

      <Select
        value={sortBy}
        onChange={(e) => onSortChange({ sortBy: e.target.value, sortOrder })}
        className="h-10 w-28 shrink-0"
        aria-label="Sort by"
      >
        <option value="date">Date</option>
        <option value="duration">Duration</option>
      </Select>

      <Select
        value={sortOrder}
        onChange={(e) => onSortChange({ sortBy, sortOrder: e.target.value })}
        className="h-10 w-32 shrink-0"
        aria-label="Sort order"
      >
        <option value="desc">{sortBy === 'date' ? 'Newest first' : 'Longest first'}</option>
        <option value="asc">{sortBy === 'date' ? 'Oldest first' : 'Shortest first'}</option>
      </Select>

      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="h-10 shrink-0 whitespace-nowrap rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
