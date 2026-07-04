import { get } from '../../api/client';
import { toISODate } from '../../utils/format';

// Endpoint parity with web client/src/pages/DashboardPage.jsx
export const dashboardApi = {
  /** meta.total probe — 1-row page just for the count. */
  leadsCount: (extra = {}) => get('/leads', { page: 1, limit: 1, ...extra }),
  activitiesCount: ({ from, to, types }) => get('/activities', { from, to, types, limit: 1 }),
  charts: ({ from, to, scope }) =>
    get('/analytics/dashboard-charts', { from: toISODate(from), to: toISODate(to), scope }),
  calendarEvents: ({ from, to, types }) =>
    get('/calendar/events', { from: from.toISOString(), to: to.toISOString(), types }),
  tasks: (params) => get('/tasks', params),
  activitiesFeed: (limit = 10) => get('/activities', { limit }),
};
