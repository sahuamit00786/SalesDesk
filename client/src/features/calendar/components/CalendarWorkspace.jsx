import { useState, useMemo, useCallback } from 'react'
import { AppCalendarShell } from '@/features/calendar/components/AppCalendarShell'
import { CreateReminderDrawer } from '@/features/calendar/components/CreateReminderDrawer'
import { DealDetailPanel } from '@/features/deals/components/DealDetailPanel'
import { getEventColor } from '@/features/calendar/eventColors'
import { useGetCalendarEventsQuery } from '@/features/calendar/calendarApi'
import { useGetLeadFormMetaQuery } from '@/features/leads/leadsApi'
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
  const [dealPanel, setDealPanel] = useState({ open: false, opp: null })

  const { data: formMetaData } = useGetLeadFormMetaQuery()
  const pipelineStatuses = useMemo(() => {
    const rows = formMetaData?.data?.pipelineStatuses || []
    return [...rows].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
  }, [formMetaData])

  const openOpportunityPanel = useCallback((opp) => setDealPanel({ open: true, opp }), [])

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
        onOpenOpportunity={openOpportunityPanel}
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
      <DealDetailPanel
        open={dealPanel.open}
        opp={dealPanel.opp}
        pipelineStatuses={pipelineStatuses}
        onClose={() => setDealPanel({ open: false, opp: null })}
      />
    </>
  )
}
