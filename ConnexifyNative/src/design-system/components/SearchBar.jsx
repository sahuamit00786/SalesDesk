import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import AppText from './AppText';
import { Search, X } from '../icons';
import { useTheme } from '../ThemeProvider';

/** Debounced search input (350ms). Pass onDebounced for query updates. */
export default function SearchBar({
  value,
  onChangeText,
  onDebounced,
  placeholder = 'Search…',
  debounceMs = 350,
  style,
  autoFocus = false,
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const timer = useRef(null);

  const handleChange = (text) => {
    onChangeText?.(text);
    if (onDebounced) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => onDebounced(text), debounceMs);
    }
  };

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.colors.inputBg,
          borderColor: focused ? theme.brand : theme.colors.border,
          borderRadius: theme.radius.md,
        },
        style,
      ]}
    >
      <Search size={17} color={focused ? theme.brand : theme.colors.inkFaint} strokeWidth={2.2} />
      <TextInput
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.inkFaint}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={[styles.input, theme.type.body, { color: theme.colors.ink }]}
        accessibilityRole="search"
      />
      {value ? (
        <Pressable
          onPress={() => {
            handleChange('');
          }}
          hitSlop={8}
          accessibilityLabel="Clear search"
        >
          <View style={[styles.clear, { backgroundColor: theme.colors.skeleton }]}>
            <X size={12} color={theme.colors.inkMuted} strokeWidth={2.6} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  input: { flex: 1, paddingVertical: 0 },
  clear: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
