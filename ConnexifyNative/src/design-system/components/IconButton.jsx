import React from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../ThemeProvider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * variant: plain | soft | outline | brand
 */
export default function IconButton({
  icon: Icon,
  onPress,
  size = 40,
  iconSize,
  variant = 'soft',
  color,
  disabled = false,
  accessibilityLabel,
  style,
  badge = 0,
  ...rest
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const palette = {
    plain: { bg: 'transparent', border: 'transparent', icon: color || theme.colors.inkMuted },
    soft: { bg: theme.colors.card, border: theme.colors.border, icon: color || theme.colors.inkMuted },
    outline: { bg: 'transparent', border: theme.colors.borderStrong, icon: color || theme.colors.inkMuted },
    brand: { bg: theme.brandSoft, border: 'transparent', icon: color || theme.brand },
  }[variant];

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.92, theme.motion.springs.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, theme.motion.springs.press);
      }}
      hitSlop={6}
      style={[
        {
          width: size,
          height: size,
          borderRadius: theme.radius.md,
          backgroundColor: palette.bg,
          borderWidth: palette.border === 'transparent' ? 0 : 1,
          borderColor: palette.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        animatedStyle,
        style,
      ]}
      {...rest}
    >
      <Icon size={iconSize || Math.round(size * 0.5)} color={palette.icon} strokeWidth={2.1} />
      {badge > 0 ? (
        <Animated.View
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 17,
            height: 17,
            borderRadius: 9,
            backgroundColor: theme.colors.danger,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
            borderWidth: 1.5,
            borderColor: theme.colors.page,
          }}
        >
          <Animated.Text
            style={{ color: '#fff', fontSize: 9.5, fontFamily: theme.fonts.bold }}
            numberOfLines={1}
          >
            {badge > 99 ? '99+' : badge}
          </Animated.Text>
        </Animated.View>
      ) : null}
    </AnimatedPressable>
  );
}
