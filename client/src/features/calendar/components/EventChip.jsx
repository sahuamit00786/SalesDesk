import { useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { Video, CheckSquare, Phone, TrendingUp, Bell, Paperclip } from 'lucide-react'
import { cn } from '@/utils/cn'
import { TaskEventHoverCard } from '@/features/calendar/components/TaskEventHoverCard'
import { MeetingEventHoverCard } from '@/features/calendar/components/MeetingEventHoverCard'
import { FollowupEventHoverCard } from '@/features/calendar/components/FollowupEventHoverCard'
import { OpportunityEventHoverCard } from '@/features/calendar/components/OpportunityEventHoverCard'
import { ReminderEventHoverCard } from '@/features/calendar/components/ReminderEventHoverCard'
import { computeCalendarPopoverPosition } from '@/utils/calendarPopoverPosition'

const iconMap = {
  meeting: Video,
  task: CheckSquare,
  followup: Phone,
  opportunity: TrendingUp,
  reminder: Bell,
}

export function EventChip({ event, onClick, view = 'week' }) {
  const EventIcon = iconMap[event.kind] || Bell
  const isCompleted = event.status === 'completed' || event.status === 'done'
  const chipRef = useRef(null)
  const hoverTimerRef = useRef(null)
  const hideTimerRef = useRef(null)
  /** closed | open | exiting */
  const [phase, setPhase] = useState('closed')
  const [anchorRect, setAnchorRect] = useState(null)
  const phaseRef = useRef('closed')
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const finalizeClose = useCallback(() => {
    setPhase('closed')
    setAnchorRect(null)
  }, [])

  const beginClose = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    setPhase((p) => {
      if (p === 'closed' || p === 'exiting') return p
      return 'exiting'
    })
  }, [])

  const showPopover = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      hoverTimerRef.current = null
      const rect = chipRef.current?.getBoundingClientRect()
      if (rect) {
        setAnchorRect(rect)
        setPhase('open')
      }
    }, 140)
  }, [])

  const scheduleHidePopover = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    // Delay when leaving the chip so the pointer can move into the card without closing.
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null
      beginClose()
    }, 360)
  }, [beginClose])

  /** Leaving the hover card: close right away and run exit animation (handled on the card). */
  const hidePopoverLeavingCard = useCallback(() => {
    beginClose()
  }, [beginClose])

  const keepPopoverOpen = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const handleExitTransitionEnd = useCallback(() => {
    if (phaseRef.current === 'exiting') finalizeClose()
  }, [finalizeClose])

  useEffect(() => {
    if (phase !== 'exiting') return
    const t = window.setTimeout(() => {
      if (phaseRef.current === 'exiting') finalizeClose()
    }, 260)
    return () => window.clearTimeout(t)
  }, [phase, finalizeClose])

  const start = event?.start ? new Date(event.start) : null
  const end = event?.end ? new Date(event.end) : null
  const timeLabel = start
    ? `${format(start, 'MMM d, h:mm a')}${end ? ` - ${format(end, 'h:mm a')}` : ''}`
    : null
  const compactTime = start
    ? `${format(start, 'HH:mm')}${end ? ` - ${format(end, 'HH:mm')}` : ''}`
    : ''

  const showTaskAttachmentGlyph =
    event.kind === 'task' && Array.isArray(event.meta?.attachments) && event.meta.attachments.length > 0

  const renderMeetingStrip = () => {
    if (view === 'month') {
      return (
        <>
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500/80 shrink-0" />
          <span className="truncate">{event.title}</span>
        </>
      )
    }
    if (view === 'week') {
      return (
        <div className="min-w-0 w-full">
          <div className="flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{event.title}</span>
          </div>
          <div className="text-[10px] font-medium opacity-90 mt-0.5">{compactTime}</div>
        </div>
      )
    }
    return (
      <>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Video className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{event.title}</span>
          </div>
          <span className="text-[10px] rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700">Meet</span>
        </div>
        <div className="text-[10px] font-medium opacity-90">{compactTime}</div>
        {event.leadName && <div className="text-[10px] opacity-80 truncate">{event.leadName}</div>}
      </>
    )
  }

  const renderFollowupStrip = () => {
    if (view === 'month') {
      return (
        <>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 shrink-0" />
          <span className="truncate">{event.title}</span>
        </>
      )
    }
    if (view === 'week') {
      return (
        <div className="min-w-0 w-full">
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{event.title}</span>
          </div>
          <div className="text-[10px] font-medium opacity-90 mt-0.5">{compactTime}</div>
        </div>
      )
    }
    return (
      <>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{event.title}</span>
          </div>
          <span className="text-[10px] rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">Follow-up</span>
        </div>
        <div className="text-[10px] font-medium opacity-90">{compactTime}</div>
        {event.leadName && <div className="text-[10px] opacity-80 truncate">{event.leadName}</div>}
      </>
    )
  }

  return (
    <>
      <div
        ref={chipRef}
        onMouseEnter={showPopover}
        onMouseLeave={scheduleHidePopover}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(event)
        }}
        className={cn(
          'w-full cursor-pointer transition-all hover:opacity-95',
          view === 'month' && 'px-2 py-0.5 rounded-sm text-[11px] font-semibold truncate flex items-center gap-1',
          view === 'week' && 'px-2 py-1 rounded-md text-xs font-semibold flex items-start gap-1.5 shadow-sm',
          view === 'day' && 'px-2.5 py-2 rounded-md text-xs font-semibold flex flex-col gap-1 shadow-sm',
          isCompleted && 'opacity-60'
        )}
        style={{
          backgroundColor: `${event.color}1f`,
          color: event.color,
          borderLeft: `3px solid ${event.color}`,
        }}
      >
        {event.kind === 'meeting'
          ? renderMeetingStrip()
          : event.kind === 'followup'
          ? renderFollowupStrip()
          : view === 'day'
          ? (
            <>
              <div className="flex min-w-0 items-center gap-1.5">
                <EventIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{event.title}</span>
                {showTaskAttachmentGlyph ? (
                  <Paperclip className="h-3 w-3 shrink-0 opacity-70" aria-hidden title="Has attachments" />
                ) : null}
              </div>
              <div className="text-[10px] font-medium opacity-80">{compactTime}</div>
            </>
          )
          : view === 'week'
          ? (
            <>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <EventIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{event.title}</span>
                  {showTaskAttachmentGlyph ? (
                    <Paperclip className="mt-0.5 h-3 w-3 shrink-0 opacity-70" aria-hidden title="Has attachments" />
                  ) : null}
                </div>
                <div className="text-[10px] font-medium opacity-80">{compactTime}</div>
              </div>
            </>
          )
          : (
            <>
              <EventIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{event.title}</span>
              {showTaskAttachmentGlyph ? (
                <Paperclip className="h-2.5 w-2.5 shrink-0 opacity-70" aria-hidden title="Has attachments" />
              ) : null}
            </>
          )}
      </div>

      {anchorRect && (phase === 'open' || phase === 'exiting') && createPortal(
        event.kind === 'task' ? (
          <TaskEventHoverCard
            event={event}
            anchorRect={anchorRect}
            exiting={phase === 'exiting'}
            onExitTransitionEnd={handleExitTransitionEnd}
            onMouseEnter={keepPopoverOpen}
            onMouseLeave={hidePopoverLeavingCard}
          />
        ) : event.kind === 'meeting' ? (
          <MeetingEventHoverCard
            event={event}
            anchorRect={anchorRect}
            exiting={phase === 'exiting'}
            onExitTransitionEnd={handleExitTransitionEnd}
            onMouseEnter={keepPopoverOpen}
            onMouseLeave={hidePopoverLeavingCard}
          />
        ) : event.kind === 'followup' ? (
          <FollowupEventHoverCard
            event={event}
            anchorRect={anchorRect}
            exiting={phase === 'exiting'}
            onExitTransitionEnd={handleExitTransitionEnd}
            onMouseEnter={keepPopoverOpen}
            onMouseLeave={hidePopoverLeavingCard}
          />
        ) : event.kind === 'opportunity' ? (
          <OpportunityEventHoverCard
            event={event}
            anchorRect={anchorRect}
            exiting={phase === 'exiting'}
            onExitTransitionEnd={handleExitTransitionEnd}
            onMouseEnter={keepPopoverOpen}
            onMouseLeave={hidePopoverLeavingCard}
          />
        ) : event.kind === 'reminder' ? (
          <ReminderEventHoverCard
            event={event}
            anchorRect={anchorRect}
            exiting={phase === 'exiting'}
            onExitTransitionEnd={handleExitTransitionEnd}
            onMouseEnter={keepPopoverOpen}
            onMouseLeave={hidePopoverLeavingCard}
          />
        ) : (
          (() => {
            const p = computeCalendarPopoverPosition(anchorRect)
            const exiting = phase === 'exiting'
            return (
              <div
                onMouseEnter={keepPopoverOpen}
                onMouseLeave={hidePopoverLeavingCard}
                onTransitionEnd={(e) => {
                  if (e.target !== e.currentTarget) return
                  if (e.propertyName !== 'opacity') return
                  if (exiting) handleExitTransitionEnd()
                }}
                className={cn(
                  'fixed z-[130] flex min-h-0 w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl transition-[opacity,transform] duration-200 ease-out will-change-[opacity,transform]',
                  exiting ? 'pointer-events-none opacity-0 scale-[0.97] translate-y-1' : 'opacity-100 scale-100 translate-y-0',
                )}
                style={{ top: p.top, left: p.left, maxHeight: p.maxCardHeight }}
              >
                <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50 px-3 py-2.5">
                  <span className="inline-flex rounded-md bg-gray-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-700 ring-1 ring-gray-300/80">
                    {event.kind || 'Event'}
                  </span>
                  <p className="mt-1.5 text-sm font-semibold text-gray-900">{event.title}</p>
                </div>
                <div className="space-y-2 p-3">
                  {timeLabel ? <p className="text-xs text-gray-600">{timeLabel}</p> : null}
                  {event.leadName ? <p className="text-xs text-gray-600">Lead: {event.leadName}</p> : null}
                </div>
              </div>
            )
          })()
        ),
        document.body
      )}
    </>
  )
}

// Custom event component for react-big-calendar
export function CalendarEvent({ event }) {
  return <EventChip event={event} />
}
