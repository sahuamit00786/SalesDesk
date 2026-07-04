import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ZoomIn,
} from 'react-native-reanimated';
import { trigger } from 'react-native-haptic-feedback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from './AppText';
import { Plus } from '../icons';
import { useTheme } from '../ThemeProvider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function FAB({
  icon: Icon = Plus,
  label,
  onPress,
  bottomOffset = 0,
  style,
  accessibilityLabel = 'Add',
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      entering={ZoomIn.springify().damping(15).delay(250)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        trigger('impactMedium', { enableVibrateFallback: false });
        onPress?.();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.92, theme.motion.springs.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, theme.motion.springs.press);
      }}
      style={[
        styles.fab,
        {
          backgroundColor: theme.brand,
          borderRadius: theme.radius.xl,
          bottom: insets.bottom + 16 + bottomOffset,
          paddingHorizontal: label ? 18 : 0,
          width: label ? undefined : 56,
          ...theme.elevation.fab,
        },
        animatedStyle,
        style,
      ]}
    >
      <Icon size={24} color={theme.onBrand} strokeWidth={2.4} />
      {label ? (
        <AppText variant="bodyStrong" color={theme.onBrand} style={styles.label}>
          {label}
        </AppText>
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: { marginRight: 2 },
});
