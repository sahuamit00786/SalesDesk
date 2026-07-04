import { get, post, patch, del } from '../../api/client';

// NOTE param names differ from other modules: sortField/sortOrder + dateFrom/dateTo,
// default limit 10, meta includes `pages` (server/src/services/meetingService.js).
export const meetingsApi = {
  list: (params) => get('/meetings', params),
  detail: (id) => get(`/meetings/${id}`),
  create: (body) => post('/meetings', body), // { title, leadId?, meetingType, scheduledStart, scheduledEnd, agenda?, timezone?, recordingBotConsent? }
  update: (id, body) => patch(`/meetings/${id}`, body),
  remove: (id) => del(`/meetings/${id}`),
  setBotConsent: (id, consent) => patch(`/meetings/${id}/bot-consent`, { consent }),
};

export const MEETING_TYPES = [
  { value: 'demo', label: 'Demo' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'closing', label: 'Closing' },
  { value: 'internal', label: 'Internal' },
];

export const MEETING_STATUS_TONES = {
  scheduled: 'brand',
  live: 'success',
  completed: 'neutral',
  cancelled: 'danger',
  missed: 'warning',
};
