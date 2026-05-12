// Event color tokens for the calendar
export const EVENT_COLORS = {
  meeting: {
    demo: '#6366f1',
    follow_up: '#8b5cf6',
    closing: '#ec4899',
    internal: '#10b981',
  },
  task: {
    low: '#fbbf24',
    medium: '#f59e0b',
    high: '#ef4444',
  },
  followup: {
    pending: '#10b981',
    done: '#6b7280',
    cancelled: '#9ca3af',
  },
  opportunity: {
    default: '#8b5cf6',
  },
  reminder: {
    default: '#f43f5e',
  },
}

// Get color for a calendar event
export function getEventColor(kind, status, meta = {}) {
  switch (kind) {
    case 'meeting':
      return EVENT_COLORS.meeting[meta?.meetingType] || EVENT_COLORS.meeting.demo
    case 'task':
      return EVENT_COLORS.task[meta?.priority] || EVENT_COLORS.task.medium
    case 'followup':
      return EVENT_COLORS.followup[status] || EVENT_COLORS.followup.pending
    case 'opportunity':
      return EVENT_COLORS.opportunity.default
    case 'reminder':
      return meta?.color || EVENT_COLORS.reminder.default
    default:
      return '#6b7280'
  }
}

// Get background color class for kind
export function getKindBgClass(kind) {
  switch (kind) {
    case 'meeting':
      return 'bg-indigo-100 text-indigo-700'
    case 'task':
      return 'bg-amber-100 text-amber-700'
    case 'followup':
      return 'bg-emerald-100 text-emerald-700'
    case 'opportunity':
      return 'bg-violet-100 text-violet-700'
    case 'reminder':
      return 'bg-rose-100 text-rose-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

// Get icon for event kind
export function getKindIcon(kind) {
  switch (kind) {
    case 'meeting':
      return 'Video'
    case 'task':
      return 'CheckSquare'
    case 'followup':
      return 'Phone'
    case 'opportunity':
      return 'TrendingUp'
    case 'reminder':
      return 'Bell'
    default:
      return 'Calendar'
  }
}

// Calendar filter options with colors
export const CALENDAR_FILTERS = [
  { id: 'meeting', label: 'Meetings', color: '#6366f1', icon: 'Video' },
  { id: 'task', label: 'Tasks', color: '#f59e0b', icon: 'CheckSquare' },
  { id: 'followup', label: 'Follow-ups', color: '#10b981', icon: 'Phone' },
  { id: 'opportunity', label: 'Opportunities', color: '#8b5cf6', icon: 'TrendingUp' },
  { id: 'reminder', label: 'Reminders', color: '#f43f5e', icon: 'Bell' },
]
