import { useMemo } from 'react'
import { getDaysInMonth, startOfMonth, format } from 'date-fns'
import { cn } from '@/utils/cn'

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function fmtTime(v) {
  if (!v) return null
  return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtHours(h) {
  if (h == null || h <= 0) return null
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}

const STATUS = {
  present:  { cell: 'bg-emerald-50 border-emerald-200',  badge: 'bg-emerald-100 text-emerald-800',  label: 'Present' },
  late:     { cell: 'bg-amber-50 border-amber-200',      badge: 'bg-amber-100 text-amber-800',      label: 'Late' },
  absent:   { cell: 'bg-rose-100 border-rose-300',       badge: 'bg-rose-200 text-rose-900',        label: 'Absent' },
  half_day: { cell: 'bg-sky-50 border-sky-200',          badge: 'bg-sky-100 text-sky-800',          label: 'Half day' },
  on_leave: { cell: 'bg-slate-50 border-brand-200',    badge: 'bg-slate-100 text-brand-800',    label: 'On leave' },
}

const LEGEND = [
  { status: 'present',  label: 'Present',   dot: 'bg-emerald-400' },
  { status: 'late',     label: 'Late',      dot: 'bg-amber-400' },
  { status: 'absent',   label: 'Absent',    dot: 'bg-rose-400' },
  { status: 'half_day', label: 'Half day',  dot: 'bg-sky-400' },
  { status: 'on_leave', label: 'On leave',  dot: 'bg-violet-400' },
]

export function AttendanceUserCalendar({ logs = [], year, month, userName }) {
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const logByDate = useMemo(() => {
    const m = {}
    for (const log of logs) m[String(log.date).slice(0, 10)] = log
    return m
  }, [logs])

  const cells = useMemo(() => {
    const daysInMonth = getDaysInMonth(new Date(year, month - 1))
    const firstDow = startOfMonth(new Date(year, month - 1)).getDay()
    const result = []
    for (let i = 0; i < firstDow; i++) result.push({ empty: true, key: `pad-${i}` })
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dow = new Date(year, month - 1, d).getDay()
      result.push({
        day: d,
        dateStr,
        log: logByDate[dateStr],
        isFuture: dateStr > todayStr,
        isToday: dateStr === todayStr,
        isWeekend: dow === 0 || dow === 6,
      })
    }
    return result
  }, [year, month, logByDate, todayStr])

  return (
    <div className="rounded-xl border border-surface-border bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-ink">
            {userName || 'Team Member'}
          </p>
          <p className="text-xs text-ink-muted">{MONTH_NAMES[month - 1]} {year}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {LEGEND.map((l) => (
            <span key={l.status} className="flex items-center gap-1.5 text-[11px] text-ink-muted">
              <span className={cn('h-2.5 w-2.5 rounded-full', l.dot)} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="py-1 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          if (cell.empty) return <div key={cell.key} className="min-h-[92px]" />
          const { day, dateStr, log, isFuture, isToday, isWeekend } = cell
          const status = log?.status
          const s = status ? STATUS[status] : null
          const checkIn = fmtTime(log?.checkInTime)
          const checkOut = fmtTime(log?.checkOutTime)
          const hours = fmtHours(log?.totalHours != null ? Number(log.totalHours) : null)

          return (
            <div
              key={dateStr}
              className={cn(
                'relative flex min-h-[92px] flex-col rounded-lg border p-1.5 text-xs',
                isFuture
                  ? 'border-surface-border bg-gray-50/60'
                  : s
                    ? s.cell
                    : isWeekend
                      ? 'border-surface-border bg-gray-50'
                      : 'border-surface-border bg-white',
                isToday && 'ring-2 ring-brand-400 ring-offset-1',
              )}
            >
              <span className={cn(
                'text-[11px] font-bold leading-none',
                isToday ? 'text-brand-600' : isFuture ? 'text-ink-faint' : 'text-ink',
              )}>
                {day}
              </span>

              {s ? (
                <span className={cn(
                  'mt-1.5 self-start rounded px-1 py-0.5 text-[10px] font-semibold leading-tight',
                  s.badge,
                )}>
                  {s.label}
                </span>
              ) : !isFuture && isWeekend ? (
                <span className="mt-1 text-[10px] leading-tight text-ink-faint">Weekend</span>
              ) : null}

              {(checkIn || checkOut || hours) && (
                <div className="mt-auto space-y-0.5 pt-1">
                  {checkIn && (
                    <div className="flex items-center gap-0.5 truncate text-[10px] text-ink-muted">
                      <span className="opacity-60">In</span>
                      <span className="font-medium text-ink">{checkIn}</span>
                    </div>
                  )}
                  {checkOut && (
                    <div className="flex items-center gap-0.5 truncate text-[10px] text-ink-muted">
                      <span className="opacity-60">Out</span>
                      <span className="font-medium text-ink">{checkOut}</span>
                    </div>
                  )}
                  {hours && (
                    <div className="truncate text-[10px] font-semibold text-ink-muted">
                      {hours}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
