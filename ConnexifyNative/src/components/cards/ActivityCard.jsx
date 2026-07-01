import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, fontSize, fontWeight, shadows, spacing } from '../../theme';

const TYPE_META = {
  Call:       { icon: 'phone',           color: '#4F46E5' },
  Meeting:    { icon: 'calendar',        color: '#06B6D4' },
  Email:      { icon: 'email-outline',   color: '#F59E0B' },
  WhatsApp:   { icon: 'whatsapp',        color: '#25D366' },
  'Site Visit':{ icon: 'map-marker',    color: '#EF4444' },
  Demo:       { icon: 'presentation',    color: '#8B5CF6' },
  'Follow-up':{ icon: 'refresh',        color: '#10B981' },
  Note:       { icon: 'note-text',       color: '#64748B' },
};

const ActivityCard = ({ activity, style }) => {
  const { theme } = useTheme();
  const meta = TYPE_META[activity.type] || { icon: 'lightning-bolt', color: theme.colors.primary };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  const s = styles(theme);

  return (
    <View style={[s.card, style]}>
      <View style={[s.iconWrap, { backgroundColor: meta.color + '20' }]}>
        <Icon name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={s.body}>
        <View style={s.header}>
          <Text style={s.type}>{activity.type}</Text>
          <Text style={s.date}>{formatDate(activity.activityDate || activity.createdAt)}</Text>
        </View>
        {activity.description && (
          <Text style={s.desc} numberOfLines={2}>{activity.description}</Text>
        )}
        <View style={s.footer}>
          {activity.lead?.name && (
            <View style={s.tag}>
              <Icon name="account-outline" size={11} color={theme.colors.textMuted} />
              <Text style={s.tagText}>{activity.lead.name}</Text>
            </View>
          )}
          {activity.assignedTo?.name && (
            <View style={s.tag}>
              <Icon name="account-tie-outline" size={11} color={theme.colors.textMuted} />
              <Text style={s.tagText}>{activity.assignedTo.name}</Text>
            </View>
          )}
          {activity.duration && (
            <View style={s.tag}>
              <Icon name="clock-outline" size={11} color={theme.colors.textMuted} />
              <Text style={s.tagText}>{activity.duration}m</Text>
            </View>
          )}
        </View>
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
    alignItems:      'flex-start',
    ...shadows.card,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  body:   { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  type:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: theme.colors.textPrimary },
  date:   { fontSize: fontSize.xs, color: theme.colors.textMuted },
  desc:   { fontSize: fontSize.sm, color: theme.colors.textSecondary, marginBottom: 6 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tagText:{ fontSize: fontSize.xs, color: theme.colors.textMuted },
});

export default ActivityCard;
