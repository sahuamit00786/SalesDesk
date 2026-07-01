import React, { useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, fontSize, fontWeight, spacing } from '../../theme';

const SelectInput = ({ label, value, options = [], onSelect, placeholder = 'Select...', error, style }) => {
  const { theme } = useTheme();
  const sheetRef = useRef(null);

  const selected = options.find((o) => o.value === value);

  const renderBackdrop = useCallback((props) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
  ), []);

  const s = styles(theme);

  return (
    <>
      <View style={[s.container, style]}>
        {label && <Text style={s.label}>{label}</Text>}
        <TouchableOpacity
          style={[s.trigger, error && s.errorBorder]}
          onPress={() => sheetRef.current?.expand()}
          accessibilityRole="combobox"
          accessibilityLabel={label}
        >
          <Text style={[s.triggerText, !selected && s.placeholder]}>
            {selected ? selected.label : placeholder}
          </Text>
          <Icon name="chevron-down" size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>
        {error && <Text style={s.error}>{error}</Text>}
      </View>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={['40%', '60%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
      >
        <BottomSheetView>
          <Text style={s.sheetTitle}>{label || 'Select option'}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => String(item.value)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.option, item.value === value && s.optionSelected]}
                onPress={() => {
                  onSelect(item.value);
                  sheetRef.current?.close();
                }}
                accessibilityRole="menuitem"
              >
                <Text style={[s.optionText, item.value === value && s.optionTextSelected]}>
                  {item.label}
                </Text>
                {item.value === value && (
                  <Icon name="check" size={18} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </BottomSheetView>
      </BottomSheet>
    </>
  );
};

const styles = (theme) => StyleSheet.create({
  container:    { marginBottom: spacing.base },
  label:        { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: theme.colors.textSecondary, marginBottom: 6 },
  trigger: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius:    borderRadius.md,
    borderWidth:     1.5,
    borderColor:     theme.colors.border,
    height:          48,
    paddingHorizontal: spacing.md,
  },
  errorBorder:  { borderColor: theme.colors.danger },
  triggerText:  { fontSize: fontSize.base, color: theme.colors.textPrimary, flex: 1 },
  placeholder:  { color: theme.colors.textMuted },
  error:        { fontSize: fontSize.xs, color: theme.colors.danger, marginTop: 4 },
  sheetTitle:   { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: theme.colors.textPrimary, padding: spacing.base, paddingTop: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  optionSelected: { backgroundColor: theme.colors.primaryLight },
  optionText:         { fontSize: fontSize.base, color: theme.colors.textPrimary },
  optionTextSelected: { color: theme.colors.primary, fontWeight: fontWeight.semibold },
});

export default SelectInput;
