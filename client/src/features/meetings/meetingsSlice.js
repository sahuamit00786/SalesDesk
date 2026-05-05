import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  selectedMeetingId: null,

  filters: {
    search: '',
    status: [],
    meetingType: [],
    assignedTo: [],
    dateFrom: null,
    dateTo: null,
  },

  sort: {
    field: 'scheduledStart',
    order: 'asc',
  },

  pagination: {
    page: 1,
    limit: 10,
    total: 0,
  },

  // used in MeetingRoom
  liveMeeting: {
    meetingId: null,
    isConnected: false,
    participants: [],
    transcript: [],
  },

  // optional cache for notification bell
  notifications: {
    upcoming: [],
    lastFetchedAt: null,
  },
}

const meetingsSlice = createSlice({
  name: 'meetings',
  initialState,
  reducers: {
    // -----------------------
    // selection
    // -----------------------
    setSelectedMeeting: (state, action) => {
      state.selectedMeetingId = action.payload
    },

    clearSelectedMeeting: (state) => {
      state.selectedMeetingId = null
    },

    // -----------------------
    // filters
    // -----------------------
    setMeetingFilters: (state, action) => {
      state.filters = {
        ...state.filters,
        ...action.payload,
      }
      state.pagination.page = 1
    },

    resetMeetingFilters: (state) => {
      state.filters = initialState.filters
      state.pagination.page = 1
    },

    // -----------------------
    // sorting
    // -----------------------
    setMeetingSort: (state, action) => {
      state.sort = action.payload
    },

    // -----------------------
    // pagination
    // -----------------------
    setMeetingPagination: (state, action) => {
      state.pagination = {
        ...state.pagination,
        ...action.payload,
      }
    },

    setMeetingTotal: (state, action) => {
      state.pagination.total = action.payload
    },

    // -----------------------
    // LIVE MEETING STATE
    // -----------------------
    setLiveMeeting: (state, action) => {
      state.liveMeeting.meetingId = action.payload
    },

    setMeetingConnection: (state, action) => {
      state.liveMeeting.isConnected = action.payload
    },

    setParticipants: (state, action) => {
      state.liveMeeting.participants = action.payload
    },

    addParticipant: (state, action) => {
      state.liveMeeting.participants.push(action.payload)
    },

    removeParticipant: (state, action) => {
      state.liveMeeting.participants =
        state.liveMeeting.participants.filter(
          (p) => p.id !== action.payload
        )
    },

    clearLiveMeeting: (state) => {
      state.liveMeeting = initialState.liveMeeting
    },

    // -----------------------
    // TRANSCRIPTS (REALTIME)
    // -----------------------
    addTranscriptChunk: (state, action) => {
      state.liveMeeting.transcript.push(action.payload)
    },

    clearTranscript: (state) => {
      state.liveMeeting.transcript = []
    },

    // -----------------------
    // NOTIFICATIONS (BELL)
    // -----------------------
    setUpcomingNotifications: (state, action) => {
      state.notifications.upcoming = action.payload
      state.notifications.lastFetchedAt = Date.now()
    },
  },
})

export const {
  setSelectedMeeting,
  clearSelectedMeeting,

  setMeetingFilters,
  resetMeetingFilters,

  setMeetingSort,

  setMeetingPagination,
  setMeetingTotal,

  setLiveMeeting,
  setMeetingConnection,
  setParticipants,
  addParticipant,
  removeParticipant,
  clearLiveMeeting,

  addTranscriptChunk,
  clearTranscript,

  setUpcomingNotifications,
} = meetingsSlice.actions

export default meetingsSlice.reducer