import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import AppText from './AppText';
import { Eye, EyeOff } from '../icons';
import { useTheme } from '../ThemeProvider';

/**
 * Themed input with animated focus border, error shake, optional left icon and
 * secure-entry toggle. Controlled: pass value + onChangeText.
 */
export default function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helper,
  icon: Icon,
  secureTextEntry,
  multiline = false,
  numberOfLines,
  maxLength,
  style,
  inputStyle,
  editable = true,
  rightSlot = null,
  ...rest
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  const focusAnim = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const prevError = React.useRef(error);

  React.useEffect(() => {
    focusAnim.value = withTiming(focused ? 1 : 0, { duration: theme.motion.durations.fast });
  }, [focused]);

  React.useEffect(() => {
    if (error && error !== prevError.current) {
      shakeX.value = withSequence(
        withTiming(-6, { duration: 45 }),
        withTiming(6, { duration: 45 }),
        withTiming(-4, { duration: 40 }),
        withTiming(0, { duration: 40 }),
      );
    }
    prevError.current = error;
  }, [error]);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? theme.colors.danger
      : interpolateColor(focusAnim.value, [0, 1], [theme.colors.border, theme.brand]),
    transform: [{ translateX: shakeX.value }],
  }));

  const iconColor = error ? theme.colors.danger : focused ? theme.brand : theme.colors.inkFaint;

  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <AppText variant="label" color={error ? 'danger' : focused ? theme.brand : 'inkMuted'} style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <Animated.View
        style={[
          styles.field,
          {
            backgroundColor: editable ? theme.colors.inputBg : theme.colors.skeleton,
            borderRadius: theme.radius.md,
            minHeight: multiline ? 96 : 48,
          },
          borderStyle,
        ]}
      >
        {Icon ? (
          <View style={styles.icon}>
            <Icon size={18} color={iconColor} strokeWidth={2} />
          </View>
        ) : null}
        <TextInput
          value={value == null ? '' : String(value)}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.inkFaint}
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines || 4 : 1}
          maxLength={maxLength}
          editable={editable}
          style={[
            styles.input,
            theme.type.body,
            {
              color: theme.colors.ink,
              paddingLeft: Icon ? 0 : 14,
              textAlignVertical: multiline ? 'top' : 'center',
              paddingTop: multiline ? 12 : 0,
            },
            inputStyle,
          ]}
          {...rest}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((h) => !h)}
            style={styles.trailing}
            hitSlop={8}
          >
            {hidden ? (
              <Eye size={18} color={theme.colors.inkFaint} strokeWidth={2} />
            ) : (
              <EyeOff size={18} color={theme.colors.inkFaint} strokeWidth={2} />
            )}
          </Pressable>
        ) : rightSlot ? (
          <View style={styles.trailing}>{rightSlot}</View>
        ) : null}
      </Animated.View>
      {error ? (
        <AppText variant="caption" color="danger" style={styles.helper}>
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" color="inkFaint" style={styles.helper}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  label: { marginBottom: 6 },
  field: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.2 },
  icon: { paddingLeft: 14, paddingRight: 10 },
  input: { flex: 1, paddingRight: 14, paddingVertical: 0, minHeight: 46 },
  trailing: { paddingHorizontal: 12 },
  helper: { marginTop: 5 },
});
