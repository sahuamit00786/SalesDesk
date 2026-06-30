import { create } from 'zustand';
import { attendanceService } from '../services/attendanceService';

export const useAttendanceStore = create((set, get) => ({
  todayStatus:    null,   // { checkIn, checkOut, status, hoursWorked }
  myAttendance:   [],
  teamAttendance: [],
  teamStats:      null,
  isLoading:      false,
  isCheckingIn:   false,
  isCheckingOut:  false,
  error:          null,

  fetchTodayStatus: async () => {
    set({ isLoading: true });
    try {
      const status = await attendanceService.getTodayStatus();
      set({ todayStatus: status, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err.message });
    }
  },

  checkIn: async (coords) => {
    set({ isCheckingIn: true });
    try {
      const result = await attendanceService.checkIn(coords);
      set({ todayStatus: result, isCheckingIn: false });
      return { success: true, data: result };
    } catch (err) {
      set({ isCheckingIn: false });
      return { success: false, message: err.message };
    }
  },

  checkOut: async (coords) => {
    set({ isCheckingOut: true });
    try {
      const result = await attendanceService.checkOut(coords);
      set({ todayStatus: result, isCheckingOut: false });
      return { success: true, data: result };
    } catch (err) {
      set({ isCheckingOut: false });
      return { success: false, message: err.message };
    }
  },

  fetchMyAttendance: async (params = {}) => {
    set({ isLoading: true });
    try {
      const data = await attendanceService.getMyAttendance(params);
      const rows = data.data?.rows || data.rows || [];
      set({ myAttendance: rows, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err.message });
    }
  },

  fetchTeamAttendance: async (params = {}) => {
    set({ isLoading: true });
    try {
      const data = await attendanceService.getTeamAttendance(params);
      const rows  = data.data?.rows || data.rows || data.data || [];
      const stats = data.data?.stats || data.stats || null;
      set({ teamAttendance: rows, teamStats: stats, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err.message });
    }
  },

  checkedIn:  () => !!get().todayStatus?.checkIn && !get().todayStatus?.checkOut,
  checkedOut: () => !!get().todayStatus?.checkIn && !!get().todayStatus?.checkOut,
}));
