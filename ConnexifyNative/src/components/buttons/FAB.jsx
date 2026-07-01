import React, { useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolate,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, fontSize, fontWeight, shadows, spacing } from '../../theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const FAB = ({ onPress, actions, icon = 'plus' }) => {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const rotation = useSharedValue(0);
  const scale    = useSharedValue(1);

  const toggleOpen = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    const next = !open;
    setOpen(next);
    rotation.value = withSpring(next ? 1 : 0, { damping: 12, stiffness: 200 });
  };

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotation.value, [0, 1], [0, 45])}deg` }],
  }));

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const s = styles(theme);

  if (!actions) {
    return (
      <AnimatedTouchable
        style={[s.fab, fabStyle]}
        onPress={() => {
          ReactNativeHapticFeedback.trigger('impactMedium');
          onPress?.();
        }}
        onPressIn={() => { scale.value = withSpring(0.9); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel="Add"
      >
        <Icon name={icon} size={26} color="#fff" />
      </AnimatedTouchable>
    );
  }

  return (
    <View style={s.container} pointerEvents="box-none">
      {open && actions?.map((action, i) => (
        <Animated.View
          key={action.label}
          entering={undefined}
          style={[s.actionRow, { bottom: 72 + i * 56 }]}
        >
          <Text style={s.actionLabel}>{action.label}</Text>
          <TouchableOpacity
            style={[s.actionButton, { backgroundColor: action.color || theme.colors.primary }]}
            onPress={() => {
              toggleOpen();
              action.onPress?.();
            }}
            accessibilityLabel={action.label}
          >
            <Icon name={action.icon} size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      ))}

      <AnimatedTouchable
        style={[s.fab, fabStyle]}
        onPress={toggleOpen}
        onPressIn={() => { scale.value = withSpring(0.9); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel="Actions"
      >
        <Animated.View style={iconStyle}>
          <Icon name={icon} size={26} color="#fff" />
        </Animated.View>
      </AnimatedTouchable>
    </View>
  );
};

const styles = (theme) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing['2xl'],
    right: spacing.base,
    alignItems: 'flex-end',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
  },
  actionRow: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionLabel: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    ...shadows.card,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
});

export default FAB;
