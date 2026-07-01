import React, { forwardRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, fontSize, fontWeight, spacing } from '../../theme';
import FilterChip from './FilterChip';
import PrimaryButton from '../buttons/PrimaryButton';
import GhostButton from '../buttons/GhostButton';
import DateInput from '../inputs/DateInput';

// ─── Multi-select chip group ───────────────────────────────────────────────
const ChipGroup = ({ title, options, selected, onToggle, theme }) => {
  const s = chipStyles(theme);
  return (
    <View style={s.group}>
      <Text style={s.groupTitle}>{title}</Text>
      <View style={s.chips}>
        {options.map((opt) => (
          <FilterChip
            key={opt.value}
            label={opt.label}
            selected={selected.includes(opt.value)}
            onPress={() => onToggle(opt.value)}
          />
        ))}
      </View>
    </View>
  );
};

const chipStyles = (theme) => StyleSheet.create({
  group:      { marginBottom: spacing.lg },
  groupTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    color: theme.colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: spacing.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});

// ─── Date range row ────────────────────────────────────────────────────────
const DateRangeGroup = ({ title, fromKey, toKey, values, onChange, theme }) => {
  const s = dateStyles(theme);
  return (
    <View style={s.group}>
      <Text style={s.groupTitle}>{title}</Text>
      <View style={s.row}>
        <View style={s.half}>
          <DateInput
            label="From"
            value={values[fromKey]}
            onChange={(v) => onChange({ [fromKey]: v })}
            placeholder="Start date"
          />
        </View>
        <View style={s.half}>
          <DateInput
            label="To"
            value={values[toKey]}
            onChange={(v) => onChange({ [toKey]: v })}
            placeholder="End date"
          />
        </View>
      </View>
    </View>
  );
};

const dateStyles = (theme) => StyleSheet.create({
  group:      { marginBottom: spacing.lg },
  groupTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    color: theme.colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: spacing.sm,
  },
  row:  { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
});

// ─── Main FilterBottomSheet ────────────────────────────────────────────────
const FilterBottomSheet = forwardRef(({
  filterGroups = [],
  dateRangeGroups = [],
  values = {},
  onChange,
  onApply,
  onReset,
}, ref) => {
  const { theme } = useTheme();

  const renderBackdrop = useCallback((props) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
  ), []);

  const toggleChip = (key, value) => {
    const current = values[key] || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange?.({ ...values, [key]: next });
  };

  const handleDateChange = (updates) => {
    onChange?.({ ...values, ...updates });
  };

  const s = styles(theme);

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={['70%', '95%']}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
    >
      <View style={s.header}>
        <Text style={s.title}>Filters</Text>
        <GhostButton title="Reset all" onPress={onReset} />
      </View>

      <BottomSheetScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
      >
        {filterGroups.map((group) => (
          <ChipGroup
            key={group.key}
            title={group.title}
            options={group.options}
            selected={values[group.key] || []}
            onToggle={(val) => toggleChip(group.key, val)}
            theme={theme}
          />
        ))}

        {dateRangeGroups.map((group) => (
          <DateRangeGroup
            key={group.fromKey}
            title={group.title}
            fromKey={group.fromKey}
            toKey={group.toKey}
            values={values}
            onChange={handleDateChange}
            theme={theme}
          />
        ))}
      </BottomSheetScrollView>

      <View style={s.footer}>
        <PrimaryButton
          title="Apply Filters"
          onPress={() => { ref?.current?.close(); onApply?.(); }}
        />
      </View>
    </BottomSheet>
  );
});

const styles = (theme) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  title:  { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: theme.colors.textPrimary },
  body:   { padding: spacing.base, paddingBottom: 20 },
  footer: {
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
});

export default FilterBottomSheet;
