import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useReportDateRange } from './useReportDateRange'

export function useReportFilters(defaultPreset = 'month') {
  const [searchParams, setSearchParams] = useSearchParams()

  const dateRange = useReportDateRange(
    searchParams.get('preset') || defaultPreset,
    searchParams.get('from') || '',
    searchParams.get('to') || '',
  )

  const userId = searchParams.get('userId') || ''
  const status = searchParams.get('status') || ''
  const stage = searchParams.get('stage') || ''
  const source = searchParams.get('source') || ''
  const view = searchParams.get('view') || 'all'
  const month = searchParams.get('month') || ''
  const year = searchParams.get('year') || ''
  const comparePrevious = searchParams.get('comparePrevious') === 'true'

  const setFilter = useCallback((key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (!value || value === 'all') next.delete(key)
      else next.set(key, value)
      return next
    }, { replace: true })
  }, [setSearchParams])

  const queryParams = useMemo(() => {
    const p = {
      from: dateRange.from,
      to: dateRange.to,
      comparePrevious: comparePrevious ? 'true' : undefined,
    }
    if (userId) p.userId = userId
    if (status) p.status = status
    if (stage) p.stage = stage
    if (source) p.source = source
    if (view && view !== 'all') p.view = view
    if (month) p.month = month
    if (year) p.year = year
    return p
  }, [dateRange.from, dateRange.to, userId, status, stage, source, view, month, year, comparePrevious])

  return {
    ...dateRange,
    userId,
    status,
    stage,
    source,
    view,
    month,
    year,
    comparePrevious,
    setFilter,
    queryParams,
  }
}
