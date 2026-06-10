import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  BellRing,
  CalendarDays,
  Check,
  Clock,
  Hourglass,
  Pencil,
  Plus,
  Timer,
  Trash2,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { RightDrawer } from '@/components/ui/RightDrawer'
import {
  useCreateLeadFollowupMutation,
  useDeleteLeadFollowupMutation,
  useGetLeadFollowupsQuery,
  usePatchLeadFollowupMutation,
} from '@/features/leads/leadsApi'
import { LeadTabEmptyState, LeadTabSectionHeader } from '@/features/leads/components/LeadTabSectionHeader'
import { SkeletonList } from '@/components/shared/SkeletonLoader'

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** Next whole minute from `ms` (local), for min date/time UX */
function nextMinuteBoundaryFrom(ms) {
  const d = new Date(ms)
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() + 1)
  return d
}

function toDateInputValue(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function toTimeInputValue(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function parseLocalDateAndTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null
  const [y, mo, da] = dateStr.split('-').map(Number)
  const [h, mi] = timeStr.split(':').map(Number)
  if (!y || !mo || !da || Number.isNaN(h) || Number.isNaN(mi)) return null
  return new Date(y, mo - 1, da, h, mi, 0, 0)
}

function parseHm(timeStr) {
  const [a, b] = String(timeStr || '').split(':')
  const h = Number.parseInt(a, 10)
  const m = Number.parseInt(b, 10)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return { h: 0, m: 0 }
  return { h, m }
}

/** Local calendar minute (ms) for comparing schedule without second noise from APIs */
function localMinuteMs(isoOrDate) {
  const d = new Date(isoOrDate)
  if (Number.isNaN(d.getTime())) return null
  d.setSeconds(0, 0)
  return d.getTime()
}

function formatFollowupWhen(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Live clock string (H:MM:SS or M:SS) for countdown / elapsed. */
function formatLiveHms(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${pad2(m)}:${pad2(sec)}`
  return `${m}:${pad2(sec)}`
}

const QUICK = [
  { minutes: 5, label: '5 min' },
  { minutes: 10, label: '10 min' },
  { minutes: 15, label: '15 min' },
]

export function LeadFollowupsTab({ leadId }) {
  const { data, isLoading } = useGetLeadFollowupsQuery(leadId, { skip: !leadId })
  const [createFollowup, { isLoading: creating }] = useCreateLeadFollowupMutation()
  const [patchFollowup, { isLoading: patching }] = usePatchLeadFollowupMutation()
  const [deleteFollowup] = useDeleteLeadFollowupMutation()

  const [drawerOpen, setDrawerOpen] = useState(false)
  /** When set, drawer is editing this follow-up (pending only from UI). */
  const [editingId, setEditingId] = useState(null)
  const [remark, setRemark] = useState('')
  const [mode, setMode] = useState('quick') // 'quick' | 'custom'
  const [quickPick, setQuickPick] = useState(5)
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('')
  /** Monotonic-ish “now” for UI validation and overdue styling (no Date.now() during render). */
  const [clockMs, setClockMs] = useState(() => Date.now())

  /** Minute-ms of schedule shown when edit drawer finished opening (avoids accidental PATCH when UI primes a new slot). */
  const editScheduleBaselineMsRef = useRef(null)
  const editScheduleBaselineCapturedRef = useRef(false)

  const followups = useMemo(() => data?.data || [], [data])
  const hasPendingFollowup = useMemo(() => followups.some((f) => f.status === 'pending'), [followups])

  useEffect(() => {
    const ms = drawerOpen || hasPendingFollowup ? 1_000 : 5_000
    const id = setInterval(() => setClockMs(Date.now()), ms)
    return () => clearInterval(id)
  }, [drawerOpen, hasPendingFollowup])

  const floorNow = useMemo(() => nextMinuteBoundaryFrom(clockMs), [clockMs])

  const minDateStr = useMemo(() => toDateInputValue(floorNow), [floorNow])

  const isCustomDateToday = customDate && customDate === toDateInputValue(floorNow)
  const minHourToday = floorNow.getHours()
  const minMinuteToday = floorNow.getMinutes()

  const hourOptions = useMemo(() => {
    const start = isCustomDateToday ? minHourToday : 0
    return Array.from({ length: 24 - start }, (_, i) => start + i)
  }, [isCustomDateToday, minHourToday])

  const { h: selH, m: selM } = parseHm(customTime)
  const effectiveH = hourOptions.includes(selH) ? selH : (hourOptions[0] ?? 0)

  const minuteOptions = useMemo(() => {
    const start = isCustomDateToday && effectiveH === minHourToday ? minMinuteToday : 0
    return Array.from({ length: 60 - start }, (_, i) => start + i)
  }, [isCustomDateToday, effectiveH, minHourToday, minMinuteToday])

  const effectiveM = minuteOptions.includes(selM) ? selM : (minuteOptions[0] ?? 0)

  /** Clamp time when the clock passes the slot, date is today, or hour/minute fall outside allowed options */
  useEffect(() => {
    if (mode !== 'custom' || !customDate) return
    if (!customTime) return
    const t = parseLocalDateAndTime(customDate, customTime)
    if (t && t.getTime() <= clockMs) {
      queueMicrotask(() => setCustomTime(toTimeInputValue(floorNow)))
      return
    }
    if (selH !== effectiveH || selM !== effectiveM) {
      queueMicrotask(() => setCustomTime(`${pad2(effectiveH)}:${pad2(effectiveM)}`))
    }
  }, [mode, customDate, customTime, clockMs, floorNow, effectiveH, effectiveM, selH, selM])

  function primeCustomFields() {
    const base = nextMinuteBoundaryFrom(Date.now())
    setCustomDate(toDateInputValue(base))
    setCustomTime(toTimeInputValue(base))
  }

  function openDrawerForCreate() {
    setEditingId(null)
    editScheduleBaselineCapturedRef.current = false
    editScheduleBaselineMsRef.current = null
    setRemark('')
    setMode('quick')
    setQuickPick(5)
    primeCustomFields()
    setClockMs(Date.now())
    setDrawerOpen(true)
  }

  function openDrawerForEdit(fu) {
    if (fu.status !== 'pending') return
    editScheduleBaselineCapturedRef.current = false
    editScheduleBaselineMsRef.current = null
    setEditingId(fu.id)
    setRemark(fu.remark || '')
    const at = new Date(fu.scheduledAt)
    const nowMs = Date.now()
    setMode('custom')
    if (!Number.isNaN(at.getTime()) && at.getTime() > nowMs) {
      setCustomDate(toDateInputValue(at))
      setCustomTime(toTimeInputValue(at))
    } else {
      primeCustomFields()
    }
    setClockMs(Date.now())
    setDrawerOpen(true)
  }

  const openDrawer = () => {
    openDrawerForCreate()
  }

  const scheduledFromForm = useMemo(() => {
    if (mode === 'quick') {
      const d = nextMinuteBoundaryFrom(clockMs)
      d.setMinutes(d.getMinutes() + quickPick)
      return d
    }
    const d = parseLocalDateAndTime(customDate, customTime)
    return d
  }, [mode, quickPick, customDate, customTime, clockMs])

  const scheduledValid = useMemo(() => {
    if (!scheduledFromForm || Number.isNaN(scheduledFromForm.getTime())) return false
    return scheduledFromForm.getTime() > clockMs
  }, [scheduledFromForm, clockMs])

  useEffect(() => {
    if (!drawerOpen || !editingId || editScheduleBaselineCapturedRef.current) return
    if (mode !== 'custom') return
    const d = scheduledFromForm
    if (!d || Number.isNaN(d.getTime())) return
    editScheduleBaselineMsRef.current = localMinuteMs(d)
    editScheduleBaselineCapturedRef.current = true
  }, [drawerOpen, editingId, mode, scheduledFromForm])

  async function onSubmit() {
    if (editingId) {
      const editing = followups.find((f) => String(f.id) === String(editingId))
      if (!editing) {
        toast.error('Follow-up not found.')
        return
      }
      const body = {}
      const nextRemark = remark.trim()
      const prevRemark = String(editing.remark || '').trim()
      if (nextRemark !== prevRemark) {
        body.remark = nextRemark || null
      }
      const baseline = editScheduleBaselineMsRef.current
      const currentMs = scheduledFromForm ? localMinuteMs(scheduledFromForm) : null
      if (baseline != null && currentMs != null && currentMs !== baseline) {
        if (scheduledFromForm.getTime() <= clockMs) {
          toast.error('Pick a follow-up time after now.')
          return
        }
        body.scheduledAt = scheduledFromForm.toISOString()
      }
      if (!Object.keys(body).length) {
        toast.error('Change the remark or schedule to save.')
        return
      }
      try {
        await patchFollowup({ id: leadId, followupId: editingId, ...body }).unwrap()
        toast.success('Follow-up updated')
        setDrawerOpen(false)
        setEditingId(null)
      } catch (e) {
        toast.error(e?.data?.error?.message || 'Could not update follow-up')
      }
      return
    }

    if (!scheduledValid) {
      toast.error('Pick a follow-up time after now.')
      return
    }
    try {
      await createFollowup({
        id: leadId,
        scheduledAt: scheduledFromForm.toISOString(),
        remark: remark.trim() || undefined,
        quickPickMinutes: mode === 'quick' ? quickPick : null,
      }).unwrap()
      toast.success('Follow-up scheduled')
      setDrawerOpen(false)
    } catch (e) {
      const msg = e?.data?.error?.message || 'Could not save follow-up'
      toast.error(msg)
    }
  }

  const addFollowUpButton = (
    <button
      type="button"
      onClick={openDrawer}
      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--brand-primary-dark)]"
    >
      <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Add follow-up
    </button>
  )

  return (
    <div className="mt-4 space-y-4">
      <LeadTabSectionHeader
        title="Follow-ups"
        description="Remind yourself when to reach out again."
        action={addFollowUpButton}
      />

      {isLoading ? (
        <SkeletonList rows={3} />
      ) : followups.length === 0 ? (
        <LeadTabEmptyState
          icon={BellRing}
          title="No follow-ups scheduled yet"
          description="Schedule the next touchpoint so nothing slips. Everyone on the team sees the same list once reminders are added."
          action={addFollowUpButton}
        />
      ) : (
        <ul className="grid w-full grid-cols-1 gap-2.5">
          {followups.map((fu) => {
            const at = new Date(fu.scheduledAt)
            const tMs = at.getTime()
            const expired = fu.status === 'pending' && tMs < clockMs
            const upcoming = fu.status === 'pending' && tMs >= clockMs

            let tone = 'settled'
            if (expired) tone = 'expired'
            else if (upcoming) tone = 'upcoming'
            else if (fu.status === 'done') tone = 'done'
            else if (fu.status === 'cancelled') tone = 'cancelled'

            const toneClass = {
              expired: {
                card: 'border border-red-200/80 bg-white hover:border-red-200',
                bar: 'bg-red-300/70',
                statusPill: 'bg-red-50 text-red-800 ring-1 ring-red-100',
                timerWrap: 'border-red-200/80 bg-red-50/60 text-red-900',
              },
              upcoming: {
                card: 'border border-amber-200/80 bg-white hover:border-amber-200',
                bar: 'bg-amber-300/65',
                statusPill: 'bg-amber-50 text-amber-900 ring-1 ring-amber-100',
                timerWrap: 'border-amber-200/80 bg-amber-50/60 text-amber-950',
              },
              done: {
                card: 'border border-emerald-200/70 bg-white hover:border-emerald-200',
                bar: 'bg-emerald-300/55',
                statusPill: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100',
                timerWrap: 'border-slate-200 bg-slate-50 text-slate-700',
              },
              cancelled: {
                card: 'border border-slate-200 bg-slate-50/40 hover:border-slate-300',
                bar: 'bg-slate-300/60',
                statusPill: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80',
                timerWrap: 'border-slate-200 bg-slate-50 text-slate-600',
              },
              settled: {
                card: 'border border-slate-200 bg-white',
                bar: 'bg-slate-300/45',
                statusPill: 'bg-slate-100 text-slate-700',
                timerWrap: 'border-slate-200 bg-slate-50 text-slate-700',
              },
            }[tone]

            const initial = String(fu.creator?.name || '?')
              .trim()
              .charAt(0)
              .toUpperCase()

            const pendingLive = fu.status === 'pending'
            const secDown = pendingLive && upcoming ? Math.max(0, (tMs - clockMs) / 1000) : 0
            const secUp = pendingLive && expired ? Math.max(0, (clockMs - tMs) / 1000) : 0
            const timerLabel = expired ? 'Elapsed' : 'Remaining'

            return (
              <li
                key={fu.id}
                className={`group relative overflow-hidden rounded-xl shadow-sm ring-1 ring-slate-100/80 transition hover:shadow-md ${toneClass.card}`}
              >
                <div className={`absolute left-0 top-0 h-full w-0.5 ${toneClass.bar}`} aria-hidden />
                <div className="relative pl-3.5 pr-3 pt-2.5 pb-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneClass.statusPill}`}>
                        {fu.status}
                      </span>
                      {fu.quickPickMinutes ? (
                        <span className="text-[10px] font-medium text-slate-500">+{fu.quickPickMinutes} min</span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400">Custom</span>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                      {fu.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-brand-200 bg-white px-2 text-[11px] font-medium text-brand-800 transition hover:bg-slate-50"
                            title="Edit remark or time"
                            onClick={() => openDrawerForEdit(fu)}
                          >
                            <Pencil className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 text-[11px] font-medium text-emerald-800 transition hover:bg-emerald-50"
                            onClick={async () => {
                              try {
                                await patchFollowup({ id: leadId, followupId: fu.id, status: 'done' }).unwrap()
                              } catch (err) {
                                toast.error(err?.data?.error?.message || 'Could not update')
                              }
                            }}
                          >
                            <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                            Done
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
                            onClick={async () => {
                              try {
                                await patchFollowup({ id: leadId, followupId: fu.id, status: 'cancelled' }).unwrap()
                              } catch (err) {
                                toast.error(err?.data?.error?.message || 'Could not update')
                              }
                            }}
                          >
                            <X className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                            Cancel
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50/60 hover:text-red-700"
                        title="Delete"
                        onClick={async () => {
                          try {
                            await deleteFollowup({ id: leadId, followupId: fu.id }).unwrap()
                          } catch (err) {
                            toast.error(err?.data?.error?.message || 'Could not delete')
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-slate-800">
                    {fu.remark?.trim() ? fu.remark : <span className="font-normal text-slate-400">No remark</span>}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                    <div className="min-w-0 space-y-1">
                      <p className="flex items-center gap-1 text-[11px] text-slate-600">
                        <Clock className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                        <span className="truncate text-slate-700">{formatFollowupWhen(fu.scheduledAt)}</span>
                      </p>
                      {fu.creator?.name ? (
                        <p className="flex items-center gap-1 text-[10px] text-slate-500">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200/90 text-[8px] font-semibold text-slate-600">
                            {initial}
                          </span>
                          <span className="truncate">{fu.creator.name}</span>
                        </p>
                      ) : null}
                    </div>
                    {pendingLive ? (
                      <div
                        className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 ${toneClass.timerWrap}`}
                        title={expired ? 'Time since scheduled' : 'Time until follow-up'}
                      >
                        <Timer className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                        <div className="flex flex-col items-end leading-none">
                          <span className="font-mono text-[12px] font-semibold tabular-nums tracking-tight">
                            {formatLiveHms(expired ? secUp : secDown)}
                          </span>
                          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-500">
                            {timerLabel}
                          </span>
                        </div>
                        {expired ? (
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600/70" aria-hidden />
                        ) : (
                          <Hourglass className="h-3.5 w-3.5 shrink-0 text-amber-700/60" aria-hidden />
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <RightDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setEditingId(null)
          editScheduleBaselineCapturedRef.current = false
          editScheduleBaselineMsRef.current = null
        }}
        title={editingId ? 'Edit follow-up' : 'Add follow-up'}
        description={
          editingId
            ? 'Update the remark or pick a new time. When you change the time, it must be in the future.'
            : 'Choose when to follow up. Times must be in the future.'
        }
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false)
                setEditingId(null)
                editScheduleBaselineCapturedRef.current = false
                editScheduleBaselineMsRef.current = null
              }}
              className="h-10 rounded-xl border border-surface-border px-4 text-sm font-medium text-ink-muted hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              disabled={editingId ? patching : creating || !scheduledValid}
              onClick={onSubmit}
              className="h-10 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editingId ? (patching ? 'Saving…' : 'Save changes') : creating ? 'Saving…' : 'Schedule'}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">When</p>
            {editingId ? (
              <p className="mt-2 text-xs text-ink-muted">Adjust date and time below, or leave as-is and only change the remark.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMode('quick')}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    mode === 'quick'
                      ? 'border-brand-400 bg-slate-50 text-brand-900 shadow-sm'
                      : 'border-surface-border text-ink-muted hover:border-brand-200 hover:text-ink'
                  }`}
                >
                  Quick
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('custom')
                    primeCustomFields()
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    mode === 'custom'
                      ? 'border-brand-400 bg-slate-50 text-brand-900 shadow-sm'
                      : 'border-surface-border text-ink-muted hover:border-brand-200 hover:text-ink'
                  }`}
                >
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  Custom date & time
                </button>
              </div>
            )}
          </div>

          {!editingId && mode === 'quick' ? (
            <div>
              <p className="text-xs text-ink-muted">From the next minute, remind after:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK.map(({ minutes, label }) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setQuickPick(minutes)}
                    className={`min-w-[4.5rem] rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${
                      quickPick === minutes
                        ? 'border-violet-500 bg-[var(--brand-primary)] text-white shadow-md shadow-violet-500/30'
                        : 'border-surface-border bg-white text-ink hover:border-brand-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-3 rounded-xl border border-violet-100 bg-slate-50 px-3 py-2 text-xs text-brand-900">
                <span className="font-semibold">Scheduled:</span>{' '}
                {scheduledFromForm && !Number.isNaN(scheduledFromForm.getTime())
                  ? formatFollowupWhen(scheduledFromForm.toISOString())
                  : '—'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-surface-border bg-gradient-to-br from-white to-slate-50/90 p-4 shadow-inner">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <CalendarDays className="h-3.5 w-3.5 text-violet-500" aria-hidden />
                    Date
                  </span>
                  <input
                    type="date"
                    min={minDateStr}
                    value={customDate}
                    onChange={(e) => {
                      const v = e.target.value
                      setCustomDate(v)
                      const todayStr = toDateInputValue(floorNow)
                      if (v === todayStr) {
                        const t = parseLocalDateAndTime(v, customTime)
                        if (t && t.getTime() <= floorNow.getTime()) setCustomTime(toTimeInputValue(floorNow))
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink shadow-sm outline-none ring-brand-500/20 transition focus:border-brand-400 focus:ring-4"
                  />
                </label>
                <div className="block space-y-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <Clock className="h-3.5 w-3.5 text-fuchsia-500" aria-hidden />
                    Time
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Hour"
                      value={effectiveH}
                      onChange={(e) => {
                        const h = Number(e.target.value)
                        let m = effectiveM
                        const minM = isCustomDateToday && h === minHourToday ? minMinuteToday : 0
                        if (m < minM) m = minM
                        setCustomTime(`${pad2(h)}:${pad2(m)}`)
                      }}
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink shadow-sm outline-none ring-brand-500/20 transition focus:border-fuchsia-400 focus:ring-4"
                    >
                      {hourOptions.map((h) => (
                        <option key={h} value={h}>
                          {pad2(h)}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm font-semibold text-ink-muted" aria-hidden>
                      :
                    </span>
                    <select
                      aria-label="Minute"
                      value={effectiveM}
                      onChange={(e) => {
                        const m = Number(e.target.value)
                        setCustomTime(`${pad2(effectiveH)}:${pad2(m)}`)
                      }}
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink shadow-sm outline-none ring-brand-500/20 transition focus:border-fuchsia-400 focus:ring-4"
                    >
                      {minuteOptions.map((m) => (
                        <option key={m} value={m}>
                          {pad2(m)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-ink-muted">
                Same-day times cannot be earlier than {toTimeInputValue(floorNow)} (your local clock).
              </p>
            </div>
          )}

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-ink">Remark</span>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={4}
              maxLength={8000}
              placeholder="What to do when you follow up…"
              className="w-full resize-y rounded-xl border border-surface-border bg-white px-3 py-2.5 text-sm text-ink shadow-sm outline-none ring-brand-500/15 transition focus:border-brand-400 focus:ring-4"
            />
          </label>
        </div>
      </RightDrawer>
    </div>
  )
}
