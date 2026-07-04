import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { trigger } from 'react-native-haptic-feedback';
import AppText from './AppText';
import { useTheme } from '../ThemeProvider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SIZES = {
  sm: { height: 36, paddingH: 14, icon: 16, variant: 'label' },
  md: { height: 46, paddingH: 18, icon: 18, variant: 'bodyStrong' },
  lg: { height: 52, paddingH: 22, icon: 20, variant: 'bodyStrong' },
};

/**
 * variant: primary | secondary | ghost | danger | dangerSoft
 * icon / iconRight: lucide icon component (not element)
 */
export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  disabled = false,
  haptic = true,
  fullWidth = false,
  style,
  ...rest
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const dim = SIZES[size] || SIZES.md;
  const inactive = disabled || loading;

  const palette = {
    primary: { bg: theme.brand, text: theme.onBrand, border: 'transparent' },
    secondary: { bg: theme.brandSoft, text: theme.dark ? theme.colors.ink : theme.brand, border: theme.colors.border },
    ghost: { bg: 'transparent', text: theme.colors.inkMuted, border: theme.colors.borderStrong },
    danger: { bg: theme.colors.danger, text: '#FFFFFF', border: 'transparent' },
    dangerSoft: { bg: theme.colors.dangerSoft, text: theme.colors.danger, border: 'transparent' },
  }[variant];

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPressIn={() => {
        scale.value = withSpring(0.97, theme.motion.springs.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, theme.motion.springs.press);
      }}
      onPress={(e) => {
        if (haptic) trigger('impactLight', { enableVibrateFallback: false });
        onPress?.(e);
      }}
      style={[
        styles.base,
        {
          height: dim.height,
          paddingHorizontal: dim.paddingH,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: palette.border === 'transparent' ? 0 : 1,
          borderRadius: theme.radius.md,
          opacity: inactive ? 0.55 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        animatedStyle,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.text} />
      ) : (
        <View style={styles.row}>
          {Icon ? <Icon size={dim.icon} color={palette.text} strokeWidth={2.2} /> : null}
          {title ? (
            <AppText variant={dim.variant} color={palette.text} style={Icon || IconRight ? styles.gap : null}>
              {title}
            </AppText>
          ) : null}
          {IconRight ? <IconRight size={dim.icon} color={palette.text} strokeWidth={2.2} /> : null}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gap: {},
});
