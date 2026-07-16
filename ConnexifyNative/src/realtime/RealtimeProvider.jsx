import { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore, resolveWorkspaceId } from '../stores/workspaceStore';
import { keys } from '../api/queryKeys';
import { navRef } from '../navigation/navRef';
import { ROUTES } from '../navigation/routes';
import {
  bindRealtimeSession,
  connectRealtime,
  disconnectRealtime,
  onRealtime,
} from './socket';

/**
 * Mount ONCE inside the authed tree (App.jsx, next to navigation).
 *
 * What it does when `notification:new` arrives for THIS user (the server only
 * ever emits to `user:{id}` rooms, so anything received here is ours):
 *   1. In-app toast with the notification title (tap → Notifications screen).
 *   2. Prepends nothing manually — instead invalidates the notifications list
 *      + unread-count queries so every mounted screen re-renders from the
 *      canonical server state (no client-side cache surgery to go stale).
 *   3. Nudges the entity list the notification refers to (lead/task/meeting…)
 *      so "assignment updates sync instantly" without any polling.
 *
 * Polling stays untouched underneath as the fallback: if the socket is down
 * you gracefully degrade to the existing 60s badge poll.
 */

// notification.link (web path) → which query family to refresh
const LINK_INVALIDATION = [
  { match: /^\/leads/, key: (ws) => keys.leads?.all?.(ws) },
  { match: /^\/opportunities/, key: (ws) => keys.leads?.all?.(ws) },
  { match: /^\/tasks/, key: (ws) => keys.tasks?.all?.(ws) },
  { match: /^\/meetings/, key: (ws) => keys.meetings?.all?.(ws) },
  { match: /^\/calls/, key: (ws) => keys.calls?.all?.(ws) },
  { match: /^\/leave/, key: (ws) => keys.leave?.all?.(ws) },
];

export default function RealtimeProvider({ children }) {
  const qc = useQueryClient();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status !== 'authed') {
      disconnectRealtime();
      return undefined;
    }

    bindRealtimeSession({
      getAccessToken: () => useAuthStore.getState().accessToken,
    });
    connectRealtime();

    const ws = () => {
      const { user } = useAuthStore.getState();
      const { preferredId } = useWorkspaceStore.getState();
      return resolveWorkspaceId(user, preferredId);
    };

    const offNew = onRealtime('notification:new', (n) => {
      // Refresh canonical state
      qc.invalidateQueries({ queryKey: keys.notifications.all(ws()) });
      qc.invalidateQueries({ queryKey: keys.notifications.unreadCount(ws()) });

      // Freshen the entity the notification points at
      const rule = LINK_INVALIDATION.find((r) => r.match.test(n?.link || ''));
      const key = rule?.key?.(ws());
      if (key) qc.invalidateQueries({ queryKey: key });

      // Surface it
      Toast.show({
        type: 'info',
        text1: n?.title || 'Notification',
        text2: n?.message || undefined,
        onPress: () => {
          Toast.hide();
          if (navRef.isReady()) navRef.navigate(ROUTES.NOTIFICATIONS);
        },
        visibilityTime: 4000,
      });
    });

    const offBadge = onRealtime('notification:badge', () => {
      qc.invalidateQueries({ queryKey: keys.notifications.unreadCount(ws()) });
    });

    return () => {
      offNew();
      offBadge();
      disconnectRealtime();
    };
  }, [status, qc]);

  return children;
}
