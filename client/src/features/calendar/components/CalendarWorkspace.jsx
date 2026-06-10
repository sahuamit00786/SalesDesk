import { useState, useMemo } from 'react'
import { AppCalendarShell } from '@/features/calendar/components/AppCalendarShell'
import { CreateReminderDrawer } from '@/features/calendar/components/CreateReminderDrawer'
import { getEventColor } from '@/features/calendar/eventColors'
import { useGetCalendarEventsQuery } from '@/features/calendar/calendarApi'
import { useAppSelector } from '@/app/hooks'

/**
 * @param {string} [className]
 * @param {string[] | null} [lockedTypes] — e.g. ['task'] for Tasks page calendar tab
 * @param {string} [filterAssignedTo] — optional userId to filter calendar events by assignee
 * @param {string} [filterLeadId] — optional leadId to filter calendar events by lead
 */
export function CalendarWorkspace({ className, lockedTypes = null, filterAssignedTo, filterLeadId }) {
  const [selectedTypes, setSelectedTypes] = useState(() =>
    lockedTypes?.length ? [...lockedTypes] : ['meeting', 'task', 'followup', 'opportunity', 'reminder'],
  )
  const [queryRange, setQueryRange] = useState(null)
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false)
  const [createDrawerDate, setCreateDrawerDate] = useState(new Date())

  const user = useAppSelector((state) => state.auth.user)
  const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId)

  const typesForQuery = lockedTypes?.length ? lockedTypes : selectedTypes

  const { data: eventsData } = useGetCalendarEventsQuery(
    {
      from: queryRange?.from,
      to: queryRange?.to,
      types: typesForQuery,
      ownerUserId: filterAssignedTo || user?.id,
      leadId: filterLeadId || undefined,
    },
    { skip: !activeWorkspaceId || !queryRange?.from },
  )

  const calendarEvents = useMemo(() => {
    if (!eventsData?.data) return []
    return eventsData.data.map((event) => ({
      ...event,
      title: event.title,
      start: new Date(event.start),
      end: event.end ? new Date(event.end) : new Date(event.start),
      allDay: event.allDay || false,
      color: getEventColor(event.kind, event.status, event.meta),
      resource: event,
    }))
  }, [eventsData])

  return (
    <>
      <AppCalendarShell
        className={className}
        events={calendarEvents}
        showSearch
        showFilters
        showProfile
        showMoreMenu
        lockedTypes={lockedTypes}
        selectedTypes={selectedTypes}
        onTypesChange={setSelectedTypes}
        onDateRangeChange={setQueryRange}
        onSelectSlot={(slotInfo) => {
          setCreateDrawerDate(slotInfo.start)
          setIsCreateDrawerOpen(true)
        }}
      />
      <CreateReminderDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        initialDate={createDrawerDate}
      />
    </>
  )
}
