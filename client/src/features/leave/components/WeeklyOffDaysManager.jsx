import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
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
    setSelected((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    )
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
    <div className="rounded-xl border border-surface-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Weekly off days</p>
        <p className="text-xs text-ink-faint">
          {selected.length
            ? selected.map((v) => WEEK_DAYS.find((d) => d.value === v)?.short).join(', ')
            : 'None'}
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : (
        <form onSubmit={save}>
          <div className="flex flex-wrap items-center gap-1.5">
            {WEEK_DAYS.map((d) => {
              const on = selected.includes(d.value)
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggle(d.value)}
                  title={d.label}
                  className={[
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    on
                      ? 'border-brand-500 bg-slate-100 text-brand-800'
                      : 'border-surface-border bg-surface text-ink-muted hover:border-brand-300 hover:text-ink',
                  ].join(' ')}
                >
                  {d.short}
                </button>
              )
            })}
            <Button type="submit" disabled={saving} className="ml-auto !h-8 !px-3 !text-xs">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
