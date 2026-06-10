import { cn } from '@/utils/cn'

const STAT_ITEMS = [
  { key: 'present', label: 'Present', dot: 'bg-emerald-500', text: 'text-emerald-800' },
  { key: 'absent', label: 'Absent', dot: 'bg-rose-500', text: 'text-rose-800' },
  { key: 'late', label: 'Late', dot: 'bg-amber-500', text: 'text-amber-800' },
  { key: 'half_day', label: 'Half day', dot: 'bg-[var(--brand-primary)]', text: 'text-sky-800' },
  { key: 'on_leave', label: 'On leave', dot: 'bg-slate-500', text: 'text-brand-800' },
]

function StatRow({ label, count, dot, text }) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-md border border-gray-100 bg-white/90 px-1.5 py-0.5 text-[10px] font-medium leading-tight shadow-sm',
        text,
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dot)} aria-hidden />
      <span className="tabular-nums">{count}</span>
      <span className="truncate text-gray-600">{label}</span>
    </div>
  )
}

/** Team attendance summary chips for a calendar day (replaces P/A/L abbreviations). */
export function AttendanceTeamDayStats({ team, maxVisible = 3 }) {
  if (!team) return null

  const rows = STAT_ITEMS.filter((item) => Number(team[item.key]) > 0).map((item) => ({
    ...item,
    count: Number(team[item.key]),
  }))

  if (!rows.length) return null

  const visible = rows.slice(0, maxVisible)
  const hidden = rows.length - visible.length

  return (
    <div className="mt-1 flex flex-col gap-0.5">
      {visible.map((row) => (
        <StatRow key={row.key} label={row.label} count={row.count} dot={row.dot} text={row.text} />
      ))}
      {hidden > 0 ? (
        <span className="px-0.5 text-center text-[9px] font-medium text-gray-500">+{hidden} more</span>
      ) : null}
    </div>
  )
}
