import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, fontSize, fontWeight, spacing } from '../../theme';

const FilterChip = ({ label, selected, onPress, onRemove, style }) => {
  const { theme } = useTheme();
  const s = styles(theme);

  return (
    <TouchableOpacity
      style={[s.chip, selected && s.selected, style]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
    >
      <Text style={[s.label, selected && s.selectedLabel]}>{label}</Text>
      {selected && onRemove && (
        <TouchableOpacity onPress={onRemove} style={s.remove} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Icon name="close" size={12} color={theme.colors.primary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = (theme) => StyleSheet.create({
  chip: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingVertical:  6,
    paddingHorizontal: spacing.sm,
    borderRadius:     borderRadius.full,
    borderWidth:      1,
    borderColor:      theme.colors.border,
    backgroundColor:  theme.colors.surface,
    marginRight:      spacing.xs,
  },
  selected:      { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.primary },
  label:         { fontSize: fontSize.sm, color: theme.colors.textSecondary, fontWeight: fontWeight.medium },
  selectedLabel: { color: theme.colors.primary },
  remove:        { marginLeft: 4 },
});

export default FilterChip;
