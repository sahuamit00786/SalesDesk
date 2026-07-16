// Query-key factory. Every server-data key is prefixed with the workspace id so a
// workspace switch can never serve stale cross-workspace data (queryClient.clear()
// on switch is the second line of defense).

export const authKeys = {
  me: ['auth', 'me'],
};

export const keys = {
  leads: {
    all: (ws) => [ws, 'leads'],
    list: (ws, params) => [ws, 'leads', 'list', params],
    detail: (ws, id) => [ws, 'leads', 'detail', id],
    sub: (ws, id, kind) => [ws, 'leads', id, kind], // activities|notes|tasks|followups|files|emails
    formMeta: (ws) => [ws, 'leads', 'form-meta'],
    setup: (ws) => [ws, 'leads', 'setup'],
    savedViews: (ws) => [ws, 'leads', 'saved-views'],
    duplicates: (ws, params) => [ws, 'leads', 'duplicates', params],
    archived: (ws, params) => [ws, 'leads', 'archived', params],
  },
  opportunities: {
    all: (ws) => [ws, 'opportunities'],
    list: (ws, params) => [ws, 'opportunities', 'list', params],
  },
  tasks: {
    all: (ws) => [ws, 'tasks'],
    list: (ws, params) => [ws, 'tasks', 'list', params],
  },
  activities: {
    all: (ws) => [ws, 'activities'],
    list: (ws, params) => [ws, 'activities', 'list', params],
    types: (ws) => [ws, 'activities', 'types'],
  },
  calls: {
    all: (ws) => [ws, 'calls'],
    list: (ws, params) => [ws, 'calls', 'list', params],
  },
  meetings: {
    all: (ws) => [ws, 'meetings'],
    list: (ws, params) => [ws, 'meetings', 'list', params],
    detail: (ws, id) => [ws, 'meetings', 'detail', id],
  },
  documents: {
    all: (ws) => [ws, 'documents'],
    list: (ws, params) => [ws, 'documents', 'list', params],
  },
  notifications: {
    all: (ws) => [ws, 'notifications'],
    list: (ws, params) => [ws, 'notifications', 'list', params],
    unreadCount: (ws) => [ws, 'notifications', 'unread-count'],
  },
  deals: {
    all: (ws) => [ws, 'deals'],
    list: (ws, params) => [ws, 'deals', 'list', params],
    detail: (ws, id) => [ws, 'deals', 'detail', id],
    payments: (ws, id) => [ws, 'deals', id, 'payments'],
    activities: (ws, id) => [ws, 'deals', id, 'activities'],
  },
  analytics: {
    all: (ws) => [ws, 'analytics'],
    charts: (ws, params) => [ws, 'analytics', 'charts', params],
    navBadges: (ws) => [ws, 'analytics', 'nav-badges'],
  },
  calendar: {
    all: (ws) => [ws, 'calendar'],
    events: (ws, params) => [ws, 'calendar', 'events', params],
    today: (ws) => [ws, 'calendar', 'today'],
  },
  reminders: {
    all: (ws) => [ws, 'reminders'],
    list: (ws, params) => [ws, 'reminders', 'list', params],
  },
  attendance: {
    all: (ws) => [ws, 'attendance'],
    today: (ws) => [ws, 'attendance', 'today'],
    me: (ws, params) => [ws, 'attendance', 'me', params],
    team: (ws, params) => [ws, 'attendance', 'team', params],
    member: (ws, id, params) => [ws, 'attendance', 'member', id, params],
  },
  leave: {
    all: (ws) => [ws, 'leave'],
    types: (ws) => [ws, 'leave', 'types'],
    balance: (ws) => [ws, 'leave', 'balance'],
    mine: (ws, params) => [ws, 'leave', 'mine', params],
    approvals: (ws, params) => [ws, 'leave', 'approvals', params],
    holidays: (ws) => [ws, 'leave', 'holidays'],
  },
  campaigns: {
    all: (ws) => [ws, 'campaigns'],
    list: (ws, params) => [ws, 'campaigns', 'list', params],
    detail: (ws, id) => [ws, 'campaigns', 'detail', id],
    leads: (ws, id, params) => [ws, 'campaigns', id, 'leads', params],
    payments: (ws, id) => [ws, 'campaigns', id, 'payments'],
    report: (ws, id) => [ws, 'campaigns', id, 'report'],
  },
  sales: {
    quotations: (ws, params) => [ws, 'quotations', params],
    quotation: (ws, id) => [ws, 'quotations', id],
    invoices: (ws, params) => [ws, 'invoices', params],
    invoice: (ws, id) => [ws, 'invoices', id],
  },
  search: (ws, q) => [ws, 'search', q],
  team: {
    all: (ws) => [ws, 'team'],
    users: (ws, params) => [ws, 'team', 'users', params],
    user: (ws, id) => [ws, 'team', 'user', id],
    roles: (ws) => [ws, 'team', 'roles'],
    invitations: (ws) => [ws, 'team', 'invitations'],
  },
  workspaces: {
    list: ['workspaces', 'list'], // company-level, not ws-scoped
  },
};
