import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { keys } from '../../api/queryKeys';
import { useListQuery, useWorkspaceId } from '../../hooks/useListQuery';
import { meetingsApi } from './api';

export function useMeetingsList(params) {
  return useListQuery({
    keyFn: (ws, p) => keys.meetings.list(ws, p),
    fetcher: (p) => meetingsApi.list(p),
    params,
    limit: 15,
  });
}

export function useMeetingDetail(id) {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: keys.meetings.detail(ws, id),
    queryFn: () => meetingsApi.detail(id),
    enabled: Boolean(ws && id),
    select: (r) => r.data,
  });
}

export function useMeetingMutations() {
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: keys.meetings.all(ws) });
    qc.invalidateQueries({ queryKey: keys.calendar.all(ws) });
  };
  const onError = (err) => Toast.show({ type: 'error', text1: 'Something went wrong', text2: err?.message });

  return {
    create: useMutation({ mutationFn: (body) => meetingsApi.create(body), onSuccess: invalidate, onError }),
    update: useMutation({ mutationFn: ({ id, body }) => meetingsApi.update(id, body), onSuccess: invalidate, onError }),
    remove: useMutation({ mutationFn: (id) => meetingsApi.remove(id), onSuccess: invalidate, onError }),
    setBotConsent: useMutation({
      mutationFn: ({ id, consent }) => meetingsApi.setBotConsent(id, consent),
      onSuccess: invalidate,
      onError,
    }),
  };
}
