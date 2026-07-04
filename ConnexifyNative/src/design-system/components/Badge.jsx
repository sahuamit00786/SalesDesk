import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from './AppText';
import { useTheme } from '../ThemeProvider';

/**
 * Status pill. Either pass `status` (lead status key → theme.statusStyles) or
 * `tone` (brand|success|warning|danger|info|neutral). label required.
 */
export default function Badge({ label, status, tone = 'neutral', size = 'md', style, dot = false }) {
  const theme = useTheme();

  let colors;
  if (status && theme.statusStyles[status]) {
    colors = theme.statusStyles[status];
  } else {
    colors = {
      brand: { bg: theme.brandSoft, text: theme.dark ? theme.colors.ink : theme.brand, border: 'transparent' },
      success: { bg: theme.colors.successSoft, text: theme.dark ? '#4ADE80' : '#15803D', border: 'transparent' },
      warning: { bg: theme.colors.warningSoft, text: theme.dark ? '#FBBF24' : '#B45309', border: 'transparent' },
      danger: { bg: theme.colors.dangerSoft, text: theme.dark ? '#F87171' : '#B91C1C', border: 'transparent' },
      info: { bg: theme.colors.infoSoft, text: theme.dark ? '#22D3EE' : '#0E7490', border: 'transparent' },
      neutral: { bg: theme.dark ? 'rgba(255,255,255,0.08)' : '#F3F4F6', text: theme.colors.inkMuted, border: 'transparent' },
    }[tone];
  }

  const compact = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border || 'transparent',
          borderWidth: colors.border && colors.border !== 'transparent' ? 1 : 0,
          borderRadius: theme.radius.full,
          paddingHorizontal: compact ? 8 : 10,
          paddingVertical: compact ? 2 : 4,
        },
        style,
      ]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: colors.text }]} /> : null}
      <AppText variant={compact ? 'micro' : 'captionStrong'} color={colors.text} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
