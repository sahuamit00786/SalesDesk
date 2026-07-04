import { useQuery } from '@tanstack/react-query';
import { keys } from '../../api/queryKeys';
import { useWorkspaceId } from '../../hooks/useListQuery';
import { activitiesApi } from './api';

const DAY = 24 * 60 * 60 * 1000;

export function useActivitiesFeed({ rangeDays = 30, types, userId }) {
  const ws = useWorkspaceId();
  const to = new Date();
  const from = new Date(to.getTime() - rangeDays * DAY);
  return useQuery({
    queryKey: keys.activities.list(ws, { rangeDays, types: types || 'all', userId: userId || 'all' }),
    queryFn: () =>
      activitiesApi.feed({
        from: from.toISOString(),
        to: to.toISOString(),
        limit: 100,
        ...(types ? { types } : {}),
        ...(userId ? { userId } : {}),
      }),
    enabled: Boolean(ws),
    select: (r) => (Array.isArray(r.data) ? r.data : []),
  });
}
