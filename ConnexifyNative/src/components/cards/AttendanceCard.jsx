import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, fontSize, fontWeight, shadows, spacing } from '../../theme';
import Avatar from '../misc/Avatar';
import StatusBadge from '../misc/StatusBadge';

const AttendanceCard = ({ record, style }) => {
  const { theme } = useTheme();

  const STATUS_COLOR = {
    Present: theme.colors.attendancePresent,
    Absent:  theme.colors.attendanceAbsent,
    Late:    theme.colors.attendanceLate,
    Leave:   theme.colors.attendanceLeave,
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const hoursWorked = () => {
    if (!record.checkIn || !record.checkOut) return null;
    const diff = (new Date(record.checkOut) - new Date(record.checkIn)) / 3600000;
    return `${diff.toFixed(1)}h`;
  };

  const statusColor = STATUS_COLOR[record.status] || theme.colors.textMuted;
  const s = styles(theme);

  return (
    <View style={[s.card, style]}>
      <Avatar name={record.user?.name || record.name} size={44} style={s.avatar} />
      <View style={s.body}>
        <View style={s.top}>
          <Text style={s.name}>{record.user?.name || record.name || 'Unknown'}</Text>
          <StatusBadge label={record.status || 'Not Marked'} color={statusColor} />
        </View>
        <View style={s.times}>
          <View style={s.timeItem}>
            <Icon name="login" size={13} color={theme.colors.success} />
            <Text style={s.timeText}>{formatTime(record.checkIn)}</Text>
          </View>
          <View style={s.timeItem}>
            <Icon name="logout" size={13} color={theme.colors.danger} />
            <Text style={s.timeText}>{formatTime(record.checkOut)}</Text>
          </View>
          {hoursWorked() && (
            <View style={s.timeItem}>
              <Icon name="clock-outline" size={13} color={theme.colors.textMuted} />
              <Text style={s.timeText}>{hoursWorked()}</Text>
            </View>
          )}
        </View>
        {record.location && (
          <View style={s.gpsRow}>
            <Icon name="map-marker-outline" size={12} color={theme.colors.textMuted} />
            <Text style={s.gpsText} numberOfLines={1}>{record.location}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = (theme) => StyleSheet.create({
  card: {
    flexDirection:   'row',
    backgroundColor: theme.colors.surface,
    borderRadius:    borderRadius.lg,
    padding:         spacing.md,
    marginBottom:    spacing.sm,
    alignItems:      'center',
    ...shadows.card,
  },
  avatar: { marginRight: spacing.md },
  body:   { flex: 1 },
  top:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  name:   { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: theme.colors.textPrimary, flex: 1 },
  times:  { flexDirection: 'row', gap: spacing.md, marginBottom: 4 },
  timeItem:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText:{ fontSize: fontSize.xs, color: theme.colors.textSecondary },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gpsText:{ fontSize: fontSize.xs, color: theme.colors.textMuted, flex: 1 },
});

export default AttendanceCard;
