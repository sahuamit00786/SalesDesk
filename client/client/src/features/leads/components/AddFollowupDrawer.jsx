import { useEffect, useMemo, useState } from 'react'
import { Building2, CalendarDays, Clock, X } from '@/components/ui/icons'
import toast from 'react-hot-toast'
import { RightDrawer } from '@/components/ui/RightDrawer'
import { LeadSearchInput } from '@/components/shared/LeadSearchInput'
import { useCreateLeadFollowupMutation } from '@/features/leads/leadsApi'

function pad2(n) {
  return String(n).padStart(2, '0')
}

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

const QUICK = [
  { minutes: 5, label: '5 min' },
  { minutes: 10, label: '10 min' },
  { minutes: 15, label: '15 min' },
]

/** Global add-follow-up drawer: pick lead first (search), then schedule + remark. */
export function AddFollowupDrawer({ open, onClose }) {
  const [createFollowup, { isLoading: creating }] = useCreateLeadFollowupMutation()

  const [selectedLead, setSelectedLead] = useState(null)
  const [remark, setRemark] = useState('')
  const [mode, setMode] = useState('quick')
  const [quickPick, setQuickPick] = useState(5)
  const [customDate, setCustomDate] = useState(() => toDateInputValue(nextMinuteBoundaryFrom(Date.now())))
  const [customTime, setCustomTime] = useState(() => toTimeInputValue(nextMinuteBoundaryFrom(Date.now())))
  const [clockMs, setClockMs] = useState(() => Date.now())

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setClockMs(Date.now()), 1_000)
    return () => clearInterval(id)
  }, [open])

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

  useEffect(() => {
    if (!open || mode !== 'custom' || !customDate || !customTime) return
    const t = parseLocalDateAndTime(customDate, customTime)
    if (t && t.getTime() <= clockMs) {
      queueMicrotask(() => setCustomTime(toTimeInputValue(floorNow)))
      return
    }
    if (selH !== effectiveH || selM !== effectiveM) {
      queueMicrotask(() => setCustomTime(`${pad2(effectiveH)}:${pad2(effectiveM)}`))
    }
  }, [open, mode, customDate, customTime, clockMs, floorNow, effectiveH, effectiveM, selH, selM])

  const scheduledFromForm = useMemo(() => {
    if (mode === 'quick') {
      const d = nextMinuteBoundaryFrom(clockMs)
      d.setMinutes(d.getMinutes() + quickPick)
      return d
    }
    return parseLocalDateAndTime(customDate, customTime)
  }, [mode, quickPick, customDate, customTime, clockMs])

  const scheduledValid = useMemo(() => {
    if (!scheduledFromForm || Number.isNaN(scheduledFromForm.getTime())) return false
    return scheduledFromForm.getTime() > clockMs
  }, [scheduledFromForm, clockMs])

  const canSubmit = Boolean(selectedLead) && scheduledValid && !creating

  function handleClose() {
    onClose?.()
  }

  async function onSubmit() {
    if (!selectedLead) {
      toast.error('Pick a lead first.')
      return
    }
    if (!scheduledValid) {
      toast.error('Pick a follow-up time after now.')
      return
    }
    try {
      await createFollowup({
        id: selectedLead.id,
        scheduledAt: scheduledFromForm.toISOString(),
        remark: remark.trim() || undefined,
        quickPickMinutes: mode === 'quick' ? quickPick : null,
      }).unwrap()
      toast.success('Follow-up scheduled')
      handleClose()
    } catch (e) {
      toast.error(e?.data?.error?.message || 'Could not save follow-up')
    }
  }

  return (
    <RightDrawer
      open={open}
      onClose={handleClose}
      title="Add follow-up"
      description="Pick a lead, choose when to follow up, and optionally leave a remark."
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="h-10 rounded-xl border border-surface-border px-4 text-sm font-medium text-ink-muted hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            className="h-10 rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? 'Saving…' : 'Schedule'}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Lead</p>
          {selectedLead ? (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-brand-200 bg-slate-50 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {selectedLead.title || selectedLead.contactName || 'Untitled'}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    {[selectedLead.email, selectedLead.company].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="shrink-0 rounded-lg p-1.5 text-ink-muted hover:bg-black/[0.06] hover:text-ink"
                aria-label="Change lead"
                title="Change lead"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ) : (
            <div className="mt-2">
              <LeadSearchInput onSelect={setSelectedLead} placeholder="Search lead by name, contact, or email…" />
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">When</p>
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
                const base = nextMinuteBoundaryFrom(Date.now())
                setCustomDate(toDateInputValue(base))
                setCustomTime(toTimeInputValue(base))
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
        </div>

        {mode === 'quick' ? (
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
  )
}

export default AddFollowupDrawer
