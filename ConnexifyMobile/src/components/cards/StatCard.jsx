import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, fontSize, fontWeight, shadows, spacing } from '../../theme';

const StatCard = ({ icon, label, value, trend, trendUp, color, style }) => {
  const { theme } = useTheme();
  const iconColor = color || theme.colors.primary;
  const s = styles(theme);

  return (
    <View style={[s.card, style]}>
      <View style={[s.iconWrap, { backgroundColor: iconColor + '18' }]}>
        <Icon name={icon} size={22} color={iconColor} />
      </View>
      <Text style={s.value}>{value ?? '—'}</Text>
      <Text style={s.label} numberOfLines={2}>{label}</Text>
      {trend !== undefined && (
        <View style={s.trendRow}>
          <Icon
            name={trendUp ? 'trending-up' : 'trending-down'}
            size={14}
            color={trendUp ? theme.colors.success : theme.colors.danger}
          />
          <Text style={[s.trend, { color: trendUp ? theme.colors.success : theme.colors.danger }]}>
            {trend}%
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = (theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius:    borderRadius.lg,
    padding:         spacing.md,
    minWidth:        130,
    ...shadows.card,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  value:    { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: theme.colors.textPrimary },
  label:    { fontSize: fontSize.xs, color: theme.colors.textSecondary, marginTop: 2 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6 },
  trend:    { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});

export default StatCard;
