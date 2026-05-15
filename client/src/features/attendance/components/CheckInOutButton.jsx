import { useState } from 'react'
import toast from 'react-hot-toast'
import { LogIn, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { AttendanceSessionClock } from '@/features/attendance/components/AttendanceSessionClock'
import {
  useCheckInMutation,
  useCheckOutMutation,
  useGetAttendanceTodayQuery,
} from '@/features/attendance/attendanceApi'

export function CheckInOutButton() {
  const { data, isLoading } = useGetAttendanceTodayQuery()
  const [checkIn, { isLoading: checkingIn }] = useCheckInMutation()
  const [checkOut, { isLoading: checkingOut }] = useCheckOutMutation()
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryText, setSummaryText] = useState('')

  const today = data?.data
  const checkedIn = Boolean(today?.checkedIn)
  const checkedOut = Boolean(today?.checkedOut)
  const busy = checkingIn || checkingOut || isLoading

  async function onCheckIn() {
    try {
      const res = await checkIn().unwrap()
      toast.success(`Checked in at ${res.data?.checkInLabel || 'now'}`)
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Check-in failed')
    }
  }

  async function onCheckOut() {
    try {
      const res = await checkOut().unwrap()
      setSummaryText(res.data?.summaryText || 'You checked out successfully.')
      setSummaryOpen(true)
      toast.success('Checked out')
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Check-out failed')
    }
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <AttendanceSessionClock
        checkInTime={today?.checkInTime}
        checkInLabel={today?.checkInLabel}
        checkedOut={checkedOut}
        totalHours={today?.totalHours}
      />
      {!checkedIn ? (
        <Button type="button" className="!h-9 shrink-0 gap-2 !px-3 !text-xs" disabled={busy} onClick={onCheckIn}>
          <LogIn className="h-4 w-4" />
          Check in
        </Button>
      ) : !checkedOut ? (
        <Button type="button" variant="secondary" className="!h-9 shrink-0 gap-2 !px-3 !text-xs" disabled={busy} onClick={onCheckOut}>
          <LogOut className="h-4 w-4" />
          Check out
        </Button>
      ) : (
        <span className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
          Done for today
        </span>
      )}
      <Modal open={summaryOpen} onClose={() => setSummaryOpen(false)} title="Check-out summary">
        <p className="text-sm text-ink">{summaryText}</p>
      </Modal>
    </div>
  )
}
