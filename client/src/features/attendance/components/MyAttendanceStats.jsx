import { Clock, UserCheck, UserX, AlarmClock, Coffee } from 'lucide-react'
import { HrStatCard } from '@/features/hr/components/HrStatCard'

const STAT_CONFIG = [
  { key: 'present', label: 'Present', tone: 'present', icon: UserCheck },
  { key: 'absent', label: 'Absent', tone: 'absent', icon: UserX },
  { key: 'late', label: 'Late', tone: 'late', icon: AlarmClock },
  { key: 'half_day', label: 'Half day', tone: 'half_day', icon: Coffee },
]

export function MyAttendanceStats({ stats, totalHours }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {STAT_CONFIG.map((s) => (
        <HrStatCard
          key={s.key}
          label={s.label}
          value={stats?.[s.key] ?? 0}
          tone={s.tone}
          icon={s.icon}
        />
      ))}
      <HrStatCard
        label="Total hours"
        value={`${Number(totalHours || 0).toFixed(1)}h`}
        subtext="This month"
        tone="brand"
        icon={Clock}
      />
    </div>
  )
}
