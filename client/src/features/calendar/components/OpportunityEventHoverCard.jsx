import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { TrendingUp, Calendar, Clock3, Briefcase, ExternalLink, User, DollarSign } from 'lucide-react'
import { cn } from '@/utils/cn'
import { computeCalendarPopoverPosition } from '@/utils/calendarPopoverPosition'

function formatStage(stage) {
  if (stage == null || stage === '') return null
  return String(stage).replace(/_/g, ' ')
}

export function OpportunityEventHoverCard({ event, anchorRect, onMouseEnter, onMouseLeave, exiting = false, onExitTransitionEnd }) {
  const leadId = event?.leadId
  const opportunityId = event?.opportunityId || event?.sourceId

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

  const rawValue = event?.meta?.dealValue
  const stage = event?.meta?.stage ?? event?.status
  const stageLabel = formatStage(stage)

  const dealLine = useMemo(() => {
    if (rawValue == null || rawValue === '') return null
    const n = typeof rawValue === 'number' ? rawValue : Number(rawValue)
    if (Number.isFinite(n) && !Number.isNaN(n)) {
      return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    }
    const s = String(rawValue).trim()
    return s || null
  }, [rawValue])

  if (!anchorRect) return null

  return (
    <div
      role="dialog"
      aria-label="Opportunity details"
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
      <div className="flex items-start justify-between gap-2 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-md bg-violet-600/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-900 ring-1 ring-violet-200">
            Opportunity
          </span>
          <p className="mt-1.5 text-sm font-semibold leading-snug text-gray-900">{event.title}</p>
          {event?.opportunityName ? (
            <p className="mt-0.5 truncate text-[11px] font-medium text-violet-800/90">{event.opportunityName}</p>
          ) : null}
        </div>
        <TrendingUp className="h-5 w-5 shrink-0 text-violet-600" aria-hidden />
      </div>

      <div className="scrollbar-subtle min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <div className="overflow-hidden rounded-lg border border-violet-100 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/40 p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-violet-100">
              <TrendingUp className="h-5 w-5 text-violet-600" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              {dealLine ? (
                <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                  <DollarSign className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />
                  {dealLine}
                </p>
              ) : (
                <p className="text-[11px] font-semibold text-gray-700">Deal value not set</p>
              )}
              <p className="mt-1 text-[10px] font-medium text-gray-500">Pipeline opportunity</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {stageLabel ? (
            <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-violet-900 ring-1 ring-violet-200">
              {stageLabel}
            </span>
          ) : null}
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
                Shown on calendar from record date
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          {opportunityId ? (
            <Link
              to={`/opportunities/${opportunityId}`}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-800 shadow-sm transition hover:bg-violet-50',
              )}
            >
              Open deal
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </Link>
          ) : null}
        </div>

        {event?.leadName && leadId ? (
          <Link
            to={`/leads/${leadId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-violet-700 hover:bg-violet-50/50"
          >
            <Briefcase className="h-4 w-4 shrink-0" />
            Lead: {event.leadName}
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </Link>
        ) : null}
      </div>
    </div>
  )
}
