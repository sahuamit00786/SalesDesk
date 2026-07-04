import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AppText from './AppText';
import { Calendar, Clock, X } from '../icons';
import { useTheme } from '../ThemeProvider';
import { formatDate, formatDateTime, formatTime } from '../../utils/format';

/**
 * Date / time / datetime picker field. value: Date|ISO string|null, onChange(Date|null).
 * mode: 'date' | 'time' | 'datetime' (datetime = two-step on Android).
 */
export default function DateField({
  label,
  value,
  onChange,
  mode = 'date',
  placeholder = 'Pick a date',
  error,
  helper,
  clearable = false,
  minimumDate,
  maximumDate,
  disabled = false,
  style,
}) {
  const theme = useTheme();
  const [step, setStep] = useState(null); // null | 'date' | 'time'
  const dateValue = value ? (value instanceof Date ? value : new Date(value)) : null;

  const display = !dateValue
    ? null
    : mode === 'time'
      ? formatTime(dateValue)
      : mode === 'datetime'
        ? formatDateTime(dateValue)
        : formatDate(dateValue);

  const openPicker = () => setStep(mode === 'time' ? 'time' : 'date');

  const handlePicked = (event, picked) => {
    const current = step;
    setStep(null);
    if (event.type !== 'set' || !picked) return;
    if (mode === 'datetime' && current === 'date') {
      const base = dateValue || new Date();
      const merged = new Date(picked);
      merged.setHours(base.getHours(), base.getMinutes(), 0, 0);
      onChange?.(merged);
      // chain to time picker
      requestAnimationFrame(() => setStep('time'));
      return;
    }
    if (mode === 'datetime' && current === 'time') {
      const base = dateValue || new Date();
      const merged = new Date(base);
      merged.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
      onChange?.(merged);
      return;
    }
    onChange?.(picked);
  };

  const Icon = mode === 'time' ? Clock : Calendar;

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
        onPress={openPicker}
        style={[
          styles.field,
          {
            backgroundColor: disabled ? theme.colors.skeleton : theme.colors.inputBg,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        <Icon size={18} color={theme.colors.inkFaint} strokeWidth={2} />
        <AppText variant="body" color={display ? 'ink' : 'inkFaint'} style={styles.value} numberOfLines={1}>
          {display || placeholder}
        </AppText>
        {clearable && dateValue ? (
          <Pressable onPress={() => onChange?.(null)} hitSlop={8} accessibilityLabel="Clear date">
            <X size={16} color={theme.colors.inkFaint} strokeWidth={2.4} />
          </Pressable>
        ) : null}
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
      {step ? (
        <DateTimePicker
          value={dateValue || new Date()}
          mode={step}
          onChange={handlePicked}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}
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
  value: { flex: 1 },
  helper: { marginTop: 5 },
});
