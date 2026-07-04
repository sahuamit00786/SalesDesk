import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../ThemeProvider';

export function Card({ children, style, elevated = false, padded = true, ...rest }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: elevated ? theme.colors.cardElevated : theme.colors.card,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: padded ? theme.spacing.lg : 0,
          ...(elevated ? theme.elevation.raised : theme.elevation.card),
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableCard({ children, onPress, onLongPress, style, padded = true, ...rest }) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, theme.motion.springs.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, theme.motion.springs.press);
      }}
      style={[
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: padded ? theme.spacing.lg : 0,
          ...theme.elevation.card,
        },
        animatedStyle,
        style,
      ]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

export default Card;
