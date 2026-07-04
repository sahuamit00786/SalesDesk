import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore, resolveWorkspaceId } from '../stores/workspaceStore';

/** Resolved active workspace id (reactive). */
export function useWorkspaceId() {
  const user = useAuthStore((s) => s.user);
  const preferredId = useWorkspaceStore((s) => s.preferredId);
  return resolveWorkspaceId(user, preferredId);
}

/**
 * Server-list infinite query. fetcher(params) must resolve { data:[], meta } —
 * envelope adapters already merge the `pagination` variant into meta.
 *
 * keyFn(ws, params) → query key.  Pagination stops when page*limit >= total
 * (meta.total | meta.pages | pagination.*).
 */
export function useListQuery({ keyFn, fetcher, params = {}, limit = 20, enabled = true }) {
  const ws = useWorkspaceId();

  const query = useInfiniteQuery({
    queryKey: keyFn(ws, params),
    enabled: Boolean(ws) && enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetcher({ ...params, page: pageParam, limit }),
    getNextPageParam: (lastPage, _all, lastPageParam) => {
      const meta = lastPage?.meta || {};
      const total = Number(meta.total);
      const pages = Number(meta.pages);
      if (Number.isFinite(pages)) return lastPageParam < pages ? lastPageParam + 1 : undefined;
      if (Number.isFinite(total)) return lastPageParam * limit < total ? lastPageParam + 1 : undefined;
      // no count info: stop when a page comes back short
      const got = Array.isArray(lastPage?.data) ? lastPage.data.length : 0;
      return got >= limit ? lastPageParam + 1 : undefined;
    },
  });

  const items = useMemo(
    () => (query.data?.pages || []).flatMap((p) => (Array.isArray(p.data) ? p.data : [])),
    [query.data],
  );
  const total = Number(query.data?.pages?.[0]?.meta?.total);

  return {
    ...query,
    items,
    total: Number.isFinite(total) ? total : items.length,
    isEmpty: !query.isPending && items.length === 0,
  };
}
