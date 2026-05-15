import { useEffect, useState } from 'react'

function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function useElapsedMs(isoStart, active) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!isoStart || !active) {
      setElapsed(0)
      return undefined
    }
    const start = new Date(isoStart).getTime()
    const tick = () => setElapsed(Math.max(0, Date.now() - start))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isoStart, active])

  return elapsed
}

/** Elapsed session timer + recorded check-in time (not a live wall clock). */
export function AttendanceSessionClock({ checkInTime, checkInLabel, checkedOut, totalHours }) {
  const elapsed = useElapsedMs(checkInTime, Boolean(checkInTime) && !checkedOut)

  if (!checkInTime) return null

  return (
    <div className="flex min-w-0 flex-col items-end gap-0.5">
      {!checkedOut ? (
        <p className="font-mono text-sm font-semibold tabular-nums text-brand-700">{formatElapsed(elapsed)}</p>
      ) : totalHours != null ? (
        <p className="font-mono text-sm font-semibold tabular-nums text-ink">{Number(totalHours).toFixed(1)}h today</p>
      ) : null}
      {checkInLabel ? (
        <p className="text-[10px] font-medium text-ink-muted">Checked in at {checkInLabel}</p>
      ) : null}
    </div>
  )
}
