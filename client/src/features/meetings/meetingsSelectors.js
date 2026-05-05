export const selectMeetingFilters = (state) =>
  state.meetings.filters

export const selectMeetingPagination = (state) =>
  state.meetings.pagination

export const selectMeetingSort = (state) =>
  state.meetings.sort

export const selectLiveMeeting = (state) =>
  state.meetings.liveMeeting

export const selectMeetingNotifications = (state) =>
  state.meetings.notifications