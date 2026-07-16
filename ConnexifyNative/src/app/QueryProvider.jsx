import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

/**
 * DROP-IN REPLACEMENT for src/app/QueryProvider.jsx
 *
 * Same client, same retry policy, same focus/online wiring — plus query-cache
 * persistence to AsyncStorage so:
 *   - cold start renders the last-known lists instantly (then refetches)
 *   - offline users can READ leads/tasks/meetings they already loaded
 *
 * Writes are unchanged (mutations still require a connection and surface a
 * clear "you're offline" error via utils/errorMessage) — read-offline is the
 * 90% win with none of the conflict-resolution risk.
 *
 * New deps:
 *   npm i @tanstack/react-query-persist-client @tanstack/query-async-storage-persister
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60_000, // keep a day of cache for offline reads
      retry: (failureCount, error) => {
        const status = error?.status;
        if (status && status < 500) return false; // 4xx are deterministic
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: { retry: 0 },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'connexify.queryCache.v1',
  throttleTime: 2000,
});

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
  }),
);

export default function QueryProvider({ children }) {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
    });
    return () => sub.remove();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60_000,
        // Never persist anything auth/security related; lists only.
        dehydrateOptions: {
          shouldDehydrateQuery: (q) =>
            q.state.status === 'success' &&
            !String(q.queryKey?.[0] ?? '').startsWith('auth'),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
