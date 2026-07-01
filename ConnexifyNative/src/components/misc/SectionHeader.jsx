import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { fontSize, fontWeight, spacing } from '../../theme';

const SectionHeader = ({ title, actionTitle, onAction, style }) => {
  const { theme } = useTheme();
  const s = styles(theme);

  return (
    <View style={[s.row, style]}>
      <Text style={s.title}>{title}</Text>
      {actionTitle && (
        <TouchableOpacity onPress={onAction} accessibilityRole="button" accessibilityLabel={actionTitle}>
          <Text style={s.action}>{actionTitle}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = (theme) => StyleSheet.create({
  row:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title:  { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: theme.colors.textPrimary },
  action: { fontSize: fontSize.sm, color: theme.colors.primary, fontWeight: fontWeight.medium },
});

export default SectionHeader;
