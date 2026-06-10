import { addDays, format } from 'date-fns'
import { formatStatusLabel } from '@/features/hr/constants/statusStyles'
import { getLeaveTypeStyle, HOLIDAY_BADGE } from '@/features/leave/constants/leaveTypeStyles'

const ATTENDANCE_COLORS = {
  present: '#10b981',
  absent: '#f43f5e',
  late: '#f59e0b',
  half_day: '#0ea5e9',
  on_leave: '#8b5cf6',
}

const TEAM_STAT_LABELS = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'Half day',
  on_leave: 'On leave',
}

/** react-big-calendar all-day range: start at midnight, end exclusive next midnight. */
export function dateKeyToRange(dateKey) {
  const [y, m, d] = String(dateKey).slice(0, 10).split('-').map(Number)
  const start = new Date(y, m - 1, d, 0, 0, 0, 0)
  const end = addDays(start, 1)
  return { start, end }
}

export function parseDateKey(dateKey) {
  const [y, m, d] = String(dateKey).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

function formatCheckIn(v) {
  if (!v) return ''
  return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function personalAttendanceToEvents(logs = []) {
  return logs.map((log) => {
    const key = String(log.date).slice(0, 10)
    const { start, end } = dateKeyToRange(key)
    const status = String(log.status || '').toLowerCase()
    const inLabel = log.checkInTime ? ` · In ${formatCheckIn(log.checkInTime)}` : ''
    return {
      id: `att-${log.id}`,
      title: `${formatStatusLabel(status)}${inLabel}`,
      start,
      end,
      allDay: true,
      kind: 'attendance',
      status,
      color: ATTENDANCE_COLORS[status] || '#6b7280',
      resource: { type: 'attendance', dateKey: key, log },
    }
  })
}

export function teamAttendanceToEvents(calendar = {}) {
  const events = []
  for (const [dateKey, team] of Object.entries(calendar)) {
    if (!team) continue
    const { start, end } = dateKeyToRange(dateKey)
    for (const stat of Object.keys(TEAM_STAT_LABELS)) {
      const count = Number(team[stat]) || 0
      if (count <= 0) continue
      events.push({
        id: `team-${dateKey}-${stat}`,
        title: `${count} ${TEAM_STAT_LABELS[stat]}`,
        start,
        end,
        allDay: true,
        kind: 'attendance_team',
        status: stat,
        color: ATTENDANCE_COLORS[stat] || '#6b7280',
        resource: { type: 'attendance_team', dateKey, stat, team },
      })
    }
  }
  return events
}

export function expandLeavesToDateMap(requests = []) {
  const map = {}
  for (const req of requests) {
    if (req.status === 'rejected' || req.status === 'cancelled') continue
    const start = parseDateKey(String(req.fromDate).slice(0, 10))
    const end = parseDateKey(String(req.toDate).slice(0, 10))
    const cur = new Date(start)
    while (cur <= end) {
      const key = format(cur, 'yyyy-MM-dd')
      if (!map[key]) map[key] = []
      map[key].push(req)
      cur.setDate(cur.getDate() + 1)
    }
  }
  return map
}

const LEAVE_HEX = {
  'bg-teal-600': '#0d9488',
  'bg-[#5B21B6]': '#4f46e5',
  'bg-emerald-600': '#059669',
  'bg-rose-900': '#881337',
  'bg-green-600': '#16a34a',
  'bg-slate-600': '#475569',
  'bg-amber-600': '#d97706',
}

function tailwindBgToHex(bg) {
  return LEAVE_HEX[bg] || '#475569'
}

function leaveRange(req) {
  const fromKey = String(req.fromDate).slice(0, 10)
  const toKey = String(req.toDate).slice(0, 10)
  const start = parseDateKey(fromKey)
  const end = addDays(parseDateKey(toKey), 1)
  return { start, end, fromKey, toKey }
}

export function leaveDataToEvents({ myLeaves = [], teamLeaves = [], holidays = [], viewerId }) {
  const events = []
  const merged = [...myLeaves, ...teamLeaves.filter((t) => !myLeaves.some((m) => m.id === t.id))]

  for (const req of merged) {
    if (req.status === 'rejected' || req.status === 'cancelled') continue
    const style = getLeaveTypeStyle(req.leaveType)
    const isMine = String(req.userId) === String(viewerId)
    const who = isMine ? null : req.user?.name?.split(' ')[0] || 'Team'
    const { start, end, fromKey } = leaveRange(req)
    events.push({
      id: `leave-${req.id}`,
      title: who ? `${who} · ${style.label}` : style.label,
      start,
      end,
      allDay: true,
      kind: 'leave',
      status: req.status,
      color: tailwindBgToHex(style.bg),
      resource: { type: 'leave', dateKey: fromKey, request: req, pending: req.status === 'pending' },
    })
  }

  for (const h of holidays) {
    const dateKey = String(h.date).slice(0, 10)
    const { start, end } = dateKeyToRange(dateKey)
    events.push({
      id: `holiday-${h.id}`,
      title: h.name || HOLIDAY_BADGE.label,
      start,
      end,
      allDay: true,
      kind: 'holiday',
      status: 'holiday',
      color: tailwindBgToHex(HOLIDAY_BADGE.bg),
      resource: { type: 'holiday', dateKey, holiday: h },
    })
  }

  return events
}

export function eventDateKey(event) {
  if (event?.resource?.dateKey) return event.resource.dateKey
  if (event?.start) return format(new Date(event.start), 'yyyy-MM-dd')
  return null
}
