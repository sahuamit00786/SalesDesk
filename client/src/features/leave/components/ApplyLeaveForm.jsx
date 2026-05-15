import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { HrCard } from '@/features/hr/components/HrCard'
import {
  useApplyLeaveMutation,
  useGetLeaveTypesQuery,
  useGetMyLeaveBalanceQuery,
  useLazyPreviewLeaveDaysQuery,
} from '@/features/leave/leaveApi'
import { clampDateKeyToMin, isPastDateKey, todayDateKey } from '@/features/leave/utils/leaveDateUtils'
import { formatLeaveDaysPreview } from '@/features/leave/utils/leavePreviewText'

export function ApplyLeaveForm({ onSuccess }) {
  const year = new Date().getFullYear()
  const { data: typesData } = useGetLeaveTypesQuery()
  const { data: balanceData } = useGetMyLeaveBalanceQuery(year)
  const [applyLeave, { isLoading }] = useApplyLeaveMutation()
  const [previewDays, { data: previewData }] = useLazyPreviewLeaveDaysQuery()

  const types = typesData?.data || []
  const balances = balanceData?.data || []

  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reason, setReason] = useState('')
  const [document, setDocument] = useState(null)
  const [errors, setErrors] = useState({})

  const selectedBalance = balances.find((b) => String(b.leaveTypeId) === String(leaveTypeId))
  const preview = previewData?.data
  const days = preview?.days
  const daysHint = formatLeaveDaysPreview(preview)
  const minDate = todayDateKey()

  useEffect(() => {
    if (fromDate && toDate) previewDays({ fromDate, toDate })
  }, [fromDate, toDate, previewDays])

  function validate() {
    const next = {}
    if (!leaveTypeId) next.leaveTypeId = 'Select a leave type'
    if (!fromDate) next.fromDate = 'From date is required'
    if (!toDate) next.toDate = 'To date is required'
    if (fromDate && isPastDateKey(fromDate)) next.fromDate = 'From date cannot be in the past'
    if (toDate && isPastDateKey(toDate)) next.toDate = 'To date cannot be in the past'
    if (fromDate && toDate && fromDate > toDate) next.toDate = 'To date must be on or after from date'
    if (!reason.trim()) next.reason = 'Reason is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submit(e) {
    e.preventDefault()
    if (!validate()) return
    try {
      const fd = new FormData()
      fd.append('leaveTypeId', leaveTypeId)
      fd.append('fromDate', fromDate)
      fd.append('toDate', toDate)
      fd.append('reason', reason.trim())
      if (document) fd.append('document', document)
      await applyLeave(fd).unwrap()
      toast.success('Leave request submitted')
      setLeaveTypeId('')
      setFromDate('')
      setToDate('')
      setReason('')
      setDocument(null)
      onSuccess?.()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not submit leave')
    }
  }

  return (
    <HrCard
      title="Apply for leave"
      description="Submit a new request — working days exclude weekly offs and public holidays"
      icon={CalendarPlus}
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Leave type
            </label>
            <Select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}>
              <option value="">Select type</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </Select>
            {errors.leaveTypeId ? <p className="mt-1 text-xs text-danger">{errors.leaveTypeId}</p> : null}
            {selectedBalance ? (
              <p className="mt-1.5 text-xs text-ink-muted">
                Available: <span className="font-semibold text-brand-700">{Number(selectedBalance.available)} days</span>
              </p>
            ) : null}
          </div>
          <div className="flex items-end">
            <div className="w-full rounded-xl border border-brand-200/60 bg-brand-50/50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700/80">Working days</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-brand-900">{days != null ? days : '—'}</p>
              <p className="text-[11px] text-ink-muted">
                {daysHint || (days != null ? 'In selected range' : 'Pick dates to calculate')}
              </p>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">From</label>
            <Input
              type="date"
              min={minDate}
              value={fromDate}
              onChange={(e) => {
                const next = clampDateKeyToMin(e.target.value, minDate)
                setFromDate(next)
                setToDate((prev) => clampDateKeyToMin(prev, next))
              }}
            />
            {errors.fromDate ? <p className="mt-1 text-xs text-danger">{errors.fromDate}</p> : null}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">To</label>
            <Input
              type="date"
              min={fromDate && fromDate >= minDate ? fromDate : minDate}
              value={toDate}
              onChange={(e) => {
                const floor = fromDate && fromDate >= minDate ? fromDate : minDate
                setToDate(clampDateKeyToMin(e.target.value, floor))
              }}
            />
            {errors.toDate ? <p className="mt-1 text-xs text-danger">{errors.toDate}</p> : null}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">Reason</label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for leave" />
            {errors.reason ? <p className="mt-1 text-xs text-danger">{errors.reason}</p> : null}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Supporting document (optional)
            </label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-700"
              onChange={(e) => setDocument(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <div className="flex justify-end border-t border-surface-border/80 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Submitting…' : 'Submit request'}
          </Button>
        </div>
      </form>
    </HrCard>
  )
}
