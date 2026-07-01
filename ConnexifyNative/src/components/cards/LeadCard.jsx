import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, fontSize, fontWeight, shadows, spacing } from '../../theme';
import { stageColorMap, priorityColorMap } from '../../theme/colors';
import Avatar from '../misc/Avatar';
import StatusBadge from '../misc/StatusBadge';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const STAGE_ICONS = {
  New: 'star-outline', Contacted: 'phone-outline', Interested: 'heart-outline',
  'Follow-up': 'clock-outline', Converted: 'check-circle-outline', Lost: 'close-circle-outline',
};

const LeadCard = ({ lead, onPress, style }) => {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const stageColor = stageColorMap[lead.stage]?.[isDark ? 'dark' : 'light'] || theme.colors.textMuted;
  const priorityMeta = priorityColorMap[lead.priority] || {};

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH}h ago`;
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  const s = styles(theme);

  return (
    <AnimatedTouchable
      style={[s.card, animStyle, style]}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={`Lead: ${lead.name}`}
    >
      <View style={[s.stageBar, { backgroundColor: stageColor }]} />
      <View style={s.body}>
        <View style={s.top}>
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={1}>{lead.name}</Text>
            {lead.priority && (
              <View style={[s.priorityPill, { backgroundColor: priorityMeta.bg }]}>
                <Text style={[s.priorityText, { color: priorityMeta.text }]}>{lead.priority}</Text>
              </View>
            )}
          </View>
          <Text style={s.time}>{formatTime(lead.lastActivityAt || lead.updatedAt)}</Text>
        </View>

        <View style={s.meta}>
          {lead.phone && (
            <View style={s.metaItem}>
              <Icon name="phone-outline" size={13} color={theme.colors.textMuted} />
              <Text style={s.metaText}>{lead.phone}</Text>
            </View>
          )}
          {lead.source && (
            <View style={s.metaItem}>
              <Icon name="source-branch" size={13} color={theme.colors.textMuted} />
              <Text style={s.metaText}>{lead.source}</Text>
            </View>
          )}
        </View>

        <View style={s.bottom}>
          <StatusBadge label={lead.stage} color={stageColor} icon={STAGE_ICONS[lead.stage]} />
          {lead.assignedTo && (
            <Avatar
              name={lead.assignedTo?.name || lead.assignedTo}
              size={24}
              style={s.avatar}
            />
          )}
        </View>
      </View>
    </AnimatedTouchable>
  );
};

const styles = (theme) => StyleSheet.create({
  card: {
    flexDirection:   'row',
    backgroundColor: theme.colors.surface,
    borderRadius:    borderRadius.lg,
    marginBottom:    spacing.sm,
    overflow:        'hidden',
    ...shadows.card,
  },
  stageBar: { width: 4 },
  body:     { flex: 1, padding: spacing.md },
  top:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  nameRow:  { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  name:     { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: theme.colors.textPrimary, flex: 1 },
  time:     { fontSize: fontSize.xs, color: theme.colors.textMuted, flexShrink: 0 },
  priorityPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  priorityText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  meta:     { flexDirection: 'row', gap: spacing.md, marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: fontSize.xs, color: theme.colors.textMuted },
  bottom:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatar:   { marginLeft: 'auto' },
});

export default LeadCard;
