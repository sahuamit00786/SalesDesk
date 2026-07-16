import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch } from 'react-native';
import Toast from 'react-native-toast-message';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import ErrorState from '../../../design-system/components/ErrorState';
import { useTheme } from '../../../design-system/ThemeProvider';
import { get, patch } from '../../../api/client';
import { showApiError } from '../../../utils/errorMessage';

/**
 * Notification settings (admin, company-level) — mirrors the web Settings →
 * Notifications. Server: GET/PATCH /settings/notification-emails, gated by
 * settings.workspace. Non-admins won't reach this screen (gate it in the More
 * hub with the settings.workspace permission); if they do, the 403 renders as a
 * clean ErrorState.
 *
 * Each event has { enabled, email, inApp }. This screen toggles the common ones.
 * (The per-USER `digestOnly` fatigue flag from Phase 2 lives on
 * UserNotificationPreference — expose it here too once you add a
 * GET/PATCH /notifications/my-preferences endpoint; noted in the runbook.)
 *
 * Register: <Stack.Screen name={ROUTES.NOTIFICATION_SETTINGS} component={NotificationSettingsScreen} />
 */

const EVENTS = [
  { key: 'leadAssigned', label: 'Lead assigned' },
  { key: 'taskAssigned', label: 'Task assigned' },
  { key: 'tasksDueToday', label: 'Daily digest' },
  { key: 'followupDue', label: 'Follow-up due' },
  { key: 'meetingReminder', label: 'Meeting reminder' },
  { key: 'leadEmailReply', label: 'Email reply' },
];

export default function NotificationSettingsScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const [draft, setDraft] = useState(null);

  const query = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => get('/settings/notification-emails'),
    select: (r) => r.data || {},
  });

  useEffect(() => {
    if (query.data && !draft) setDraft(query.data);
  }, [query.data, draft]);

  const save = useMutation({
    mutationFn: (patchBody) => patch('/settings/notification-emails', patchBody),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-settings'] });
      Toast.show({ type: 'success', text1: 'Settings saved' });
    },
    onError: (err) => showApiError(err, 'Could not save settings'),
  });

  if (query.isPending || !draft) {
    return (
      <ScreenScaffold>
        <AppHeader title="Notifications" />
        <SkeletonList count={6} />
      </ScreenScaffold>
    );
  }
  if (query.isError) {
    return (
      <ScreenScaffold>
        <AppHeader title="Notifications" />
        <ErrorState error={query.error} onRetry={query.refetch} />
      </ScreenScaffold>
    );
  }

  const setChannel = (eventKey, channel, value) => {
    const next = {
      ...draft,
      [eventKey]: { ...(draft[eventKey] || {}), [channel]: value },
    };
    setDraft(next);
    save.mutate({ [eventKey]: next[eventKey] });
  };

  return (
    <ScreenScaffold>
      <AppHeader title="Notifications" />
      <ScrollView contentContainerStyle={styles.body}>
        <AppText variant="caption" color="muted" style={styles.intro}>
          Control which events send email and in-app notifications across your company.
        </AppText>
        {EVENTS.map((ev) => {
          const cfg = draft[ev.key] || { enabled: true, email: true, inApp: true };
          return (
            <Card key={ev.key} style={styles.card}>
              <AppText variant="body" weight="600">{ev.label}</AppText>
              <View style={styles.row}>
                <AppText variant="caption" color="muted">Email</AppText>
                <Switch
                  value={Boolean(cfg.email)}
                  onValueChange={(v) => setChannel(ev.key, 'email', v)}
                  trackColor={{ true: theme.brand }}
                />
              </View>
              <View style={styles.row}>
                <AppText variant="caption" color="muted">In-app</AppText>
                <Switch
                  value={Boolean(cfg.inApp)}
                  onValueChange={(v) => setChannel(ev.key, 'inApp', v)}
                  trackColor={{ true: theme.brand }}
                />
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  body: { padding: 12, gap: 10 },
  intro: { paddingHorizontal: 4, marginBottom: 4 },
  card: { padding: 14, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
