import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Clock, Users } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Loader } from '@/components/shared/Loader'
import { HrStatusPill } from '@/features/hr/components/HrStatusPill'
import { cn } from '@/utils/cn'

function formatTime(v) {
  if (!v) return '—'
  return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function initials(name) {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const SUMMARY_KEYS = [
  { key: 'present', label: 'Present', className: 'bg-emerald-50 text-emerald-800 border-emerald-100' },
  { key: 'absent', label: 'Absent', className: 'bg-rose-50 text-rose-800 border-rose-100' },
  { key: 'late', label: 'Late', className: 'bg-amber-50 text-amber-800 border-amber-100' },
  { key: 'half_day', label: 'Half day', className: 'bg-sky-50 text-sky-800 border-sky-100' },
  { key: 'on_leave', label: 'On leave', className: 'bg-violet-50 text-violet-800 border-violet-100' },
]

export function DayDetailModal({ open, onClose, date, rows = [], loading }) {
  const parsedDate = useMemo(() => {
    if (!date) return null
    try {
      return parseISO(String(date).slice(0, 10))
    } catch {
      return null
    }
  }, [date])

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0 }
    for (const row of rows) {
      const k = String(row.status || '').toLowerCase()
      if (k in c) c[k] += 1
    }
    return c
  }, [rows])

  const modalTitle = parsedDate ? format(parsedDate, 'EEEE, d MMMM yyyy') : 'Team attendance'
  const employeeSummary = loading
    ? 'Loading…'
    : `${rows.length} employee${rows.length === 1 ? '' : 's'}`

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={modalTitle}
      description={
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-4 w-4 shrink-0" aria-hidden />
          {employeeSummary}
        </span>
      }
      maxWidthClassName="max-w-2xl"
    >
      {!loading && rows.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {SUMMARY_KEYS.map((item) =>
            counts[item.key] > 0 ? (
              <span
                key={item.key}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
                  item.className,
                )}
              >
                <span className="tabular-nums">{counts[item.key]}</span>
                {item.label}
              </span>
            ) : null,
          )}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-14">
          <Loader />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center text-sm text-gray-500">
          No attendance records for this day.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.user?.id}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-colors hover:border-indigo-100 hover:bg-indigo-50/20"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                {initials(row.user?.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-900">{row.user?.name || 'Unknown'}</p>
                <p className="truncate text-xs text-gray-500">{row.user?.department || 'No department'}</p>
              </div>
              <div className="hidden shrink-0 text-right text-xs text-gray-500 sm:block">
                <p className="flex items-center justify-end gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {formatTime(row.checkInTime)} – {formatTime(row.checkOutTime)}
                </p>
                <p className="mt-0.5 tabular-nums font-medium text-gray-700">
                  {row.totalHours != null ? `${Number(row.totalHours).toFixed(2)} h` : '—'}
                </p>
              </div>
              <HrStatusPill status={row.status} kind="attendance" />
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
