import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Search, MoreHorizontal, X } from 'lucide-react'
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, isAfter } from 'date-fns'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { cn } from '@/utils/cn'
import { useGetCalendarEventsQuery } from '@/features/calendar/calendarApi'
import { MiniMonthPicker } from '@/features/calendar/components/MiniMonthPicker'
import { CalendarFilters } from '@/features/calendar/components/CalendarFilters'
import { TodayList } from '@/features/calendar/components/TodayList'
import { DayNotesPanel } from '@/features/calendar/components/DayNotesPanel'
import { EventChip } from '@/features/calendar/components/EventChip'
import { CreateReminderDrawer } from '@/features/calendar/components/CreateReminderDrawer'
import { getEventColor, CALENDAR_FILTERS } from '@/features/calendar/eventColors'
import { useAppSelector } from '@/app/hooks'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse: (value) => new Date(value),
  startOfWeek,
  getDay: (date) => date.getDay(),
  locales,
})

const VIEW_OPTIONS = [
  { id: Views.DAY, label: 'Day' },
  { id: Views.WEEK, label: 'Full Week' },
  { id: Views.MONTH, label: 'Month' },
]

/**
 * @param {string} [className]
 * @param {string[] | null} [lockedTypes] — e.g. ['task'] for Tasks page calendar tab
 */
export function CalendarWorkspace({ className, lockedTypes = null }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState(Views.MONTH)
  const [selectedTypes, setSelectedTypes] = useState(() =>
    lockedTypes?.length ? [...lockedTypes] : ['meeting', 'task', 'followup', 'opportunity', 'reminder'],
  )
  const [selectedRange, setSelectedRange] = useState({ start: null, end: null })
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false)
  const [createDrawerDate, setCreateDrawerDate] = useState(new Date())
  const [calendarSearchOpen, setCalendarSearchOpen] = useState(false)
  const [calendarSearchQuery, setCalendarSearchQuery] = useState('')
  const searchInputRef = useRef(null)

  const user = useAppSelector((state) => state.auth.user)
  const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)

  const typesForQuery = lockedTypes?.length ? lockedTypes : selectedTypes

  const lockedTypesLabel = useMemo(() => {
    if (!lockedTypes?.length) return null
    if (lockedTypes.length === 1) {
      return CALENDAR_FILTERS.find((f) => f.id === lockedTypes[0])?.label || lockedTypes[0]
    }
    return lockedTypes.join(', ')
  }, [lockedTypes])

  const dateRange = useMemo(() => {
    if (selectedRange.start && selectedRange.end) {
      const from = new Date(selectedRange.start)
      from.setHours(0, 0, 0, 0)
      const to = new Date(selectedRange.end)
      to.setHours(23, 59, 59, 999)
      return { from: from.toISOString(), to: to.toISOString(), isCustom: true }
    }

    let from
    let to
    switch (view) {
      case Views.DAY:
        from = new Date(currentDate)
        from.setHours(0, 0, 0, 0)
        to = new Date(currentDate)
        to.setHours(23, 59, 59, 999)
        break
      case Views.WEEK:
        from = startOfWeek(currentDate, { weekStartsOn: 1 })
        to = endOfWeek(currentDate, { weekStartsOn: 1 })
        break
      case Views.MONTH:
        from = startOfMonth(currentDate)
        to = endOfMonth(currentDate)
        break
      default:
        from = startOfWeek(currentDate, { weekStartsOn: 1 })
        to = endOfWeek(currentDate, { weekStartsOn: 1 })
    }
    return { from: from.toISOString(), to: to.toISOString(), isCustom: false }
  }, [currentDate, view, selectedRange])

  const handleRangePick = (pickedDate) => {
    if (!selectedRange.start || (selectedRange.start && selectedRange.end)) {
      setSelectedRange({ start: pickedDate, end: null })
      return
    }
    if (isAfter(selectedRange.start, pickedDate)) {
      setSelectedRange({ start: pickedDate, end: selectedRange.start })
      return
    }
    setSelectedRange({ start: selectedRange.start, end: pickedDate })
  }

  const clearRange = () => setSelectedRange({ start: null, end: null })

  const { data: eventsData } = useGetCalendarEventsQuery(
    {
      from: dateRange.from,
      to: dateRange.to,
      types: typesForQuery,
      ownerUserId: user?.id,
    },
    {
      skip: !activeWorkspaceId,
    },
  )

  const calendarEvents = useMemo(() => {
    if (!eventsData?.data) return []

    return eventsData.data.map((event) => ({
      ...event,
      title: event.title,
      start: new Date(event.start),
      end: event.end ? new Date(event.end) : new Date(event.start),
      allDay: event.allDay || false,
      resource: event,
    }))
  }, [eventsData])

  const displayedCalendarEvents = useMemo(() => {
    const q = calendarSearchQuery.trim().toLowerCase()
    if (!q) return calendarEvents
    return calendarEvents.filter((e) => {
      const hay = [
        e.title,
        e.leadName,
        e.ownerName,
        e.opportunityName,
        e.status,
        e.kind,
        e.meta?.remark,
        e.meta?.agenda,
        e.meta?.description,
        e.meta?.notes,
        e.meta?.meetingType,
        e.meta?.stage,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [calendarEvents, calendarSearchQuery])

  const typeCounts = useMemo(() => {
    const counts = { meeting: 0, task: 0, followup: 0, opportunity: 0, reminder: 0 }
    displayedCalendarEvents.forEach((event) => {
      if (counts[event.kind] !== undefined) {
        counts[event.kind]++
      }
    })
    return counts
  }, [displayedCalendarEvents])

  const allEvents = useMemo(() => {
    return displayedCalendarEvents.map((e) => ({
      ...e,
      color: getEventColor(e.kind, e.status, e.meta),
    }))
  }, [displayedCalendarEvents])

  useEffect(() => {
    if (calendarSearchOpen) searchInputRef.current?.focus()
  }, [calendarSearchOpen])

  const handlePrev = () => {
    switch (view) {
      case Views.DAY:
        setCurrentDate(subDays(currentDate, 1))
        break
      case Views.WEEK:
        setCurrentDate(subDays(currentDate, 7))
        break
      case Views.MONTH:
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
        break
      default:
        break
    }
  }

  const handleNext = () => {
    switch (view) {
      case Views.DAY:
        setCurrentDate(addDays(currentDate, 1))
        break
      case Views.WEEK:
        setCurrentDate(addDays(currentDate, 7))
        break
      case Views.MONTH:
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
        break
      default:
        break
    }
  }

  const handleToday = () => {
    const now = new Date()
    setCurrentDate(now)
    setSelectedDate(now)
    clearRange()
  }

  const handleViewChange = (nextView) => {
    setView(nextView)
    clearRange()
  }

  const handleEventClick = (event) => {
    console.log('Event clicked:', event)
  }

  const EventComponent = useCallback(
    ({ event }) => (
      <EventChip
        event={{
          ...event,
          color: getEventColor(event.kind, event.status, event.meta),
        }}
        view={view}
        onClick={(e) => handleEventClick(e)}
      />
    ),
    [view],
  )

  const handleSlotSelect = (slotInfo) => {
    setCreateDrawerDate(slotInfo.start)
    setIsCreateDrawerOpen(true)
  }

  const getRangeLabel = () => {
    switch (view) {
      case Views.DAY:
        return format(currentDate, 'EEEE, d MMMM yyyy')
      case Views.WEEK: {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
        return `${format(weekStart, 'd MMMM')} - ${format(weekEnd, 'd MMMM yyyy')}`
      }
      case Views.MONTH:
        return format(currentDate, 'MMMM yyyy')
      default:
        return format(currentDate, 'MMMM yyyy')
    }
  }

  return (
    <>
      <div className={cn('flex min-h-0 overflow-hidden bg-white', className)}>
        <div className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white">
          <div className="scrollbar-subtle space-y-6 overflow-y-auto p-4">
            <div className="rounded-xl border border-indigo-200 bg-white p-3 shadow-sm">
              <MiniMonthPicker
                currentDate={currentDate}
                selectedDate={selectedDate}
                rangeStart={selectedRange.start}
                rangeEnd={selectedRange.end}
                onChange={(date) => {
                  setCurrentDate(date)
                  setSelectedDate(date)
                }}
                onRangePick={handleRangePick}
                events={allEvents}
              />
            </div>

            {lockedTypes?.length ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                Showing only <strong className="text-gray-900">{lockedTypesLabel}</strong> from your workspace calendar on
                this page.
              </div>
            ) : (
              <CalendarFilters selectedTypes={selectedTypes} onChange={setSelectedTypes} counts={typeCounts} />
            )}

            <div className="space-y-6 rounded-xl border border-indigo-200 bg-white p-3">
              <TodayList events={allEvents} selectedDate={selectedDate} title="Today" onEventClick={handleEventClick} />
              <TodayList
                events={allEvents}
                selectedDate={addDays(selectedDate, 1)}
                title="Tomorrow"
                onEventClick={handleEventClick}
              />
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-4 sm:px-6">
            <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={handleToday}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Today
              </button>
              <div className="flex items-center gap-1">
                <button type="button" onClick={handlePrev} className="rounded-lg p-1.5 transition-colors hover:bg-gray-100">
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <button type="button" onClick={handleNext} className="rounded-lg p-1.5 transition-colors hover:bg-gray-100">
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
              </div>
              <h2 className="text-[0.84375rem] font-semibold leading-snug text-gray-900">
                {dateRange.isCustom && selectedRange.start && selectedRange.end
                  ? `${format(selectedRange.start, 'd MMM')} - ${format(selectedRange.end, 'd MMM yyyy')}`
                  : getRangeLabel()}
              </h2>
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
              <div className="flex shrink-0 items-center rounded-lg bg-gray-100 p-0.5">
                {VIEW_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleViewChange(option.id)}
                    aria-pressed={view === option.id}
                    className={cn(
                      'select-none rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                      view === option.id
                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                        : 'text-gray-600 hover:bg-white/70 hover:text-gray-900',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {calendarSearchOpen ? (
                <div className="flex min-w-0 max-w-[min(100%,18rem)] flex-1 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 shadow-sm sm:max-w-xs">
                  <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={calendarSearchQuery}
                    onChange={(e) => setCalendarSearchQuery(e.target.value)}
                    placeholder="Search title, lead, notes…"
                    className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    aria-label="Search calendar events"
                  />
                  <button
                    type="button"
                    className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                    aria-label={calendarSearchQuery ? 'Clear search' : 'Close search'}
                    onClick={() => {
                      if (calendarSearchQuery) setCalendarSearchQuery('')
                      else {
                        setCalendarSearchOpen(false)
                        setCalendarSearchQuery('')
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setCalendarSearchOpen((open) => {
                    if (open) setCalendarSearchQuery('')
                    return !open
                  })
                }}
                aria-pressed={calendarSearchOpen}
                aria-label={calendarSearchOpen ? 'Hide search' : 'Search calendar'}
                className={cn(
                  'shrink-0 rounded-lg p-2 transition-colors',
                  calendarSearchOpen ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100',
                )}
              >
                <Search className="h-5 w-5" />
              </button>
              <button type="button" className="rounded-lg p-2 transition-colors hover:bg-gray-100">
                <MoreHorizontal className="h-5 w-5 text-gray-500" />
              </button>

              {user?.profilePhotoUrl ? (
                <img src={user.profilePhotoUrl} alt={user.name} className="h-8 w-8 rounded-full border border-gray-200 object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-4">
            <Calendar
              localizer={localizer}
              events={displayedCalendarEvents}
              startAccessor="start"
              endAccessor="end"
              view={view}
              date={currentDate}
              onView={setView}
              onNavigate={setCurrentDate}
              selectable
              onSelectSlot={handleSlotSelect}
              onSelectEvent={handleEventClick}
              components={{
                event: EventComponent,
              }}
              eventPropGetter={() => ({
                style: {
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: 0,
                },
              })}
              dayPropGetter={(date) => ({
                style: {
                  backgroundColor: isSameDay(date, selectedDate) ? '#eef2ff' : 'transparent',
                },
                onClick: () => setSelectedDate(date),
              })}
              formats={{
                timeGutterFormat: (date, culture, loc) => loc.format(date, 'h a', culture),
                eventTimeRangeFormat: ({ start, end }, culture, loc) =>
                  `${loc.format(start, 'h:mm a', culture)} - ${loc.format(end, 'h:mm a', culture)}`,
              }}
              min={new Date(0, 0, 0, 6, 0, 0)}
              max={new Date(0, 0, 0, 22, 0, 0)}
              step={30}
              timeslots={2}
            />
          </div>
        </div>

        <div className="w-60 shrink-0 overflow-y-auto border-l border-gray-200 bg-gradient-to-b from-gray-50 to-white scrollbar-subtle">
          <div className="p-3">
            <DayNotesPanel selectedDate={selectedDate} events={allEvents} onEventClick={handleEventClick} />
          </div>
        </div>
      </div>

      <CreateReminderDrawer isOpen={isCreateDrawerOpen} onClose={() => setIsCreateDrawerOpen(false)} initialDate={createDrawerDate} />
    </>
  )
}
