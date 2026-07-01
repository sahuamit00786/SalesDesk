import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { fontSize, fontWeight, spacing, borderRadius } from '../../theme';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const formatTime = (d) =>
  d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

const TYPE_COLORS = {
  meeting:  '#8B5CF6',
  task:     '#06B6D4',
  reminder: '#F59E0B',
  event:    '#4F46E5',
};

const EventDetailSheet = forwardRef(({ event }, ref) => {
  const { theme } = useTheme();
  if (!event) return null;

  const color = TYPE_COLORS[event.type] || TYPE_COLORS.event;
  const meetLink = event.meetLink || event.hangoutLink || event.location;
  const isGoogleMeet = meetLink?.includes('meet.google.com');

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={['55%']}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
    >
      <BottomSheetScrollView contentContainerStyle={s.container}>
        <View style={[s.typeBar, { backgroundColor: color }]} />

        <Text style={[s.title, { color: theme.colors.textPrimary }]}>{event.title || event.summary || 'Event'}</Text>

        {event.description ? (
          <Text style={[s.desc, { color: theme.colors.textSecondary }]}>{event.description}</Text>
        ) : null}

        <View style={s.rows}>
          <Row icon="clock-outline"    label="Time" value={`${formatTime(event.start)} → ${formatTime(event.end)}`} theme={theme} />
          <Row icon="calendar-outline" label="Date" value={formatDate(event.start)} theme={theme} />
          {event.location && !isGoogleMeet && (
            <Row icon="map-marker-outline" label="Location" value={event.location} theme={theme} />
          )}
          {event.attendees?.length ? (
            <Row icon="account-group-outline" label="Attendees" value={event.attendees.map((a) => a.email || a.name).join(', ')} theme={theme} />
          ) : null}
        </View>

        {isGoogleMeet && (
          <TouchableOpacity
            style={[s.joinBtn, { backgroundColor: '#1a73e8' }]}
            onPress={() => Linking.openURL(meetLink)}
            activeOpacity={0.85}
          >
            <Icon name="video" size={20} color="#fff" />
            <Text style={s.joinText}>Join Google Meet</Text>
          </TouchableOpacity>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

const Row = ({ icon, label, value, theme }) => (
  <View style={r.row}>
    <Icon name={icon} size={18} color={theme.colors.textMuted} />
    <View>
      <Text style={[r.label, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[r.value, { color: theme.colors.textPrimary }]}>{value}</Text>
    </View>
  </View>
);

const r = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  label: { fontSize: fontSize.xs, marginBottom: 1 },
  value: { fontSize: fontSize.base, fontWeight: fontWeight.medium },
});

const s = StyleSheet.create({
  container: { padding: spacing.base, paddingBottom: 40 },
  typeBar:   { height: 4, borderRadius: 2, width: 60, alignSelf: 'center', marginBottom: spacing.base },
  title:     { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  desc:      { fontSize: fontSize.base, lineHeight: 22, marginBottom: spacing.base },
  rows:      { gap: 4 },
  joinBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: spacing.md, borderRadius: borderRadius.lg, marginTop: spacing.lg },
  joinText:  { color: '#fff', fontSize: fontSize.base, fontWeight: fontWeight.bold },
});

EventDetailSheet.displayName = 'EventDetailSheet';
export default EventDetailSheet;
