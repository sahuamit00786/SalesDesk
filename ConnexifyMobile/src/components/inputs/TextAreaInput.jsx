import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, fontSize, fontWeight, spacing } from '../../theme';

const TextAreaInput = ({ label, value, onChangeText, placeholder, error, maxLength = 500, style }) => {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const s = styles(theme);

  return (
    <View style={[s.container, style]}>
      {label && <Text style={s.label}>{label}</Text>}
      <View style={[s.wrap, focused && s.focusBorder, error && s.errorBorder]}>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          numberOfLines={4}
          maxLength={maxLength}
          textAlignVertical="top"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <Text style={s.count}>{(value?.length || 0)}/{maxLength}</Text>
      </View>
      {error && <Text style={s.error}>{error}</Text>}
    </View>
  );
};

const styles = (theme) => StyleSheet.create({
  container:   { marginBottom: spacing.base },
  label:       { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: theme.colors.textSecondary, marginBottom: 6 },
  wrap: {
    backgroundColor: theme.colors.surface,
    borderRadius:    borderRadius.md,
    borderWidth:     1.5,
    borderColor:     theme.colors.border,
    padding:         spacing.sm,
  },
  focusBorder: { borderColor: theme.colors.primary },
  errorBorder: { borderColor: theme.colors.danger },
  input: {
    color:    theme.colors.textPrimary,
    fontSize: fontSize.base,
    minHeight: 100,
  },
  count: {
    alignSelf: 'flex-end',
    fontSize:  fontSize.xs,
    color:     theme.colors.textMuted,
    marginTop: 4,
  },
  error: { fontSize: fontSize.xs, color: theme.colors.danger, marginTop: 4 },
});

export default TextAreaInput;
