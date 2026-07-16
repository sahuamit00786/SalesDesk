import React, { useRef } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Toast from 'react-native-toast-message';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import Badge from '../../../design-system/components/Badge';
import Button from '../../../design-system/components/Button';
import IconButton from '../../../design-system/components/IconButton';
import Avatar, { AvatarStack } from '../../../design-system/components/Avatar';
import { Divider, KeyValueRow } from '../../../design-system/components/SectionHeader';
import { SkeletonDetail } from '../../../design-system/components/Skeleton';
import ErrorState from '../../../design-system/components/ErrorState';
import ConfirmSheet from '../../../design-system/components/ConfirmSheet';
import { Video, Trash2, CalendarClock, FileText, Sparkles } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useMeetingDetail, useMeetingMutations } from '../hooks';
import { MEETING_TYPES, MEETING_STATUS_TONES } from '../api';
import MeetingAiPanel from '../components/MeetingAiPanel';
import { useAuthStore } from '../../../stores/authStore';
import { formatDateTime, formatTime } from '../../../utils/format';

export default function MeetingDetailScreen({ navigation, route }) {
  const theme = useTheme();
  const meetingId = route.params?.meetingId || route.params?.id;
  const detail = useMeetingDetail(meetingId);
  const { remove, setBotConsent } = useMeetingMutations();
  const user = useAuthStore((s) => s.user);
  const confirmRef = useRef(null);

  const meeting = detail.data;

  if (detail.isPending) {
    return (
      <ScreenScaffold>
        <AppHeader title="Meeting" />
        <SkeletonDetail />
      </ScreenScaffold>
    );
  }

  if (detail.isError || !meeting) {
    return (
      <ScreenScaffold>
        <AppHeader title="Meeting" />
        <ErrorState error={detail.error} onRetry={detail.refetch} />
      </ScreenScaffold>
    );
  }

  const typeMeta = MEETING_TYPES.find((t) => t.value === meeting.meetingType);
  const isOwner = String(meeting.ownerUserId) === String(user?.id);
  const participants = meeting.participants || [];

  const confirmDelete = () =>
    confirmRef.current?.open({
      title: 'Delete meeting?',
      message: 'Attendees will no longer see it in the CRM.',
      destructive: true,
      onConfirm: async () => {
        await remove.mutateAsync(meetingId);
        Toast.show({ type: 'success', text1: 'Meeting deleted' });
        navigation.goBack();
      },
    });

  return (
    <ScreenScaffold>
      <AppHeader
        title="Meeting"
        right={<IconButton icon={Trash2} accessibilityLabel="Delete meeting" color={theme.colors.danger} onPress={confirmDelete} />}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={detail.isRefetching} onRefresh={detail.refetch} tintColor={theme.brand} colors={[theme.brand]} />
        }
      >
        <Card style={styles.card}>
          <AppText variant="heading">{meeting.title || 'Meeting'}</AppText>
          <View style={styles.badges}>
            <Badge label={meeting.status || 'scheduled'} tone={MEETING_STATUS_TONES[meeting.status] || 'neutral'} />
            {typeMeta ? <Badge label={typeMeta.label} tone="neutral" /> : null}
            {meeting.botStatus ? <Badge label={`Bot: ${meeting.botStatus}`} tone="info" /> : null}
          </View>
          <View style={styles.timeRow}>
            <CalendarClock size={16} color={theme.colors.inkMuted} strokeWidth={2} />
            <AppText variant="body" color="inkMuted">
              {formatDateTime(meeting.scheduledStart)}
              {meeting.scheduledEnd ? ` – ${formatTime(meeting.scheduledEnd)}` : ''}
            </AppText>
          </View>
          {meeting.googleMeetLink ? (
            <Button
              title="Join Google Meet"
              icon={Video}
              fullWidth
              onPress={() => Linking.openURL(meeting.googleMeetLink).catch(() => Toast.show({ type: 'error', text1: 'Could not open link' }))}
              style={styles.joinBtn}
            />
          ) : null}
        </Card>

        {meeting.agenda ? (
          <Card style={styles.card}>
            <AppText variant="captionStrong" color="inkFaint" style={styles.blockTitle}>
              AGENDA
            </AppText>
            <AppText variant="body" color="inkMuted">
              {meeting.agenda}
            </AppText>
          </Card>
        ) : null}

        {participants.length ? (
          <Card style={styles.card}>
            <AppText variant="captionStrong" color="inkFaint" style={styles.blockTitle}>
              ATTENDEES ({participants.length})
            </AppText>
            {participants.map((p, i) => (
              <View key={p.id || i}>
                {i > 0 ? <Divider /> : null}
                <View style={styles.attendeeRow}>
                  <Avatar name={p.user?.name || p.user?.email} size={32} />
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {p.user?.name || p.user?.email || '—'}
                    </AppText>
                    {p.role ? (
                      <AppText variant="micro" color="inkFaint">
                        {p.role}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        <Card style={styles.card}>
          <View style={styles.consentRow}>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">AI notetaker</AppText>
              <AppText variant="caption" color="inkMuted">
                {isOwner
                  ? 'Bot joins, records and summarizes this meeting'
                  : 'Only the organizer can change this'}
              </AppText>
            </View>
            <Switch
              value={Boolean(meeting.recordingBotConsent)}
              disabled={!isOwner || setBotConsent.isPending}
              onValueChange={(consent) =>
                setBotConsent.mutate(
                  { id: meetingId, consent },
                  { onSuccess: () => Toast.show({ type: 'success', text1: consent ? 'Bot enabled' : 'Bot disabled' }) },
                )
              }
              trackColor={{ true: theme.brand, false: theme.colors.skeleton }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {meeting.summaryText ? (
          <Card style={styles.card}>
            <View style={styles.aiHead}>
              <Sparkles size={16} color={theme.brand} strokeWidth={2.2} />
              <AppText variant="captionStrong" color="inkFaint">
                AI SUMMARY
              </AppText>
            </View>
            <AppText variant="body" color="inkMuted">
              {meeting.summaryText}
            </AppText>
          </Card>
        ) : null}

        {meeting.transcriptText ? (
          <Card style={styles.card}>
            <View style={styles.aiHead}>
              <FileText size={16} color={theme.brand} strokeWidth={2.2} />
              <AppText variant="captionStrong" color="inkFaint">
                TRANSCRIPT
              </AppText>
            </View>
            <AppText variant="caption" color="inkMuted">
              {meeting.transcriptText}
            </AppText>
          </Card>
        ) : null}

        <MeetingAiPanel meeting={meeting} />

        <Card padded={false} style={styles.card}>
          <View style={styles.kvPad}>
            <KeyValueRow label="Timezone" value={meeting.timezone || '—'} />
            <Divider />
            <KeyValueRow label="Duration" value={meeting.durationMinutes ? `${meeting.durationMinutes} min` : '—'} />
            <Divider />
            <KeyValueRow label="Recording" value={meeting.recordingStatus || '—'} />
            <Divider />
            <KeyValueRow label="Transcription" value={meeting.transcriptionStatus || '—'} />
          </View>
        </Card>
      </ScrollView>
      <ConfirmSheet ref={confirmRef} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  card: { marginBottom: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  joinBtn: { marginTop: 14 },
  blockTitle: { letterSpacing: 0.8, marginBottom: 8 },
  attendeeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  flex: { flex: 1 },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  kvPad: { paddingHorizontal: 16, paddingVertical: 4 },
});
