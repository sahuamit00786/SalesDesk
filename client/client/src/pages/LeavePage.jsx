import { useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { LeaveBalanceCard } from '@/features/leave/components/LeaveBalanceCard'
import { LeaveCalendarWorkspace } from '@/features/leave/components/LeaveCalendarWorkspace'
import { PendingLeaveBanner } from '@/features/leave/components/PendingLeaveBanner'
import {
  useGetLeaveCalendarQuery,
  useGetMyLeaveBalanceQuery,
  useGetMyLeavesQuery,
  useGetPublicHolidaysQuery,
} from '@/features/leave/leaveApi'

export function LeavePage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data: balanceData, refetch: refetchBalance } = useGetMyLeaveBalanceQuery(year)
  const { data: leavesData, refetch: refetchLeaves } = useGetMyLeavesQuery()
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const to = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
  const { data: calData, refetch: refetchCalendar } = useGetLeaveCalendarQuery({ from, to })
  const { data: holidayData, refetch: refetchHolidays } = useGetPublicHolidaysQuery(year)

  const balances = balanceData?.data || []
  const myLeaves = leavesData?.data || []
  const teamLeaves = calData?.data || []
  const holidays = holidayData?.data || []

  function onCalendarApplied() {
    refetchLeaves()
    refetchBalance()
    refetchCalendar()
    refetchHolidays()
  }

  return (
    <PageShell fullWidth>
      <div>
        <div className="space-y-4 px-2 py-2">
          <PendingLeaveBanner />
          <LeaveBalanceCard balances={balances} year={year} />
        </div>

        <div className="px-2">
          <LeaveCalendarWorkspace
            className="h-[700px]"
            myLeaves={myLeaves}
            teamLeaves={teamLeaves}
            holidays={holidays}
            syncPeriod={{ year, month }}
            onPeriodChange={(y, m) => {
              setYear(y)
              setMonth(m)
            }}
            onApplied={onCalendarApplied}
          />
        </div>
      </div>
    </PageShell>
  )
}
