/** Attendance & leave status pill styles (shared across HR module). */
export const ATTENDANCE_STATUS_STYLES = {
  present: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
  absent: 'bg-rose-50 text-rose-800 border-rose-200/80',
  late: 'bg-amber-50 text-amber-800 border-amber-200/80',
  half_day: 'bg-sky-50 text-sky-800 border-sky-200/80',
  on_leave: 'bg-slate-50 text-brand-800 border-brand-200/80',
}

export const LEAVE_STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200/80',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200/80',
  cancelled: 'bg-slate-50 text-slate-600 border-slate-200/80',
}

export const ATTENDANCE_CELL_STYLES = {
  present: 'border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-white text-emerald-900',
  absent: 'border-rose-200/90 bg-gradient-to-br from-rose-50 to-white text-rose-900',
  late: 'border-amber-200/90 bg-gradient-to-br from-amber-50 to-white text-amber-900',
  half_day: 'border-sky-200/90 bg-gradient-to-br from-sky-50 to-white text-sky-900',
  on_leave: 'border-brand-200/90 bg-gradient-to-br from-violet-50 to-white text-brand-900',
}

export function formatStatusLabel(status) {
  if (!status) return '—'
  return String(status).replace(/_/g, ' ')
}
