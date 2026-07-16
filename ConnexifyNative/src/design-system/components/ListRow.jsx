import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import AppText from './AppText';
import { ChevronRight } from '../icons';
import { useTheme } from '../ThemeProvider';

/** Settings/menu row: leading icon, title/subtitle, trailing slot or chevron. */
export default function ListRow({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  onPress,
  trailing,
  chevron = true,
  destructive = false,
  accessibilityLabel,
  style,
}) {
  const theme = useTheme();
  const tint = destructive ? theme.colors.danger : iconColor || theme.brand;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || [title, subtitle].filter(Boolean).join(', ')}
      onPress={onPress}
      android_ripple={{ color: theme.brandFaint }}
      style={({ pressed }) => [
        styles.row,
        { paddingVertical: subtitle ? 12 : 14, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {Icon ? (
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: destructive ? theme.colors.dangerSoft : theme.brandFaint,
              borderRadius: theme.radius.sm + 2,
            },
          ]}
        >
          <Icon size={18} color={tint} strokeWidth={2.1} />
        </View>
      ) : null}
      <View style={styles.texts}>
        <AppText variant="bodyStrong" color={destructive ? 'danger' : 'ink'} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="inkFaint" numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing || (chevron && onPress ? <ChevronRight size={18} color={theme.colors.inkFaint} strokeWidth={2} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  iconWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1 },
  subtitle: { marginTop: 1 },
});
