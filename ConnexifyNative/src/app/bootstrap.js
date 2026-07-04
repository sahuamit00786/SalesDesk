import { bindSession } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore, resolveWorkspaceId } from '../stores/workspaceStore';
import { useUiStore } from '../stores/uiStore';
import { queryClient } from './QueryProvider';

let started = false;

/** Idempotent app bootstrap: wire session handlers, hydrate stores, restore session. */
export async function bootstrapApp() {
  if (started) return;
  started = true;

  bindSession({
    getAccessToken: () => useAuthStore.getState().accessToken,
    getWorkspaceId: () => {
      const { user } = useAuthStore.getState();
      const { preferredId } = useWorkspaceStore.getState();
      return resolveWorkspaceId(user, preferredId);
    },
    onSessionRefreshed: (session) => {
      useAuthStore.getState().setSession({
        user: session.user,
        accessToken: session.accessToken,
      });
    },
    onSessionExpired: async () => {
      await useAuthStore.getState().expireSession();
      queryClient.clear(); // RootNavigator switches to Auth on status change
    },
  });

  await useUiStore.getState().hydrate();
  await useAuthStore.getState().bootstrap();
}
