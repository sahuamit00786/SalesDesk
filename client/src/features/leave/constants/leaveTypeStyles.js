/** Badge colors aligned with leave type codes (reference calendar style). */
const BY_CODE = {
  CL: { bg: 'bg-teal-600', label: 'Casual Leave' },
  SL: { bg: 'bg-[#5B21B6]', label: 'Sick Leave' },
  EL: { bg: 'bg-emerald-600', label: 'Earned Leave' },
  UL: { bg: 'bg-rose-900', label: 'Unpaid Leave' },
  PTO: { bg: 'bg-green-600', label: 'Paid Time Off' },
}

export function getLeaveTypeStyle(leaveType) {
  const code = String(leaveType?.code || '').toUpperCase()
  if (BY_CODE[code]) return BY_CODE[code]
  const name = leaveType?.name || 'Leave'
  return { bg: 'bg-slate-600', label: name }
}

export const HOLIDAY_BADGE = { bg: 'bg-amber-600', label: 'Public Holiday' }
