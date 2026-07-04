import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../ThemeProvider';

export default function ProgressBar({ value = 0, height = 7, color, trackColor, style }) {
  const theme = useTheme();
  const progress = useSharedValue(0);
  const clamped = Math.min(1, Math.max(0, Number(value) || 0));

  useEffect(() => {
    progress.value = withTiming(clamped, { duration: theme.motion.durations.slow });
  }, [clamped]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor || theme.colors.skeleton,
          overflow: 'hidden',
        },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Animated.View
        style={[{ height: '100%', borderRadius: height / 2, backgroundColor: color || theme.brand }, fillStyle]}
      />
    </View>
  );
}
