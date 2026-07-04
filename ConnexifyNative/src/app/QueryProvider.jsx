import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
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

// Wire RN app state → react-query focus, NetInfo → online state
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

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
