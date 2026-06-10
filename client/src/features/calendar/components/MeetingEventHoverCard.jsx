import { useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Video, Clock3, ExternalLink, MapPin, Users, Briefcase, Copy, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'
import { computeCalendarPopoverPosition } from '@/utils/calendarPopoverPosition'

/** Google Meet–style camera (hollow body + lens); not an official Google asset. */
function GoogleMeetLogo({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#fff" />
      <rect x="14" y="8" width="26" height="6" fill="#FBBC04" />
      <path fill="#EA4335" d="M8 8h6L8 13.5V8z" />
      <path fill="#4285F4" d="M8 14h6v26H8V14z" />
      <rect x="14" y="34" width="26" height="6" fill="#34A853" />
      <rect x="34" y="14" width="6" height="20" fill="#34A853" />
      <path fill="#34A853" d="M40 11.5L48 24L40 36.5z" />
    </svg>
  )
}

function humanizeMeetingType(t) {
  const map = { demo: 'Demo', follow_up: 'Follow-up', closing: 'Closing', internal: 'Internal' }
  return map[t] || String(t || '').replace(/_/g, ' ') || 'Meeting'
}

function humanizeStatus(s) {
  const map = {
    scheduled: 'Scheduled',
    live: 'Live',
    completed: 'Completed',
    cancelled: 'Cancelled',
    missed: 'Missed',
  }
  return map[s] || String(s || '').replace(/_/g, ' ')
}

function statusPillClass(status) {
  switch (status) {
    case 'live':
      return 'bg-red-100 text-red-800 ring-red-200'
    case 'completed':
      return 'bg-slate-100 text-slate-700 ring-slate-200'
    case 'cancelled':
    case 'missed':
      return 'bg-amber-50 text-amber-800 ring-amber-200'
    default:
      return 'bg-brand-50 text-brand-800 ring-brand-200'
  }
}

export function MeetingEventHoverCard({ event, anchorRect, onMouseEnter, onMouseLeave, exiting = false, onExitTransitionEnd }) {
  const leadId = event?.leadId
  const meetLink = event?.meta?.googleMeetLink?.trim()

  const { top, left, maxCardHeight } = useMemo(
    () => computeCalendarPopoverPosition(anchorRect),
    [anchorRect?.top, anchorRect?.bottom, anchorRect?.left, anchorRect?.right, anchorRect?.width, anchorRect?.height],
  )

  const start = event?.start ? new Date(event.start) : null
  const end = event?.end ? new Date(event.end) : null
  const tz = event?.meta?.timezone || 'Local'

  const rangeLabel = useMemo(() => {
    if (!start || Number.isNaN(start.getTime())) return null
    const a = format(start, 'EEE, MMM d, yyyy')
    const b = end && !Number.isNaN(end.getTime())
      ? `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`
      : format(start, 'h:mm a')
    return `${a} · ${b}`
  }, [start, end])

  const durationLabel = useMemo(() => {
    const dm = event?.meta?.durationMinutes
    if (dm != null && Number(dm) > 0) return `${Number(dm)} min`
    if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const mins = Math.round((end.getTime() - start.getTime()) / 60000)
      if (mins > 0) return `${mins} min`
    }
    return null
  }, [start, end, event?.meta?.durationMinutes])

  const attendeeCount = Array.isArray(event?.attendees) ? event.attendees.length : 0

  const copyMeetLink = useCallback(async () => {
    if (!meetLink) return
    try {
      await navigator.clipboard.writeText(meetLink)
      toast.success('Meet link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }, [meetLink])

  if (!anchorRect) return null

  return (
    <div
      role="dialog"
      aria-label="Meeting details"
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
      <div className="flex items-start justify-between gap-2 border-b border-brand-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-md bg-[var(--brand-primary)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-800 ring-1 ring-brand-200">
            Meeting
          </span>
          <p className="mt-1.5 text-sm font-semibold leading-snug text-gray-900">{event.title}</p>
        </div>
        <Video className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
      </div>

      <div className="scrollbar-subtle min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {meetLink ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-br from-[#e8f5e9] via-white to-[#e3f2fd] p-2 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-100/80">
                <GoogleMeetLogo className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[11px] font-semibold text-gray-800">Google Meet</p>
                <p className="truncate text-[10px] text-gray-500">Video call</p>
              </div>
            </div>
            <div className="mt-2 flex h-8 items-center gap-1.5">
              <a
                href={meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1a73e8] px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1557b0]"
              >
                <GoogleMeetLogo className="h-4 w-4 shrink-0 drop-shadow-sm" />
                <span className="truncate">Join</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              </a>
              <button
                type="button"
                onClick={copyMeetLink}
                title="Copy meeting link"
                aria-label="Copy meeting link"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50"
              >
                <Copy className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            No Google Meet link on this meeting yet.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1', statusPillClass(event?.status))}>
            {humanizeStatus(event?.status)}
          </span>
          <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-brand-800 ring-1 ring-brand-100">
            {humanizeMeetingType(event?.meta?.meetingType)}
          </span>
          {durationLabel ? (
            <span className="text-[11px] font-medium text-gray-500">{durationLabel}</span>
          ) : null}
        </div>

        {rangeLabel ? (
          <div className="flex gap-2 rounded-lg border border-gray-100 bg-gray-50/80 p-2.5">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
            <div>
              <p className="text-xs font-semibold text-gray-900">{rangeLabel}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                <Clock3 className="h-3 w-3" />
                Time zone: {tz}
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
          {event?.meta?.recordingStatus ? (
            <span>
              Recording: <span className="font-medium capitalize text-gray-800">{String(event.meta.recordingStatus).replace(/_/g, ' ')}</span>
            </span>
          ) : null}
          {event?.meta?.transcriptionStatus ? (
            <span>
              Transcript: <span className="font-medium capitalize text-gray-800">{String(event.meta.transcriptionStatus).replace(/_/g, ' ')}</span>
            </span>
          ) : null}
        </div>

        {attendeeCount > 0 ? (
          <div className="flex items-center gap-2 text-xs text-gray-700">
            <Users className="h-4 w-4 text-gray-500" />
            <span>
              <span className="font-semibold">{attendeeCount}</span> participant{attendeeCount === 1 ? '' : 's'} on the invite
            </span>
          </div>
        ) : null}

        {event?.leadName && leadId ? (
          <Link
            to={`/leads/${leadId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-brand-600 hover:bg-brand-50"
          >
            <Briefcase className="h-4 w-4 shrink-0" />
            Lead: {event.leadName}
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </Link>
        ) : null}

        {event?.meta?.agenda ? (
          <div>
            <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              <MapPin className="h-3 w-3" />
              Agenda
            </p>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-100 bg-white p-2.5 text-xs leading-relaxed text-gray-700 scrollbar-subtle">
              {event.meta.agenda}
            </div>
          </div>
        ) : (
          <p className="text-[11px] italic text-gray-400">No agenda added.</p>
        )}
      </div>
    </div>
  )
}
