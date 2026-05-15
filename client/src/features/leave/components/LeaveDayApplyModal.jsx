import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { HrStatusPill } from '@/features/hr/components/HrStatusPill'
import { getLeaveTypeStyle } from '@/features/leave/constants/leaveTypeStyles'
import { cn } from '@/utils/cn'
import {
  useApplyLeaveMutation,
  useGetLeaveTypesQuery,
  useGetMyLeaveBalanceQuery,
  useLazyPreviewLeaveDaysQuery,
} from '@/features/leave/leaveApi'
import { clampDateKeyToMin, isPastDateKey, todayDateKey } from '@/features/leave/utils/leaveDateUtils'
import { formatLeaveDaysPreview } from '@/features/leave/utils/leavePreviewText'

/** Apply modal shows these types only, in order: Casual, Sick, Unpaid. */
const APPLY_LEAVE_CODES = ['CL', 'SL', 'UL']

function formatDisplayDate(dateStr) {
  if (!dateStr) return ''
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function balanceLabel(available, code) {
  const n = Number(available ?? 0)
  if (code === 'UL') {
    return n > 0 ? 'No balance limit' : 'Unavailable'
  }
  if (n <= 0) return 'No days left'
  if (n === 1) return '1 day left'
  return `${n} days left`
}

export function LeaveDayApplyModal({ open, date, onClose, onSuccess, dayLeaves = [], holiday }) {
  const year = date ? new Date(`${date}T12:00:00`).getFullYear() : new Date().getFullYear()
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

  const leaveChoices = useMemo(() => {
    return APPLY_LEAVE_CODES.map((code) => {
      const type = types.find((t) => String(t.code || '').toUpperCase() === code)
      if (!type) return null
      const balance = balances.find((b) => String(b.leaveTypeId) === String(type.id))
      const available = Number(balance?.available ?? 0)
      const style = getLeaveTypeStyle(type)
      const disabled = code === 'UL' ? false : available <= 0
      return {
        type,
        balance,
        available,
        style,
        code,
        disabled,
        balanceText: balanceLabel(available, code),
      }
    }).filter(Boolean)
  }, [types, balances])

  const minDate = todayDateKey()

  useEffect(() => {
    if (!open) return
    const initial = date && !isPastDateKey(date) ? date : minDate
    setFromDate(initial)
    setToDate(initial)
    setLeaveTypeId('')
    setReason('')
  }, [open, date, minDate])

  function handleFromDateChange(value) {
    const next = clampDateKeyToMin(value, minDate)
    setFromDate(next)
    setToDate((prev) => clampDateKeyToMin(prev, next))
  }

  function handleToDateChange(value) {
    const floor = fromDate && fromDate >= minDate ? fromDate : minDate
    setToDate(clampDateKeyToMin(value, floor))
  }

  useEffect(() => {
    if (!leaveTypeId) return
    const choice = leaveChoices.find((c) => String(c.type.id) === String(leaveTypeId))
    if (choice?.disabled) setLeaveTypeId('')
  }, [leaveChoices, leaveTypeId])

  useEffect(() => {
    if (fromDate && toDate) previewDays({ fromDate, toDate })
  }, [fromDate, toDate, previewDays])

  const selectedChoice = leaveChoices.find((c) => String(c.type.id) === String(leaveTypeId))
  const preview = previewData?.data
  const days = preview?.days
  const daysHint = formatLeaveDaysPreview(preview)

  async function submit(e) {
    e.preventDefault()
    if (holiday) {
      toast.error('This date is a public holiday')
      return
    }
    if (!leaveTypeId) {
      toast.error('Select a leave type')
      return
    }
    if (selectedChoice?.disabled) {
      toast.error('This leave type has no balance remaining')
      return
    }
    if (!fromDate || !toDate) {
      toast.error('Select dates')
      return
    }
    if (isPastDateKey(fromDate) || isPastDateKey(toDate)) {
      toast.error('Leave cannot be applied for past dates')
      return
    }
    if (fromDate > toDate) {
      toast.error('To date must be on or after from date')
      return
    }
    if (!reason.trim()) {
      toast.error('Reason is required')
      return
    }
    try {
      const fd = new FormData()
      fd.append('leaveTypeId', leaveTypeId)
      fd.append('fromDate', fromDate)
      fd.append('toDate', toDate)
      fd.append('reason', reason.trim())
      await applyLeave(fd).unwrap()
      toast.success('Leave request submitted — pending approval')
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Could not submit leave')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Apply for leave"
      description={date ? formatDisplayDate(date) : undefined}
      maxWidthClassName="max-w-lg"
    >
      {holiday ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>{holiday.name}</strong> — public holiday. Leave is usually not required on this day.
        </div>
      ) : null}

      {dayLeaves.length > 0 ? (
        <div className="rounded-xl border border-surface-border bg-surface-subtle/50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">On this day</p>
          <ul className="space-y-2">
            {dayLeaves.map((req) => (
              <li key={req.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-ink">
                  {getLeaveTypeStyle(req.leaveType).label}
                  {req.user?.name && req.user?.id !== req._viewerId ? ` · ${req.user.name}` : ''}
                </span>
                <HrStatusPill status={req.status} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">Leave type</p>
          {leaveChoices.length === 0 ? (
            <p className="rounded-xl border border-dashed border-surface-border bg-surface-subtle/50 px-3 py-4 text-sm text-ink-muted">
              Leave types are not configured yet. Contact your admin.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3">
              {leaveChoices.map((choice) => {
                const selected = String(leaveTypeId) === String(choice.type.id)
                return (
                  <button
                    key={choice.type.id}
                    type="button"
                    disabled={choice.disabled}
                    onClick={() => !choice.disabled && setLeaveTypeId(choice.type.id)}
                    className={cn(
                      'flex min-h-[88px] flex-col justify-between gap-2 rounded-xl border px-3 py-3 text-left transition',
                      choice.disabled
                        ? 'cursor-not-allowed border-surface-border bg-surface-subtle/80 opacity-60'
                        : cn(
                            'border-transparent text-white shadow-sm',
                            choice.style.bg,
                            selected ? 'ring-2 ring-brand-500 ring-offset-2' : 'hover:brightness-105',
                          ),
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold leading-tight">
                      <span
                        className={cn(
                          'h-2 w-2 shrink-0 rounded-full',
                          choice.disabled ? 'bg-ink-faint' : 'bg-white',
                        )}
                        aria-hidden
                      />
                      {choice.style.label}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-medium leading-snug',
                        choice.disabled ? 'text-ink-muted' : 'text-white/90',
                      )}
                    >
                      {choice.balanceText}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          {selectedChoice && !selectedChoice.disabled ? (
            <p className="mt-2 text-xs text-ink-muted">
              You are applying for <strong className="text-ink">{selectedChoice.style.label}</strong>
              {selectedChoice.code !== 'UL' ? (
                <>
                  {' '}
                  — <strong className="text-brand-700">{selectedChoice.available}</strong> day
                  {selectedChoice.available === 1 ? '' : 's'} available after approval of pending requests
                </>
              ) : null}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">From</label>
            <Input type="date" min={minDate} value={fromDate} onChange={(e) => handleFromDateChange(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">To</label>
            <Input
              type="date"
              min={fromDate && fromDate >= minDate ? fromDate : minDate}
              value={toDate}
              onChange={(e) => handleToDateChange(e.target.value)}
            />
          </div>
          {daysHint ? <p className="sm:col-span-2 text-sm text-ink-muted">{daysHint}</p> : null}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">Reason</label>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you taking leave?" />
        </div>

        <div className="flex justify-end gap-2 border-t border-surface-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || Boolean(holiday) || !leaveTypeId || selectedChoice?.disabled}>
            {isLoading ? 'Submitting…' : 'Submit for approval'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
