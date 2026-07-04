import { get, post, patch, del } from '../../api/client';

// CallLog: callType inbound|outbound, duration (seconds), outcome
// connected|no_answer|voicemail|followup_needed, notes, leadId (nullable —
// orphan calls carry callerName/phoneNumber instead until converted).
export const callsApi = {
  list: (params) => get('/calls', params),
  create: (body) => post('/calls', body),
  update: (id, body) => patch(`/calls/${id}`, body),
  remove: (id) => del(`/calls/${id}`),
  convert: (id, body) => post(`/calls/${id}/convert`, body), // { type: 'lead'|'opportunity', title?, contactName?, phone? }
};

export const CALL_OUTCOMES = [
  { value: 'connected', label: 'Connected' },
  { value: 'no_answer', label: 'No answer' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'followup_needed', label: 'Follow-up needed' },
];

export const LEAD_FILTERS = [
  { value: undefined, label: 'All' },
  { value: 'true', label: 'With lead' },
  { value: 'false', label: 'No lead' },
];
