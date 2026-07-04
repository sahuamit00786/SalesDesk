import { useQuery } from '@tanstack/react-query';
import { keys } from '../../api/queryKeys';
import { useWorkspaceId } from '../../hooks/useListQuery';
import { callsApi } from './api';

/** Full call history for one lead — used by the Lead detail "Calls" tab. */
export function useLeadCalls(leadId) {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: keys.calls.list(ws, { leadId }),
    queryFn: () => callsApi.list({ leadId }),
    enabled: Boolean(ws && leadId),
    select: (r) => (Array.isArray(r.data) ? r.data : []),
  });
}
