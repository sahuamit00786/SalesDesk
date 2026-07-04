import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { trigger } from 'react-native-haptic-feedback';
import AppText from './AppText';
import { X } from '../icons';
import { useTheme } from '../ThemeProvider';

/** Selectable filter chip. */
export default function Chip({ label, selected = false, onPress, onRemove, icon: Icon, style }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        trigger('selection', { enableVibrateFallback: false });
        onPress?.();
      }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.brand : theme.colors.card,
          borderColor: selected ? theme.brand : theme.colors.borderStrong,
          borderRadius: theme.radius.full,
        },
        style,
      ]}
    >
      {Icon ? (
        <Icon size={14} color={selected ? theme.onBrand : theme.colors.inkMuted} strokeWidth={2.2} />
      ) : null}
      <AppText variant="label" color={selected ? theme.onBrand : theme.colors.inkMuted}>
        {label}
      </AppText>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel={`Remove ${label}`}>
          <X size={13} color={selected ? theme.onBrand : theme.colors.inkFaint} strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
});
