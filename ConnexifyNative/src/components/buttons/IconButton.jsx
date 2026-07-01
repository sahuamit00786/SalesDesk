import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius } from '../../theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const IconButton = ({ name, size = 22, onPress, color, bgColor, style, accessibilityLabel }) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedTouchable
      style={[
        styles.button,
        { backgroundColor: bgColor || theme.colors.surfaceAlt },
        animStyle,
        style,
      ]}
      onPress={() => {
        ReactNativeHapticFeedback.trigger('impactLight');
        onPress?.();
      }}
      onPressIn={() => { scale.value = withSpring(0.88, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || name}
    >
      <Icon name={name} size={size} color={color || theme.colors.textSecondary} />
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default IconButton;
