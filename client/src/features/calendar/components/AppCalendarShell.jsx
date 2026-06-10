import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Search, MoreHorizontal, X } from 'lucide-react'
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, isAfter, isBefore, startOfDay } from 'date-fns'
import { Calendar } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { cn } from '@/utils/cn'
import { calendarLocalizer, CALENDAR_VIEW_OPTIONS, Views } from '@/features/calendar/calendarLocalizer'
import { MiniMonthPicker } from '@/features/calendar/components/MiniMonthPicker'
import { CalendarFilters } from '@/features/calendar/components/CalendarFilters'
import { TodayList } from '@/features/calendar/components/TodayList'
import { DayNotesPanel } from '@/features/calendar/components/DayNotesPanel'
import { EventChip } from '@/features/calendar/components/EventChip'
import { getEventColor, CALENDAR_FILTERS } from '@/features/calendar/eventColors'
import { useAppSelector } from '@/app/hooks'

/**
 * Shared Calendar & Meetings shell (react-big-calendar + sidebars).
 * Used by workspace calendar, attendance, and leave.
 */
export function AppCalendarShell({
  className,
  events = [],
  onSelectSlot,
  onSelectEvent,
  EventComponent,
  leftSidebar,
  rightPanel,
  showRightPanel = true,
  showSearch = false,
  showFilters = false,
  showProfile = false,
  showMoreMenu = false,
  selectable = true,
  defaultView = Views.MONTH,
  lockedTypes = null,
  selectedTypes: controlledTypes,
  onTypesChange,
  typeCounts: externalTypeCounts,
  toolbarExtra,
  syncPeriod,
  onPeriodChange,
  onDateRangeChange,
  highlightAttendanceStatus = false,
  dayStatusByDate: externalDayStatusByDate = null,
  searchPlaceholder = 'Search title, lead, notes…',
}) {
  const [currentDate, setCurrentDate] = useState(() =>
    syncPeriod?.year && syncPeriod?.month ? new Date(syncPeriod.year, syncPeriod.month - 1, 1) : new Date(),
  )
  const [selectedDate, setSelectedDate] = useState(currentDate)
  const [view, setView] = useState(defaultView)
  const [selectedTypes, setSelectedTypes] = useState(
    () => controlledTypes || (lockedTypes?.length ? [...lockedTypes] : ['meeting', 'task', 'followup', 'opportunity', 'reminder']),
  )
  const [selectedRange, setSelectedRange] = useState({ start: null, end: null })
  const [calendarSearchOpen, setCalendarSearchOpen] = useState(false)
  const [calendarSearchQuery, setCalendarSearchQuery] = useState('')
  const searchInputRef = useRef(null)
  const periodNotifyRef = useRef(false)

  const user = useAppSelector((state) => state.auth.user)

  useEffect(() => {
    if (!syncPeriod?.year || !syncPeriod?.month) return
    const next = new Date(syncPeriod.year, syncPeriod.month - 1, 1)
    periodNotifyRef.current = true
    setCurrentDate(next)
    setSelectedDate((prev) => (isSameDay(prev, next) ? prev : next))
  }, [syncPeriod?.year, syncPeriod?.month])

  useEffect(() => {
    if (!onPeriodChange) return
    if (periodNotifyRef.current) {
      periodNotifyRef.current = false
      return
    }
    onPeriodChange(currentDate.getFullYear(), currentDate.getMonth() + 1)
  }, [currentDate, onPeriodChange])

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

  useEffect(() => {
    onDateRangeChange?.({ ...dateRange, currentDate, view })
  }, [dateRange, currentDate, view, onDateRangeChange])

  const handleRangePick = (pickedDate) => {
    if (!selectedRange.start || (selectedRange.start && selectedRange.end)) {
      setSelectedRange({ start: pickedDate, end: null })
      return
    }
    if (isAfter(selectedRange.start, pickedDate)) {
      setSelectedRange({ start: pickedDate, end: selectedRange.start })
      setCurrentDate(pickedDate)
      return
    }
    setSelectedRange({ start: selectedRange.start, end: pickedDate })
    setCurrentDate(selectedRange.start)
  }

  const clearRange = () => setSelectedRange({ start: null, end: null })

  const normalizedEvents = useMemo(
    () =>
      events.map((event) => {
        const start = event.start instanceof Date ? event.start : new Date(event.start)
        let end = event.end instanceof Date ? event.end : new Date(event.end || event.start)
        const allDay = event.allDay !== false
        if (allDay) {
          const dayStart = startOfDay(start)
          const dayEnd = startOfDay(end)
          end = dayEnd <= dayStart ? addDays(dayStart, 1) : dayEnd
          if (end <= dayStart) end = addDays(dayStart, 1)
        }
        return { ...event, start: allDay ? startOfDay(start) : start, end, allDay }
      }),
    [events],
  )

  const displayedEvents = useMemo(() => {
    const q = calendarSearchQuery.trim().toLowerCase()
    if (!q) return normalizedEvents
    return normalizedEvents.filter((e) => {
      const hay = [e.title, e.status, e.kind, e.leadName, e.ownerName].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [normalizedEvents, calendarSearchQuery])

  const hasCustomRange = Boolean(selectedRange.start && selectedRange.end)

  const rangeFilteredEvents = useMemo(() => {
    if (!hasCustomRange) return displayedEvents
    const from = startOfDay(selectedRange.start)
    const to = startOfDay(selectedRange.end)
    return displayedEvents.filter((e) => {
      const day = startOfDay(e.start instanceof Date ? e.start : new Date(e.start))
      return !isBefore(day, from) && !isAfter(day, to)
    })
  }, [displayedEvents, hasCustomRange, selectedRange.start, selectedRange.end])

  const attendanceStatusByDate = useMemo(() => {
    if (externalDayStatusByDate) return externalDayStatusByDate
    if (!highlightAttendanceStatus) return {}
    const map = {}
    for (const event of normalizedEvents) {
      if (event.kind !== 'attendance' && event.kind !== 'attendance_team') continue
      const key = format(startOfDay(event.start instanceof Date ? event.start : new Date(event.start)), 'yyyy-MM-dd')
      const status = String(event.status || '').toLowerCase()
      if (status === 'absent') map[key] = 'absent'
      else if (!map[key] && status) map[key] = status
    }
    return map
  }, [normalizedEvents, highlightAttendanceStatus, externalDayStatusByDate])

  const isDateInSelectedRange = useCallback(
    (date) => {
      if (!hasCustomRange) return true
      const day = startOfDay(date)
      const from = startOfDay(selectedRange.start)
      const to = startOfDay(selectedRange.end)
      return !isBefore(day, from) && !isAfter(day, to)
    },
    [hasCustomRange, selectedRange.start, selectedRange.end],
  )

  const allEvents = useMemo(
    () =>
      rangeFilteredEvents.map((e) => ({
        ...e,
        color: e.color || getEventColor(e.kind, e.status, e.meta),
      })),
    [rangeFilteredEvents],
  )

  const typeCounts = useMemo(() => {
    if (externalTypeCounts) return externalTypeCounts
    const counts = { meeting: 0, task: 0, followup: 0, opportunity: 0, reminder: 0 }
    displayedEvents.forEach((event) => {
      if (counts[event.kind] !== undefined) counts[event.kind]++
    })
    return counts
  }, [displayedEvents, externalTypeCounts])

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
    onSelectEvent?.(event)
  }

  const DefaultEventComponent = useCallback(
    ({ event }) => (
      <EventChip
        event={{ ...event, color: event.color || getEventColor(event.kind, event.status, event.meta) }}
        view={view}
        onClick={handleEventClick}
      />
    ),
    [view, handleEventClick],
  )

  const Chip = EventComponent || DefaultEventComponent

  const handleSlotSelect = (slotInfo) => {
    setSelectedDate(slotInfo.start)
    onSelectSlot?.(slotInfo)
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

  const types = controlledTypes ?? selectedTypes
  const setTypes = onTypesChange ?? setSelectedTypes

  return (
    <div className={cn(
      'flex min-h-0 overflow-hidden bg-white',
      highlightAttendanceStatus && 'calendar-attendance-mode',
      className,
    )}>
      <div className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white">
        <div className="scrollbar-subtle space-y-6 overflow-y-auto p-4">
          <div className="rounded-xl border border-brand-200 bg-white p-3 shadow-sm">
            <MiniMonthPicker
              currentDate={currentDate}
              selectedDate={selectedDate}
              rangeStart={selectedRange.start}
              rangeEnd={selectedRange.end}
              dayStatusByDate={highlightAttendanceStatus ? attendanceStatusByDate : null}
              onChange={(date) => {
                setCurrentDate(date)
                setSelectedDate(date)
              }}
              onRangePick={handleRangePick}
              events={allEvents}
            />
          </div>

          {leftSidebar}

          {showFilters ? (
            lockedTypes?.length ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                Showing only <strong className="text-gray-900">{lockedTypesLabel}</strong> from your workspace calendar
                on this page.
              </div>
            ) : (
              <CalendarFilters selectedTypes={types} onChange={setTypes} counts={typeCounts} />
            )
          ) : null}

          <div className="space-y-6 rounded-xl border border-brand-200 bg-white p-3">
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
            {hasCustomRange ? (
              <button
                type="button"
                onClick={clearRange}
                className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Clear range
              </button>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
            {toolbarExtra}
            <div className="flex shrink-0 items-center rounded-lg bg-gray-100 p-0.5">
              {CALENDAR_VIEW_OPTIONS.map((option) => (
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

            {showSearch && calendarSearchOpen ? (
              <div className="flex min-w-0 max-w-[min(100%,18rem)] flex-1 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 shadow-sm sm:max-w-xs">
                <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={calendarSearchQuery}
                  onChange={(e) => setCalendarSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  aria-label="Search calendar"
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

            {showSearch ? (
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
                  calendarSearchOpen ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:bg-gray-100',
                )}
              >
                <Search className="h-5 w-5" />
              </button>
            ) : null}

            {showMoreMenu ? (
              <button type="button" className="rounded-lg p-2 transition-colors hover:bg-gray-100">
                <MoreHorizontal className="h-5 w-5 text-gray-500" />
              </button>
            ) : null}

            {showProfile ? (
              user?.profilePhotoUrl ? (
                <img
                  src={user.profilePhotoUrl}
                  alt={user.name}
                  className="h-8 w-8 rounded-full border border-gray-200 object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
              )
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <Calendar
            localizer={calendarLocalizer}
            events={allEvents}
            startAccessor="start"
            endAccessor="end"
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
            view={view}
            date={currentDate}
            onView={setView}
            onNavigate={(date) => {
              setCurrentDate(date)
              setSelectedDate(date)
            }}
            selectable={selectable}
            onSelectSlot={handleSlotSelect}
            onSelectEvent={(event) => {
              if (event?.start) setSelectedDate(new Date(event.start))
              handleEventClick(event)
            }}
            popup
            showAllEvents
            components={{ event: (props) => <Chip {...props} view={view} onClick={handleEventClick} /> }}
            eventPropGetter={() => ({
              style: { backgroundColor: 'transparent', border: 'none', padding: 0 },
            })}
            dayPropGetter={(date) => {
              const dateKey = format(date, 'yyyy-MM-dd')
              const classes = []
              const style = {}
              const isAbsent = highlightAttendanceStatus && attendanceStatusByDate[dateKey] === 'absent'
              const isExcluded = hasCustomRange && !isDateInSelectedRange(date)

              if (isAbsent && !isExcluded) {
                classes.push('rbc-day-absent')
                style.backgroundColor = '#fca5a5'
                style.backgroundImage = 'none'
              } else if (isExcluded) {
                classes.push('rbc-day-excluded')
              } else if (isSameDay(date, selectedDate)) {
                style.backgroundColor = '#eef2ff'
              }

              return {
                className: classes.join(' ') || undefined,
                style,
                onClick: () => setSelectedDate(date),
              }
            }}
            formats={{
              timeGutterFormat: (date, culture, loc) => loc.format(date, 'h a', culture),
              eventTimeRangeFormat: ({ start, end }, culture, loc) =>
                `${loc.format(start, 'h:mm a', culture)} - ${loc.format(end, 'h:mm a', culture)}`,
            }}
            style={{ height: '100%', minHeight: 480 }}
            min={new Date(0, 0, 0, 6, 0, 0)}
            max={new Date(0, 0, 0, 22, 0, 0)}
            step={30}
            timeslots={2}
          />
        </div>
      </div>

      {showRightPanel ? (
        <div className="w-60 shrink-0 overflow-y-auto border-l border-gray-200 bg-gradient-to-b from-gray-50 to-white scrollbar-subtle">
          <div className="p-3">
            {rightPanel ?? (
              <DayNotesPanel selectedDate={selectedDate} events={allEvents} onEventClick={handleEventClick} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
