export const PRIORITY_META = {
  urgent: { label: 'Urgent', flagClass: 'text-rose-600', textClass: 'text-rose-700', dot: 'bg-rose-600', accentBorder: 'border-l-rose-500', pill: 'bg-rose-50 text-rose-700 ring-rose-200', columnBg: 'bg-rose-50/50' },
  high: { label: 'High', flagClass: 'text-red-500', textClass: 'text-red-600', dot: 'bg-red-500', accentBorder: 'border-l-red-400', pill: 'bg-red-50 text-red-600 ring-red-200', columnBg: 'bg-red-50/50' },
  medium: { label: 'Medium', flagClass: 'text-amber-400', textClass: 'text-amber-600', dot: 'bg-amber-400', accentBorder: 'border-l-amber-400', pill: 'bg-amber-50 text-amber-700 ring-amber-200', columnBg: 'bg-amber-50/50' },
  low: { label: 'Low', flagClass: 'text-emerald-500', textClass: 'text-emerald-600', dot: 'bg-emerald-500', accentBorder: 'border-l-emerald-400', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', columnBg: 'bg-emerald-50/50' },
}

export const STATUS_META = {
  pending: { label: 'Pending', dot: 'bg-violet-500', accentBorder: 'border-l-violet-500', pill: 'bg-violet-50 text-violet-800 ring-violet-200', columnBg: 'bg-violet-50/60' },
  in_progress: { label: 'In progress', dot: 'bg-amber-400', accentBorder: 'border-l-amber-400', pill: 'bg-amber-50 text-amber-800 ring-amber-200', columnBg: 'bg-amber-50/60' },
  completed: { label: 'Completed', dot: 'bg-emerald-500', accentBorder: 'border-l-emerald-500', pill: 'bg-emerald-50 text-emerald-800 ring-emerald-200', columnBg: 'bg-emerald-50/60' },
  cancelled: { label: 'Cancelled', dot: 'bg-gray-400', accentBorder: 'border-l-gray-300', pill: 'bg-gray-100 text-gray-600 ring-gray-200', columnBg: 'bg-gray-50/80' },
}

export const STATUS_SECTIONS = [
  { id: 'pending', title: 'Pending', icon: 'grid' },
  { id: 'in_progress', title: 'In progress', icon: 'dot' },
  { id: 'completed', title: 'Completed', icon: 'check' },
  { id: 'cancelled', title: 'Cancelled', icon: 'cancel' },
]

export const PRIORITY_SECTIONS = [
  { id: 'urgent', title: 'Urgent', icon: 'flag' },
  { id: 'high', title: 'High', icon: 'flag' },
  { id: 'medium', title: 'Medium', icon: 'flag' },
  { id: 'low', title: 'Low', icon: 'flag' },
]

export const LIST_GROUP_TABS = [
  { id: 'status', label: 'By status' },
  { id: 'priority', label: 'By priority' },
]

/** Server-backed due / overdue quick filters (orthogonal to group-by). */
export const DUE_QUICK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'not_overdue', label: 'Not overdue' },
  { id: 'due_today', label: 'Due today' },
  { id: 'upcoming', label: 'Upcoming' },
]

export const SORT_OPTIONS = [
  { value: 'dueAt', label: 'Due date' },
  { value: 'createdAt', label: 'Created date' },
  { value: 'title', label: 'Title' },
  { value: 'priority', label: 'Priority' },
]

export const PAGE_LIMIT = 200
export const SECTION_PAGE_SIZE = 10

const ALL_SECTION_IDS = [...STATUS_SECTIONS.map((s) => s.id), ...PRIORITY_SECTIONS.map((s) => s.id)]
export const DEFAULT_OPEN = ALL_SECTION_IDS.reduce((acc, id) => ({ ...acc, [id]: true }), {})
export const DEFAULT_SECTION_PAGES = ALL_SECTION_IDS.reduce((acc, id) => ({ ...acc, [id]: 1 }), {})
