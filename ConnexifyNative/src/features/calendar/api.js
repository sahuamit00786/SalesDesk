import { get, post, patch, del } from '../../api/client';

export const calendarApi = {
  events: (params) => get('/calendar/events', params), // { from, to, types? } → [{id,title,start,end,kind,...}]
  today: () => get('/calendar/today'),
};

export const remindersApi = {
  list: (params) => get('/reminders', params),
  create: (body) => post('/reminders', body), // { title, remindAt, notes?, targetType?, color? }
  update: (id, body) => patch(`/reminders/${id}`, body),
  remove: (id) => del(`/reminders/${id}`),
};

// Event kind → categorical palette slot (fixed identity, both modes validated)
export const EVENT_KIND_COLOR_INDEX = {
  meeting: 0,
  task: 1,
  followup: 3,
  reminder: 4,
  opportunity: 5,
};

export const EVENT_KIND_LABELS = {
  meeting: 'Meeting',
  task: 'Task',
  followup: 'Follow-up',
  reminder: 'Reminder',
  opportunity: 'Opportunity',
};
