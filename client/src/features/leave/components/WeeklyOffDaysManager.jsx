import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { HrCard } from '@/features/hr/components/HrCard'
import { useGetLeaveSettingsQuery, useUpdateLeaveSettingsMutation } from '@/features/leave/leaveApi'

const WEEK_DAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

export function WeeklyOffDaysManager() {
  const { data, isLoading } = useGetLeaveSettingsQuery()
  const [updateSettings, { isLoading: saving }] = useUpdateLeaveSettingsMutation()
  const serverDays = data?.data?.weeklyOffDays
  const [selected, setSelected] = useState([0, 6])

  useEffect(() => {
    if (Array.isArray(serverDays)) setSelected([...serverDays].sort((a, b) => a - b))
  }, [serverDays])

  function toggle(day) {
    setSelected((prev) => {
      if (prev.includes(day)) return prev.filter((d) => d !== day)
      return [...prev, day].sort((a, b) => a - b)
    })
  }

  async function save(e) {
    e.preventDefault()
    try {
      await updateSettings({ weeklyOffDays: selected }).unwrap()
      toast.success('Weekly off days saved')
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not save settings')
    }
  }

  return (
    <HrCard
      title="Weekly off days"
      description="Recurring days excluded from leave calculations (along with public holidays)"
      icon={CalendarOff}
    >
      {isLoading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {WEEK_DAYS.map((d) => {
              const on = selected.includes(d.value)
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggle(d.value)}
                  title={d.label}
                  className={[
                    'min-w-[3.25rem] rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    on
                      ? 'border-brand-500 bg-slate-100 text-brand-800'
                      : 'border-surface-border bg-surface text-ink-muted hover:border-brand-300 hover:text-ink',
                  ].join(' ')}
                >
                  {d.short}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-ink-muted">
            {selected.length
              ? `Off: ${selected.map((v) => WEEK_DAYS.find((d) => d.value === v)?.label).join(', ')}`
              : 'No weekly offs selected — all calendar days in range count as working days (except public holidays).'}
          </p>
          <div className="flex justify-end border-t border-surface-border/70 pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save weekly offs'}
            </Button>
          </div>
        </form>
      )}
    </HrCard>
  )
}
