import { get, post } from '../../api/client';

// server/src/controllers/attendanceController.js
// today → { date, log, sessions[], hasOpenSession, openSession, totalHours, status }
// me → { logs[], stats {present,absent,late,half_day,totalHours}, year, month }
export const attendanceApi = {
  today: () => get('/attendance/today'),
  checkIn: (coords) => post('/attendance/check-in', coords), // { latitude, longitude, force? }
  checkOut: (coords) => post('/attendance/check-out', coords),
  me: ({ year, month }) => get('/attendance/me', { year, month }),
  team: (params) => get('/attendance/team', params), // manager+
  day: (date) => get(`/attendance/day/${date}`), // manager+
};
