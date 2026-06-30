import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, fontSize, fontWeight, spacing } from '../../theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const PrimaryButton = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = true,
}) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    if (disabled || loading) return;
    ReactNativeHapticFeedback.trigger('impactLight');
    onPress?.();
  };

  const s = styles(theme);

  return (
    <AnimatedTouchable
      style={[
        s.button,
        fullWidth && s.fullWidth,
        (disabled || loading) && s.disabled,
        animatedStyle,
        style,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.textInverse} size="small" />
      ) : (
        <View style={s.content}>
          {icon && <View style={s.iconWrap}>{icon}</View>}
          <Text style={[s.text, textStyle]}>{title}</Text>
        </View>
      )}
    </AnimatedTouchable>
  );
};

const styles = (theme) => StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius:    borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  fullWidth: { width: '100%' },
  disabled:  { opacity: 0.55 },
  content:   { flexDirection: 'row', alignItems: 'center' },
  iconWrap:  { marginRight: spacing.sm },
  text: {
    color:      theme.colors.textInverse,
    fontSize:   fontSize.base,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.3,
  },
});

export default PrimaryButton;
