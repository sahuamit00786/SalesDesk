import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, fontSize, fontWeight, shadows, spacing } from '../../theme';
import Avatar from '../misc/Avatar';
import StatusBadge from '../misc/StatusBadge';

const TeamMemberCard = ({ member, onPress, style }) => {
  const { theme } = useTheme();
  const s = styles(theme);

  const STATUS_COLOR = {
    Present: theme.colors.attendancePresent,
    Absent:  theme.colors.attendanceAbsent,
    Late:    theme.colors.attendanceLate,
  };

  return (
    <TouchableOpacity
      style={[s.card, style]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={member.name}
    >
      <Avatar name={member.name} size={48} uri={member.avatar} />
      <View style={s.body}>
        <Text style={s.name}>{member.name}</Text>
        <Text style={s.role}>{member.role || 'Member'}</Text>
        <View style={s.stats}>
          <Text style={s.stat}>{member.leadsCount ?? 0} leads</Text>
          <Text style={s.dot}>·</Text>
          <Text style={s.stat}>{member.activitiesCount ?? 0} activities</Text>
        </View>
      </View>
      {member.todayStatus && (
        <StatusBadge
          label={member.todayStatus}
          color={STATUS_COLOR[member.todayStatus] || theme.colors.textMuted}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = (theme) => StyleSheet.create({
  card: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: theme.colors.surface,
    borderRadius:    borderRadius.lg,
    padding:         spacing.md,
    marginBottom:    spacing.sm,
    gap:             spacing.md,
    ...shadows.card,
  },
  body:  { flex: 1 },
  name:  { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: theme.colors.textPrimary },
  role:  { fontSize: fontSize.xs, color: theme.colors.textMuted, marginBottom: 4 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stat:  { fontSize: fontSize.xs, color: theme.colors.textSecondary },
  dot:   { color: theme.colors.textMuted },
});

export default TeamMemberCard;
