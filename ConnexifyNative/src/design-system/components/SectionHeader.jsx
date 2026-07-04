import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import AppText from './AppText';
import { useTheme } from '../ThemeProvider';

export default function SectionHeader({ title, action, onAction, style, variant = 'subheading' }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, style]}>
      <AppText variant={variant}>{title}</AppText>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <AppText variant="label" color={theme.brand}>
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Divider({ style, inset = 0 }) {
  const theme = useTheme();
  return (
    <View
      style={[{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.divider, marginLeft: inset }, style]}
    />
  );
}

export function KeyValueRow({ label, value, valueColor = 'ink', style }) {
  const theme = useTheme();
  return (
    <View style={[styles.kv, { paddingVertical: theme.spacing.sm + 2 }, style]}>
      <AppText variant="body" color="inkMuted" style={styles.kvLabel}>
        {label}
      </AppText>
      {typeof value === 'string' || typeof value === 'number' ? (
        <AppText variant="bodyStrong" color={valueColor} style={styles.kvValue} numberOfLines={2}>
          {value === '' || value === null || value === undefined ? '—' : value}
        </AppText>
      ) : (
        <View style={styles.kvValue}>{value}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kv: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  kvLabel: { width: 110 },
  kvValue: { flex: 1, alignItems: 'flex-end', textAlign: 'right' },
});
