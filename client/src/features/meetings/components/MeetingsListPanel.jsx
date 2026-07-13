import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Briefcase,
  Calendar,
  Clock3,
  Copy,
  ExternalLink,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'
import { SkeletonCards } from '@/components/shared/SkeletonLoader'
import { useDeleteMeetingMutation, useGetMeetingQuery } from '@/features/meetings/meetingsApi'

/** Google Meet–style mark (not an official Google asset). */
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
    expired: 'Expired',
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
    case 'expired':
      return 'bg-amber-50 text-amber-800 ring-amber-200'
    default:
      return 'bg-brand-50 text-brand-800 ring-brand-200'
  }
}

const PROCESSING_BOT_STATUSES = new Set(['joining', 'recording', 'processing'])

function MeetingDetailCard({ meeting: meetingProp, channel, onEdit, onDelete, deletingId }) {
  const isProcessing =
    PROCESSING_BOT_STATUSES.has(meetingProp.botStatus) ||
    meetingProp.transcriptionStatus === 'processing' ||
    meetingProp.aiSummaryStatus === 'processing'

  // Poll every 5s while the AI pipeline is running; stop once done
  const { data: pollResult } = useGetMeetingQuery(meetingProp.id, {
    pollingInterval: isProcessing ? 5000 : 0,
    skip: !isProcessing,
  })

  const meeting = (isProcessing && pollResult?.data) ? pollResult.data : meetingProp
  const meetLink = String(meeting.googleMeetLink || '').trim()
  const deleting = deletingId === meeting.id
  const isVideo = channel === 'video'

  const start = meeting.scheduledStart ? new Date(meeting.scheduledStart) : null
  const end = meeting.scheduledEnd ? new Date(meeting.scheduledEnd) : null
  const tz = meeting.timezone || 'Local'

  const rangeLabel =
    start && !Number.isNaN(start.getTime())
      ? `${format(start, 'EEE, MMM d, yyyy')} · ${
          end && !Number.isNaN(end.getTime())
            ? `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`
            : format(start, 'h:mm a')
        }`
      : null

  const durationLabel = (() => {
    const dm = meeting.durationMinutes
    if (dm != null && Number(dm) > 0) return `${Number(dm)} min`
    if (
      start &&
      end &&
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime())
    ) {
      const mins = Math.round((end.getTime() - start.getTime()) / 60000)
      if (mins > 0) return `${mins} min`
    }
    return null
  })()

  const attendeeCount = Array.isArray(meeting.participants) ? meeting.participants.length : 0
  const leadId = meeting.leadId

  const displayStatus = (() => {
    if (!start || Number.isNaN(start.getTime())) return meeting.status
    const now = new Date()
    if (end && !Number.isNaN(end.getTime())) {
      if (now < start) return 'scheduled'
      if (now >= start && now <= end) return 'live'
      if (now > end) return 'expired'
    } else if (now < start) {
      return 'scheduled'
    } else {
      return 'expired'
    }
    return meeting.status
  })()

  const copyMeetLink = useCallback(async () => {
    if (!meetLink) return
    try {
      await navigator.clipboard.writeText(meetLink)
      toast.success('Meet link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }, [meetLink])

  const handleDelete = () => {
    onDelete?.(meeting.id)
  }

  return (
    <article
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md',
        isVideo ? 'ring-1 ring-brand-100/50' : 'ring-1 ring-emerald-100/50',
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-3">
        <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
          <h3 className="min-w-0 flex-1 line-clamp-2 text-sm font-semibold leading-snug text-gray-900">{meeting.title}</h3>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => onEdit?.(meeting)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-50 hover:text-brand-600"
              title="Edit"
              aria-label="Edit meeting"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              title="Delete"
              aria-label="Delete meeting"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        {isVideo && meetLink ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-br from-[#e8f5e9]/80 via-white to-[#e3f2fd]/80 p-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-100/80">
                <GoogleMeetLogo className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-xs font-semibold text-gray-800">Google Meet</p>
                <p className="truncate text-[11px] text-gray-500">Video call</p>
              </div>
            </div>
            <div className="mt-2 flex h-9 items-center gap-1.5">
              <a
                href={meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1a73e8] px-3 text-xs font-semibold text-white hover:bg-[#1557b0]"
              >
                <GoogleMeetLogo className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Join</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              </a>
              <button
                type="button"
                onClick={copyMeetLink}
                title="Copy meeting link"
                aria-label="Copy meeting link"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {isVideo && !meetLink ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-gray-600">
            No Meet link yet.
          </div>
        ) : null}

        {!isVideo ? (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-2.5 py-2 text-xs text-emerald-900">
            <p className="font-semibold">Phone / offline</p>
            <p className="mt-0.5 text-[11px] leading-snug text-emerald-800/90">No video link — use dial-in or notes.</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', statusPillClass(displayStatus))}>
            {humanizeStatus(displayStatus)}
          </span>
          <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-brand-800 ring-1 ring-brand-100">
            {humanizeMeetingType(meeting.meetingType)}
          </span>
          {durationLabel ? <span className="text-[11px] font-medium text-gray-500">{durationLabel}</span> : null}
        </div>

        {rangeLabel ? (
          <div className="flex gap-2 rounded-lg border border-gray-100 bg-gray-50/80 p-2">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-snug text-gray-900">{rangeLabel}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                <Clock3 className="h-3 w-3 shrink-0" />
                {tz}
              </p>
            </div>
          </div>
        ) : null}

        {attendeeCount > 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-700">
            <Users className="h-3.5 w-3.5 shrink-0 text-gray-500" />
            <span>
              <span className="font-semibold">{attendeeCount}</span> participant{attendeeCount === 1 ? '' : 's'}
            </span>
          </div>
        ) : null}

        {leadId ? (
          <Link
            to={`/leads/${leadId}`}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-brand-600 hover:bg-brand-50"
          >
            <Briefcase className="h-3.5 w-3.5 shrink-0" />
            Open lead
            <ExternalLink className="h-3 w-3 opacity-70" />
          </Link>
        ) : null}

        {meeting.agenda ? (
          <div className="min-h-0">
            <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              <MapPin className="h-3 w-3" />
              Agenda
            </p>
            <div className="max-h-28 overflow-y-auto rounded-lg border border-gray-100 bg-white p-2 text-xs leading-relaxed text-gray-700 scrollbar-subtle">
              {meeting.agenda}
            </div>
          </div>
        ) : (
          <p className="text-[11px] italic text-gray-400">No agenda added.</p>
        )}
      </div>
    </article>
  )
}

export function MeetingsListPanel({ meetings, channel, isLoading, onEdit }) {
  const [deleteMeeting] = useDeleteMeetingMutation()
  const [deletingId, setDeletingId] = useState(null)

  const handleDeleteMeeting = useCallback(
    async (id) => {
      if (!confirm('Delete this meeting?')) return
      setDeletingId(id)
      try {
        await deleteMeeting(id).unwrap()
        toast.success('Meeting removed')
      } catch {
        toast.error('Could not delete meeting')
      } finally {
        setDeletingId(null)
      }
    },
    [deleteMeeting],
  )

  if (isLoading) {
    return <SkeletonCards count={6} cols="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" cardHeight="h-52" />
  }

  if (!meetings?.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 py-14 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200">
          {channel === 'video' ? <GoogleMeetLogo className="h-6 w-6" /> : <Phone className="h-5 w-5 text-emerald-700" />}
        </div>
        <p className="text-sm font-medium text-gray-800">
          {channel === 'video' ? 'No video meetings match' : 'No calls match'}
        </p>
        <p className="mt-1 text-xs text-gray-500">Try another tab, search, or dates.</p>
      </div>
    )
  }

  return (
    <div className="mt-2 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
      {meetings.map((m) => (
        <MeetingDetailCard
          key={m.id}
          meeting={m}
          channel={channel}
          onEdit={onEdit}
          onDelete={handleDeleteMeeting}
          deletingId={deletingId}
        />
      ))}
    </div>
  )
}
