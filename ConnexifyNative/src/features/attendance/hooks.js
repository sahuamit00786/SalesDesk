import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { keys } from '../../api/queryKeys';
import { useWorkspaceId } from '../../hooks/useListQuery';
import { attendanceApi } from './api';
import { showApiError } from '../../utils/errorMessage';

export function useAttendanceToday() {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: keys.attendance.today(ws),
    queryFn: () => attendanceApi.today(),
    enabled: Boolean(ws),
    select: (r) => r.data || {},
    refetchInterval: 60_000,
  });
}

export function useMyAttendance(year, month) {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: keys.attendance.me(ws, `${year}-${month}`),
    queryFn: () => attendanceApi.me({ year, month }),
    enabled: Boolean(ws),
    select: (r) => r.data || {},
  });
}

export function useTeamAttendance(enabled) {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: keys.attendance.team(ws, 'today'),
    queryFn: () => attendanceApi.team(),
    enabled: Boolean(ws) && enabled,
    select: (r) => r.data,
  });
}

export function useAttendanceMutations() {
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.attendance.all(ws) });
  const onError = (err) =>
    showApiError(err, err?.code === 'ON_LEAVE' ? 'You are on approved leave today' : 'Attendance action failed');

  return {
    checkIn: useMutation({ mutationFn: (coords) => attendanceApi.checkIn(coords), onSuccess: invalidate, onError }),
    checkOut: useMutation({ mutationFn: (coords) => attendanceApi.checkOut(coords), onSuccess: invalidate, onError }),
  };
}
