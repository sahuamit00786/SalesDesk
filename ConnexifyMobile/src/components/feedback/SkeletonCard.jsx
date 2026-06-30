import React from 'react';
import { View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, spacing } from '../../theme';

const ShimmerBar = ({ width, height = 14, style }) => {
  const { theme } = useTheme();
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-200, 200]) }],
  }));

  const baseColor = theme.colors.border;
  const highlightColor = theme.colors.surfaceAlt;

  return (
    <View style={[{ width, height, backgroundColor: baseColor, borderRadius: borderRadius.sm, overflow: 'hidden' }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
        <LinearGradient
          colors={[baseColor, highlightColor, baseColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const SkeletonCard = ({ style }) => {
  const { theme } = useTheme();
  const s = styles(theme);

  return (
    <View style={[s.card, style]}>
      <View style={s.bar} />
      <View style={s.body}>
        <View style={s.topRow}>
          <ShimmerBar width="60%" height={16} />
          <ShimmerBar width={40} height={12} />
        </View>
        <View style={s.midRow}>
          <ShimmerBar width={80} height={12} />
          <ShimmerBar width={60} height={12} />
        </View>
        <View style={s.bottomRow}>
          <ShimmerBar width={70} height={22} style={{ borderRadius: borderRadius.full }} />
          <ShimmerBar width={28} height={28} style={{ borderRadius: borderRadius.full }} />
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
    marginBottom:    spacing.sm,
    overflow:        'hidden',
  },
  bar:       { width: 4, backgroundColor: theme.colors.border },
  body:      { flex: 1, padding: spacing.md },
  topRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  midRow:    { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

export default SkeletonCard;
