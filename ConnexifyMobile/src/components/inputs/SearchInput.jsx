import React, { useState, useRef, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, fontSize, spacing } from '../../theme';

const SearchInput = ({ value, onChangeText, placeholder = 'Search...', style, debounceMs = 300 }) => {
  const { theme } = useTheme();
  const [localValue, setLocalValue] = useState(value || '');
  const timer = useRef(null);

  const handleChange = useCallback((text) => {
    setLocalValue(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChangeText?.(text), debounceMs);
  }, [onChangeText, debounceMs]);

  const clear = () => {
    setLocalValue('');
    onChangeText?.('');
  };

  const s = styles(theme);

  return (
    <View style={[s.container, style]}>
      <Icon name="magnify" size={20} color={theme.colors.textMuted} style={s.icon} />
      <TextInput
        style={s.input}
        value={localValue}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {localValue.length > 0 && (
        <TouchableOpacity onPress={clear} style={s.clear} accessibilityLabel="Clear search">
          <Icon name="close-circle" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = (theme) => StyleSheet.create({
  container: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: theme.colors.surface,
    borderRadius:    borderRadius.lg,
    borderWidth:     1,
    borderColor:     theme.colors.border,
    height:          44,
    paddingHorizontal: spacing.sm,
  },
  icon:  { marginRight: spacing.xs },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    color:    theme.colors.textPrimary,
  },
  clear: { padding: 4 },
});

export default SearchInput;
