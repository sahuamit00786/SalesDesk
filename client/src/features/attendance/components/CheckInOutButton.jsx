import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { LogIn, LogOut, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import {
  useCheckInMutation,
  useCheckOutMutation,
  useGetAttendanceTodayQuery,
} from '@/features/attendance/attendanceApi'

function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatTime(v) {
  if (!v) return '—'
  return new Date(v).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatHours(h) {
  const hrs = Math.floor(h)
  const min = Math.round((h - hrs) * 60)
  return `${hrs}h ${min}m`
}

function SessionTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startTime) return
    const start = new Date(startTime).getTime()
    const tick = () => setElapsed(Math.max(0, Date.now() - start))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startTime])
  return (
    <span className="font-mono text-sm font-semibold tabular-nums text-brand-700">
      {formatElapsed(elapsed)}
    </span>
  )
}

export function CheckInOutButton() {
  const { data, isLoading } = useGetAttendanceTodayQuery()
  const [checkIn, { isLoading: checkingIn }] = useCheckInMutation()
  const [checkOut, { isLoading: checkingOut }] = useCheckOutMutation()
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryText, setSummaryText] = useState('')

  const today = data?.data
  const hasOpenSession = Boolean(today?.hasOpenSession)
  const openSession = today?.openSession || null
  const sessions = today?.sessions || []
  const completedSessions = sessions.filter((s) => s.checkOutTime)
  const totalHours = today?.totalHours ?? 0
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
      <div className="flex min-w-0 flex-col items-end gap-0.5">
        {hasOpenSession && openSession ? (
          <>
            <SessionTimer startTime={openSession.checkInTime} />
            <p className="text-[10px] font-medium text-ink-muted">
              In since {formatTime(openSession.checkInTime)}
            </p>
          </>
        ) : totalHours > 0 ? (
          <>
            <p className="font-mono text-sm font-semibold tabular-nums text-ink">
              {formatHours(totalHours)}
            </p>
            <p className="text-[10px] font-medium text-ink-muted">total today</p>
          </>
        ) : null}
      </div>

      {hasOpenSession ? (
        <Button
          type="button"
          variant="secondary"
          className="!h-9 shrink-0 gap-2 !px-3 !text-xs"
          disabled={busy}
          onClick={onCheckOut}
        >
          <LogOut className="h-4 w-4" />
          Check out
        </Button>
      ) : (
        <Button
          type="button"
          className="!h-9 shrink-0 gap-2 !px-3 !text-xs"
          disabled={busy}
          onClick={onCheckIn}
        >
          <LogIn className="h-4 w-4" />
          Check in
        </Button>
      )}

      <Modal open={summaryOpen} onClose={() => setSummaryOpen(false)} title="Check-out summary">
        <p className="mb-4 text-sm text-ink">{summaryText}</p>
        {completedSessions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Sessions today
            </p>
            {completedSessions.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs"
              >
                <span className="flex items-center gap-1.5 text-gray-600">
                  <Clock className="h-3.5 w-3.5" />
                  Session {i + 1}: {formatTime(s.checkInTime)} – {formatTime(s.checkOutTime)}
                </span>
                <span className="font-medium tabular-nums text-gray-800">
                  {formatHours(Number(s.durationHours || 0))}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
