import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { keys } from '../../api/queryKeys';
import { useWorkspaceId } from '../../hooks/useListQuery';
import { leaveApi } from './api';

const arr = (r) => (Array.isArray(r.data) ? r.data : []);

export function useLeaveTypes() {
  const ws = useWorkspaceId();
  return useQuery({ queryKey: keys.leave.types(ws), queryFn: () => leaveApi.types(), enabled: Boolean(ws), select: arr, staleTime: 5 * 60_000 });
}

export function useLeaveBalance() {
  const ws = useWorkspaceId();
  return useQuery({ queryKey: keys.leave.balance(ws), queryFn: () => leaveApi.myBalance(), enabled: Boolean(ws), select: arr });
}

export function useMyLeaveRequests() {
  const ws = useWorkspaceId();
  return useQuery({ queryKey: keys.leave.mine(ws, 'all'), queryFn: () => leaveApi.myRequests(), enabled: Boolean(ws), select: arr });
}

export function usePendingApprovals(enabled) {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: keys.leave.approvals(ws, 'pending'),
    queryFn: () => leaveApi.pendingApprovals(),
    enabled: Boolean(ws) && enabled,
    select: arr,
  });
}

export function useHolidays() {
  const ws = useWorkspaceId();
  return useQuery({ queryKey: keys.leave.holidays(ws), queryFn: () => leaveApi.holidays(), enabled: Boolean(ws), select: arr, staleTime: 5 * 60_000 });
}

export function useLeaveMutations() {
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.leave.all(ws) });
  const onError = (err) => Toast.show({ type: 'error', text1: 'Leave action failed', text2: err?.message });

  return {
    apply: useMutation({ mutationFn: (body) => leaveApi.apply(body), onSuccess: invalidate, onError }),
    approve: useMutation({ mutationFn: (id) => leaveApi.approve(id), onSuccess: invalidate, onError }),
    reject: useMutation({ mutationFn: ({ id, reason }) => leaveApi.reject(id, reason), onSuccess: invalidate, onError }),
    cancel: useMutation({ mutationFn: (id) => leaveApi.cancel(id), onSuccess: invalidate, onError }),
  };
}
