import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../ThemeProvider';

/** Shimmering placeholder block. */
export function Skeleton({ width = '100%', height = 14, radius, style }) {
  const theme = useTheme();
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.sm,
          backgroundColor: theme.colors.skeleton,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Card-shaped skeleton list for list screens. */
export function SkeletonList({ count = 6, cardHeight = 84, style }) {
  const theme = useTheme();
  return (
    <View style={[styles.list, { paddingHorizontal: theme.spacing.lg }, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.card,
            {
              height: cardHeight,
              backgroundColor: theme.colors.card,
              borderRadius: theme.radius.lg,
              borderColor: theme.colors.border,
              padding: theme.spacing.lg,
            },
          ]}
        >
          <Skeleton width={44} height={44} radius={22} />
          <View style={styles.lines}>
            <Skeleton width="62%" height={13} />
            <Skeleton width="38%" height={11} style={styles.lineGap} />
          </View>
          <Skeleton width={54} height={22} radius={11} />
        </View>
      ))}
    </View>
  );
}

/** Detail-page skeleton (hero + rows). */
export function SkeletonDetail({ style }) {
  const theme = useTheme();
  return (
    <View style={[{ padding: theme.spacing.lg }, style]}>
      <View style={styles.heroRow}>
        <Skeleton width={64} height={64} radius={32} />
        <View style={styles.lines}>
          <Skeleton width="55%" height={17} />
          <Skeleton width="35%" height={12} style={styles.lineGap} />
        </View>
      </View>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} height={52} radius={theme.radius.md} style={styles.blockGap} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingTop: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
  },
  lines: { flex: 1 },
  lineGap: { marginTop: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 22 },
  blockGap: { marginTop: 12 },
});
