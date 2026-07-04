import { get, post, postMultipart } from '../../api/client';

// server/src/controllers/leaveController.js — apply body:
// { leaveTypeId, fromDate, toDate, reason, isHalfDay } + optional multipart `document` (8MB)
export const leaveApi = {
  types: () => get('/leave/types'),
  myBalance: () => get('/leave/balance/me'),
  myRequests: (params) => get('/leave/requests/me', params),
  pendingApprovals: () => get('/leave/pending-approvals'),
  holidays: () => get('/leave/holidays'),
  previewDays: (params) => get('/leave/preview-days', params), // { fromDate, toDate }
  apply: ({ leaveTypeId, fromDate, toDate, reason, isHalfDay, document }) =>
    document
      ? postMultipart('/leave/requests', {
          fields: { leaveTypeId, fromDate, toDate, reason, isHalfDay: String(Boolean(isHalfDay)) },
          files: { document },
        })
      : post('/leave/requests', { leaveTypeId, fromDate, toDate, reason, isHalfDay: Boolean(isHalfDay) }),
  approve: (id) => post(`/leave/requests/${id}/approve`),
  reject: (id, reason) => post(`/leave/requests/${id}/reject`, { reason }),
  cancel: (id) => post(`/leave/requests/${id}/cancel`),
};

export const LEAVE_STATUS_TONES = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};
