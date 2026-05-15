import { useState } from 'react'
import toast from 'react-hot-toast'
import { PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { HrCard } from '@/features/hr/components/HrCard'
import { HrEmptyState } from '@/features/hr/components/HrEmptyState'
import {
  useCreateHolidayMutation,
  useDeleteHolidayMutation,
  useGetPublicHolidaysQuery,
} from '@/features/leave/leaveApi'

export function PublicHolidayManager({ year }) {
  const { data, isLoading } = useGetPublicHolidaysQuery(year)
  const [createHoliday] = useCreateHolidayMutation()
  const [deleteHoliday] = useDeleteHolidayMutation()
  const holidays = data?.data || []

  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')

  async function addHoliday(e) {
    e.preventDefault()
    if (!name.trim() || !date) {
      toast.error('Name and date are required')
      return
    }
    try {
      await createHoliday({ name: name.trim(), date, description: description || null }).unwrap()
      toast.success('Holiday added')
      setName('')
      setDate('')
      setDescription('')
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not add holiday')
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this holiday?')) return
    try {
      await deleteHoliday(id).unwrap()
      toast.success('Holiday deleted')
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not delete')
    }
  }

  return (
    <HrCard
      title={`Public holidays (${year})`}
      description="Company-wide holidays excluded from leave day calculations"
      icon={PartyPopper}
    >
      <form onSubmit={addHoliday} className="mb-6 grid gap-3 rounded-xl border border-surface-border/80 bg-surface-subtle/40 p-4 sm:grid-cols-3">
        <Input placeholder="Holiday name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="sm:col-span-2"
        />
        <Button type="submit" className="sm:col-span-1">
          Add holiday
        </Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Loading holidays…</p>
      ) : holidays.length === 0 ? (
        <HrEmptyState
          icon={PartyPopper}
          title="No holidays configured"
          description="Add public holidays so leave calculations skip non-working days."
          className="border-0 bg-transparent py-6"
        />
      ) : (
        <ul className="divide-y divide-surface-border/80 overflow-hidden rounded-xl border border-surface-border/80">
          {holidays.map((h) => (
            <li
              key={h.id}
              className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3.5 transition-colors hover:bg-brand-50/20"
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink">{h.name}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  <span className="font-medium tabular-nums text-brand-700">{h.date}</span>
                  {h.description ? ` — ${h.description}` : ''}
                </p>
              </div>
              <Button type="button" variant="danger" className="!h-8 !px-3 !text-xs shrink-0" onClick={() => remove(h.id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </HrCard>
  )
}
