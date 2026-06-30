import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, fontSize, fontWeight, spacing } from '../../theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const DangerButton = ({ title, onPress, loading, disabled, style, fullWidth = true }) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedTouchable
      style={[styles(theme).button, fullWidth && { width: '100%' }, animStyle, style]}
      onPress={() => {
        ReactNativeHapticFeedback.trigger('notificationWarning');
        onPress?.();
      }}
      onPressIn={() => { scale.value = withSpring(0.95); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      disabled={disabled || loading}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {loading
        ? <ActivityIndicator color="#fff" size="small" />
        : <Text style={styles(theme).text}>{title}</Text>
      }
    </AnimatedTouchable>
  );
};

const styles = (theme) => StyleSheet.create({
  button: {
    backgroundColor: theme.colors.danger,
    borderRadius:    borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  text: {
    color:      '#fff',
    fontSize:   fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});

export default DangerButton;
