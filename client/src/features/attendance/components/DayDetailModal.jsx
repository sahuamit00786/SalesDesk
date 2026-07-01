import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Users, Pencil } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { SkeletonTable } from '@/components/shared/SkeletonLoader'
import { HrStatusPill } from '@/features/hr/components/HrStatusPill'
import { AttendanceEditModal } from '@/features/attendance/components/AttendanceEditModal'
import { useIsHrManagerOrAdmin } from '@/features/hr/useHrRole'
import { cn } from '@/utils/cn'

function formatTime(v) {
  if (!v) return '—'
  return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function initials(name) {
  if (!name) return '?'
  return name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

const SUMMARY_KEYS = [
  { key: 'present',  label: 'Present',  className: 'bg-emerald-50 text-emerald-800 border-emerald-100' },
  { key: 'absent',   label: 'Absent',   className: 'bg-rose-50 text-rose-800 border-rose-100' },
  { key: 'late',     label: 'Late',     className: 'bg-amber-50 text-amber-800 border-amber-100' },
  { key: 'half_day', label: 'Half day', className: 'bg-sky-50 text-sky-800 border-sky-100' },
  { key: 'on_leave', label: 'On leave', className: 'bg-slate-50 text-brand-800 border-violet-100' },
]

export function DayDetailModal({ open, onClose, date, rows = [], loading }) {
  const isHr = useIsHrManagerOrAdmin()
  const [editRow, setEditRow] = useState(null)

  const parsedDate = useMemo(() => {
    if (!date) return null
    try { return parseISO(String(date).slice(0, 10)) } catch { return null }
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
  const employeeSummary = loading ? 'Loading…' : `${rows.length} employee${rows.length === 1 ? '' : 's'}`

  return (
    <>
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
        maxWidthClassName="max-w-3xl"
      >
        {/* Status summary pills */}
        {!loading && rows.length > 0 && (
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
        )}

        {/* Content */}
        {loading ? (
          <SkeletonTable cols={5} rows={4} />
        ) : rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center text-sm text-gray-500">
            No attendance records for this day.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-surface-border">
            <table className="cx-table w-full">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Check in</th>
                  <th>Check out</th>
                  <th>Hours</th>
                  <th>Status</th>
                  {isHr && <th className="w-10" />}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.user?.id ?? row.logId}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                          {initials(row.user?.name)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-semibold text-ink">
                              {row.user?.name || 'Unknown'}
                            </p>
                            {row.editedByUserId && (
                              <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                                Edited
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[11px] text-ink-muted">
                            {row.user?.department || 'No department'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="tabular-nums text-sm">{formatTime(row.checkInTime)}</td>
                    <td className="tabular-nums text-sm">{formatTime(row.checkOutTime)}</td>
                    <td className="tabular-nums text-sm font-medium">
                      {row.totalHours != null ? `${Number(row.totalHours).toFixed(2)}h` : '—'}
                    </td>
                    <td>
                      <HrStatusPill status={row.status} kind="attendance" />
                    </td>
                    {isHr && (
                      <td className="align-middle">
                        {row.logId && (
                          <button
                            type="button"
                            onClick={() => setEditRow(row)}
                            className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-subtle hover:text-ink"
                            title="Edit record"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <AttendanceEditModal
        open={Boolean(editRow)}
        onClose={() => setEditRow(null)}
        row={editRow}
      />
    </>
  )
}
