import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { keys } from '../../api/queryKeys';
import { useListQuery, useWorkspaceId } from '../../hooks/useListQuery';
import { dealsApi } from './api';
import { showApiError } from '../../utils/errorMessage';

/**
 * Deals hooks — list/detail/stage/payments. Server enforces visibility
 * (leadAccessWhere): elevated see all deals, others see owned/assigned only,
 * so the mobile list simply reflects whatever the server returns.
 */

export function useDealsList(params) {
  return useListQuery({
    keyFn: (ws, p) => keys.deals.list(ws, p),
    fetcher: (p) => dealsApi.list(p),
    params,
    limit: 20,
  });
}

export function useDealDetail(id) {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: keys.deals.detail(ws, id),
    queryFn: () => dealsApi.detail(id),
    enabled: Boolean(ws && id),
    select: (r) => r.data,
  });
}

export function useDealPayments(id) {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: keys.deals.payments(ws, id),
    queryFn: () => dealsApi.payments(id),
    enabled: Boolean(ws && id),
    select: (r) => (Array.isArray(r.data) ? r.data : []),
  });
}

export function useDealMutations() {
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  const invalidate = (id) => {
    qc.invalidateQueries({ queryKey: keys.deals.all(ws) });
    if (id) qc.invalidateQueries({ queryKey: keys.deals.detail(ws, id) });
  };

  const patchStage = useMutation({
    mutationFn: ({ id, stage }) => dealsApi.patchStage(id, stage),
    onSuccess: (_d, v) => { invalidate(v.id); Toast.show({ type: 'success', text1: 'Stage updated' }); },
    onError: (err) => showApiError(err, 'Could not update stage'),
  });

  const create = useMutation({
    mutationFn: (body) => dealsApi.create(body),
    onSuccess: () => { invalidate(); Toast.show({ type: 'success', text1: 'Deal created' }); },
    onError: (err) => showApiError(err, 'Could not create deal'),
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => dealsApi.update(id, body),
    onSuccess: (_d, v) => invalidate(v.id),
    onError: (err) => showApiError(err, 'Could not update deal'),
  });

  return { patchStage, create, update };
}
