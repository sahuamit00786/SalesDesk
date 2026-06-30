import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, fontSize, fontWeight, spacing } from '../../theme';

const DateInput = ({ label, value, onChange, error, style, placeholder = 'Select date', mode = 'date' }) => {
  const { theme } = useTheme();
  const [show, setShow] = useState(false);

  const displayValue = value
    ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  const s = styles(theme);

  return (
    <View style={[s.container, style]}>
      {label && <Text style={s.label}>{label}</Text>}
      <TouchableOpacity
        style={[s.trigger, error && s.errorBorder]}
        onPress={() => setShow(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Icon name="calendar-outline" size={18} color={theme.colors.textMuted} style={s.icon} />
        <Text style={[s.text, !displayValue && s.placeholder]}>
          {displayValue || placeholder}
        </Text>
        {value && (
          <TouchableOpacity onPress={() => onChange(null)} style={s.clear}>
            <Icon name="close-circle" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      {error && <Text style={s.error}>{error}</Text>}

      {show && (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShow(Platform.OS === 'ios');
            if (event.type !== 'dismissed' && date) {
              onChange(date.toISOString());
            }
          }}
        />
      )}
    </View>
  );
};

const styles = (theme) => StyleSheet.create({
  container: { marginBottom: spacing.base },
  label:     { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: theme.colors.textSecondary, marginBottom: 6 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    height: 48,
    paddingHorizontal: spacing.md,
  },
  errorBorder: { borderColor: theme.colors.danger },
  icon:        { marginRight: spacing.sm },
  text:        { flex: 1, fontSize: fontSize.base, color: theme.colors.textPrimary },
  placeholder: { color: theme.colors.textMuted },
  clear:       { padding: 4 },
  error:       { fontSize: fontSize.xs, color: theme.colors.danger, marginTop: 4 },
});

export default DateInput;
