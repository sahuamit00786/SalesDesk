import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Bell, Clock3, Calendar, StickyNote, User } from 'lucide-react'
import { cn } from '@/utils/cn'
import { computeCalendarPopoverPosition } from '@/utils/calendarPopoverPosition'

function humanizeReminderStatus(s) {
  const map = { pending: 'Pending', done: 'Done', dismissed: 'Dismissed' }
  return map[String(s || '').toLowerCase()] || String(s || '').replace(/_/g, ' ')
}

function statusPillClass(status) {
  switch (String(status || '').toLowerCase()) {
    case 'done':
      return 'bg-slate-100 text-slate-700 ring-slate-200'
    case 'dismissed':
      return 'bg-gray-100 text-gray-700 ring-gray-200'
    default:
      return 'bg-rose-50 text-rose-800 ring-rose-200'
  }
}

export function ReminderEventHoverCard({ event, anchorRect, onMouseEnter, onMouseLeave, exiting = false, onExitTransitionEnd }) {
  const { top, left, maxCardHeight } = useMemo(
    () => computeCalendarPopoverPosition(anchorRect),
    [anchorRect?.top, anchorRect?.bottom, anchorRect?.left, anchorRect?.right, anchorRect?.width, anchorRect?.height],
  )

  const start = event?.start ? new Date(event.start) : null
  const end = event?.end ? new Date(event.end) : null

  const rangeLabel = useMemo(() => {
    if (!start || Number.isNaN(start.getTime())) return null
    const a = format(start, 'EEE, MMM d, yyyy')
    const b =
      end && !Number.isNaN(end.getTime()) && end.getTime() !== start.getTime()
        ? `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`
        : format(start, 'h:mm a')
    return `${a} · ${b}`
  }, [start, end])

  const notes = event?.meta?.notes?.trim()
  const targetType = event?.meta?.targetType
  const targetId = event?.meta?.targetId
  const leadHref = targetType === 'lead' && targetId ? `/leads/${targetId}` : null

  if (!anchorRect) return null

  return (
    <div
      role="dialog"
      aria-label="Reminder details"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onTransitionEnd={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.propertyName !== 'opacity') return
        if (exiting) onExitTransitionEnd?.()
      }}
      className={cn(
        'fixed z-[130] flex min-h-0 w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl transition-[opacity,transform] duration-200 ease-out will-change-[opacity,transform]',
        exiting ? 'pointer-events-none opacity-0 scale-[0.97] translate-y-1' : 'opacity-100 scale-100 translate-y-0',
      )}
      style={{ top, left, maxHeight: maxCardHeight }}
    >
      <div className="flex items-start justify-between gap-2 border-b border-rose-100 bg-gradient-to-r from-rose-50 to-brand-50 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-md bg-rose-600/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-900 ring-1 ring-rose-200">
            Reminder
          </span>
          <p className="mt-1.5 text-sm font-semibold leading-snug text-gray-900">{event.title}</p>
        </div>
        <Bell className="h-5 w-5 shrink-0 text-rose-600" aria-hidden />
      </div>

      <div className="scrollbar-subtle min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <div className="overflow-hidden rounded-lg border border-rose-100 bg-gradient-to-br from-rose-50/90 via-white to-brand-50/40 p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-rose-100">
              <Bell className="h-5 w-5 text-rose-600" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[11px] font-semibold text-gray-800">Personal reminder</p>
              <p className="text-[10px] text-gray-500">Push & email based on your settings</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1',
              statusPillClass(event?.status),
            )}
          >
            {humanizeReminderStatus(event?.status)}
          </span>
          {event?.ownerName ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 ring-1 ring-gray-200">
              <User className="h-3 w-3" aria-hidden />
              {event.ownerName}
            </span>
          ) : null}
        </div>

        {rangeLabel ? (
          <div className="flex gap-2 rounded-lg border border-gray-100 bg-gray-50/80 p-2.5">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
            <div>
              <p className="text-xs font-semibold text-gray-900">{rangeLabel}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                <Clock3 className="h-3 w-3" />
                Remind time
              </p>
            </div>
          </div>
        ) : null}

        {notes ? (
          <div>
            <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              <StickyNote className="h-3 w-3" />
              Notes
            </p>
            <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-100 bg-white p-2.5 text-xs leading-relaxed text-gray-700 scrollbar-subtle">
              {notes}
            </div>
          </div>
        ) : null}

        {leadHref ? (
          <Link
            to={leadHref}
            className="inline-flex items-center justify-center rounded-lg border border-rose-100 bg-white px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50/60"
          >
            Open linked lead
          </Link>
        ) : null}
      </div>
    </div>
  )
}
