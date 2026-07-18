import { useCallback } from 'react'
import { useAppSelector } from '@/app/hooks'
import { selectActiveWorkspace, selectEffectiveCurrency } from '@/features/workspace/workspaceSlice'
import { getEffectiveCurrency } from '@/utils/money'
import { formatChartCurrency } from '@/features/dashboard/dummyDashboardData'

export function useEffectiveCurrency(campaign) {
  const company = useAppSelector((s) => s.auth.user?.company)
  const workspace = useAppSelector(selectActiveWorkspace)
  const fallback = useAppSelector(selectEffectiveCurrency)
  if (campaign?.currency) return getEffectiveCurrency({ campaign, workspace, company })
  return fallback
}

export function useFormatChartCurrency() {
  const currency = useEffectiveCurrency()
  return useCallback((n) => formatChartCurrency(n, currency), [currency])
}
