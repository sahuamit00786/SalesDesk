import React, { forwardRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, fontSize, fontWeight, spacing } from '../../theme';

const SortSheet = forwardRef(({ options = [], value, onChange }, ref) => {
  const { theme } = useTheme();

  const renderBackdrop = useCallback((props) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
  ), []);

  const s = styles(theme);

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={['45%']}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
    >
      <BottomSheetView>
        <Text style={s.title}>Sort by</Text>
        {options.map((opt) => {
          const isActive = value?.field === opt.field;
          const isAsc    = value?.order === 'ASC';
          return (
            <TouchableOpacity
              key={opt.field}
              style={s.row}
              onPress={() => {
                if (isActive) {
                  onChange({ field: opt.field, order: isAsc ? 'DESC' : 'ASC' });
                } else {
                  onChange({ field: opt.field, order: 'DESC' });
                }
                ref?.current?.close();
              }}
              accessibilityRole="menuitem"
              accessibilityLabel={opt.label}
            >
              <Icon
                name={opt.icon || 'sort'}
                size={20}
                color={isActive ? theme.colors.primary : theme.colors.textMuted}
                style={s.icon}
              />
              <Text style={[s.label, isActive && s.labelActive]}>{opt.label}</Text>
              {isActive && (
                <Icon
                  name={isAsc ? 'arrow-up' : 'arrow-down'}
                  size={18}
                  color={theme.colors.primary}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = (theme) => StyleSheet.create({
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: theme.colors.textPrimary,
    padding: spacing.base,
    paddingTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  icon:        { marginRight: spacing.md },
  label:       { flex: 1, fontSize: fontSize.base, color: theme.colors.textPrimary },
  labelActive: { color: theme.colors.primary, fontWeight: fontWeight.semibold },
});

export default SortSheet;
