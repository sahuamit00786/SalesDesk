import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTheme } from '../../theme/ThemeContext';
import { fontSize, fontWeight, spacing } from '../../theme';

const GhostButton = ({ title, onPress, disabled, icon, style, textStyle, color }) => {
  const { theme } = useTheme();
  const textColor = color || theme.colors.primary;

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={() => {
        ReactNativeHapticFeedback.trigger('impactLight');
        onPress?.();
      }}
      disabled={disabled}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.content}>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <Text style={[styles.text, { color: textColor }, textStyle]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button:  { padding: spacing.sm, alignSelf: 'flex-start' },
  content: { flexDirection: 'row', alignItems: 'center' },
  iconWrap:{ marginRight: spacing.xs },
  text:    { fontSize: fontSize.base, fontWeight: fontWeight.medium },
});

export default GhostButton;
