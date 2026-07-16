// ============================================================================
// Phase 5 — reports API
// FILE: src/features/reports/api.js  (NEW)
// ============================================================================
// All endpoints exist and are gated server-side by requireAnalyticsView, so a
// user without analytics access gets a clean 403 → ErrorState renders the
// precise message. Only elevated/analytics-enabled roles reach these.

import { get } from '../../api/client';

export const reportsApi = {
  leads: (params) => get('/analytics/leads-report', params),
  pipeline: (params) => get('/analytics/pipeline-report', params),
  activities: (params) => get('/analytics/activities-report', params),
  meetings: (params) => get('/analytics/meetings-report', params),
  tasks: (params) => get('/analytics/tasks-report', params),
  team: (params) => get('/analytics/team-report', params),
  deals: (params) => get('/analytics/deals-report', params),
  followups: (params) => get('/analytics/followups-report', params),
  payments: (params) => get('/analytics/payments-report', params),
  // dashboard summary used by the reports home:
  dashboard: (params) => get('/analytics/dashboard', params),
};

// The report responses are report-specific JSON. The mobile screens render the
// common shapes (summary numbers + a series for a chart). Where a report's shape
// differs, the screen falls back to showing the top-level numeric fields as
// stat cards — so every report renders something useful without per-report code.
