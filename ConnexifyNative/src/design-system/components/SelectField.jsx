import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AppText from './AppText';
import SelectSheet from './SelectSheet';
import { ChevronDown } from '../icons';
import { useTheme } from '../ThemeProvider';

/**
 * Form select — opens a SelectSheet. Standardized contract: value + onChange.
 * options: [{value,label,description?,icon?,color?}]
 */
export default function SelectField({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  error,
  helper,
  icon: Icon,
  searchable = false,
  multi = false,
  disabled = false,
  style,
}) {
  const theme = useTheme();
  const sheetRef = useRef(null);

  const selected = multi
    ? options.filter((o) => (Array.isArray(value) ? value : []).includes(o.value))
    : options.find((o) => o.value === value);
  const display = multi
    ? selected.map((o) => o.label).join(', ')
    : selected?.label;

  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <AppText variant="label" color={error ? 'danger' : 'inkMuted'} style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
        disabled={disabled}
        onPress={() =>
          sheetRef.current?.open({
            title: label || placeholder,
            options,
            value,
            onChange,
            multi,
            searchable: searchable || options.length > 8,
          })
        }
        style={[
          styles.field,
          {
            backgroundColor: disabled ? theme.colors.skeleton : theme.colors.inputBg,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        {Icon ? <Icon size={18} color={theme.colors.inkFaint} strokeWidth={2} style={styles.icon} /> : null}
        <AppText
          variant="body"
          color={display ? 'ink' : 'inkFaint'}
          numberOfLines={1}
          style={styles.value}
        >
          {display || placeholder}
        </AppText>
        <ChevronDown size={17} color={theme.colors.inkFaint} strokeWidth={2.2} />
      </Pressable>
      {error ? (
        <AppText variant="caption" color="danger" style={styles.helper}>
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" color="inkFaint" style={styles.helper}>
          {helper}
        </AppText>
      ) : null}
      <SelectSheet ref={sheetRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  label: { marginBottom: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    minHeight: 48,
    paddingHorizontal: 14,
    gap: 10,
  },
  icon: {},
  value: { flex: 1 },
  helper: { marginTop: 5 },
});
