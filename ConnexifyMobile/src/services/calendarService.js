import api from './api';

export const calendarService = {
  getEvents: (params = {}) =>
    api.get('/calendar/events', { params }).then((r) => r.data),

  getTodayDigest: () =>
    api.get('/calendar/today').then((r) => r.data),
};
