import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { keys } from '../../api/queryKeys';
import { useListQuery, useWorkspaceId } from '../../hooks/useListQuery';
import { notificationsApi } from './api';
import { showApiError } from '../../utils/errorMessage';

export function useNotificationsList(unreadOnly) {
  return useListQuery({
    keyFn: (ws) => keys.notifications.list(ws, { unreadOnly }),
    fetcher: (params) => notificationsApi.list(unreadOnly ? { ...params, unreadOnly: true } : params),
    limit: 20,
  });
}

/** Poll unread badge every 60s + on focus (no websockets on the server). */
export function useUnreadCount() {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: keys.notifications.unreadCount(ws),
    queryFn: () => notificationsApi.unreadCount(),
    select: (r) => r.data?.count ?? 0,
    enabled: Boolean(ws),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useNotificationMutations() {
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.notifications.all(ws) });

  const markRead = useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: invalidate,
    onError: (err) => showApiError(err, 'Could not mark as read'),
  });
  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: invalidate,
    onError: (err) => showApiError(err, 'Could not mark all as read'),
  });

  return { markRead, markAllRead };
}
