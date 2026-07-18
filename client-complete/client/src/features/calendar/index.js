// Calendar feature exports
export { calendarApi, useGetCalendarEventsQuery, useGetCalendarTodayQuery } from './calendarApi'
export { remindersApi, useGetRemindersQuery, useCreateReminderMutation, usePatchReminderMutation, useDeleteReminderMutation } from '../reminders/remindersApi'
export { EVENT_COLORS, getEventColor, getKindBgClass, CALENDAR_FILTERS } from './eventColors'

// Components
export { MiniMonthPicker } from './components/MiniMonthPicker'
export { CalendarFilters } from './components/CalendarFilters'
export { TodayList } from './components/TodayList'
export { DayNotesPanel } from './components/DayNotesPanel'
export { EventChip, CalendarEvent } from './components/EventChip'
export { CreateReminderDrawer } from './components/CreateReminderDrawer'
export { TaskEventHoverCard } from './components/TaskEventHoverCard'
export { MeetingEventHoverCard } from './components/MeetingEventHoverCard'
export { FollowupEventHoverCard } from './components/FollowupEventHoverCard'
export { OpportunityEventHoverCard } from './components/OpportunityEventHoverCard'
export { ReminderEventHoverCard } from './components/ReminderEventHoverCard'
export { CalendarWorkspace } from './components/CalendarWorkspace'
