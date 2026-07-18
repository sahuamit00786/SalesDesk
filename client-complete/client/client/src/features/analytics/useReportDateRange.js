import { useMemo, useState } from 'react'

export const REPORT_PRESETS = [
  { key: 'week', label: 'This Week', days: 7 },
  { key: 'month', label: 'This Month', days: 30 },
  { key: 'quarter', label: 'This Quarter', days: 90 },
  { key: 'year', label: 'This Year', days: 365 },
  { key: 'custom', label: 'Custom range', days: null },
]

export function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

export function computeDateRange(presetKey, customFrom, customTo) {
  if (presetKey === 'custom') {
    const now = new Date()
    return {
      from: customFrom || isoDate(new Date(now.getTime() - 30 * 86400000)),
      to: customTo || isoDate(now),
    }
  }
  const preset = REPORT_PRESETS.find((r) => r.key === presetKey) || REPORT_PRESETS[1]
  const now = new Date()
  const toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  return {
    from: isoDate(new Date(now.getTime() - preset.days * 86400000)),
    to: isoDate(toDate),
  }
}

export function useReportDateRange(initialPreset = 'month', initialFrom = '', initialTo = '') {
  const [presetKey, setPresetKey] = useState(initialPreset)
  const [customFrom, setCustomFrom] = useState(initialFrom)
  const [customTo, setCustomTo] = useState(initialTo)

  const { from, to } = useMemo(
    () => computeDateRange(presetKey, customFrom, customTo),
    [presetKey, customFrom, customTo],
  )

  const rangeLabel = presetKey === 'custom'
    ? `${customFrom || '—'} → ${customTo || '—'}`
    : REPORT_PRESETS.find((r) => r.key === presetKey)?.label || 'This Month'

  return {
    presetKey,
    setPresetKey,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    from,
    to,
    rangeLabel,
  }
}
