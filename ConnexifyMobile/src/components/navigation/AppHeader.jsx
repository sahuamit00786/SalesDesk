import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { fontSize, fontWeight, spacing, shadows } from '../../theme';

const AppHeader = ({ title, onBack, rightActions = [], navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const s = styles(theme, insets);

  const handleBack = () => {
    if (onBack) { onBack(); } else { navigation?.goBack(); }
  };

  return (
    <View style={s.header}>
      {onBack !== false && (
        <TouchableOpacity style={s.backBtn} onPress={handleBack} accessibilityRole="button" accessibilityLabel="Go back">
          <Icon name="arrow-left" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      )}
      <Text style={s.title} numberOfLines={1}>{title}</Text>
      <View style={s.right}>
        {rightActions.map((action, i) => (
          <TouchableOpacity key={i} style={s.rightBtn} onPress={action.onPress} accessibilityLabel={action.label}>
            <Icon name={action.icon} size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = (theme, insets) => StyleSheet.create({
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  theme.colors.surface,
    paddingTop:       insets.top + (Platform.OS === 'android' ? 8 : 0),
    paddingBottom:    spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    ...shadows.card,
  },
  backBtn: { padding: spacing.sm, marginRight: spacing.xs },
  title:   { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.bold, color: theme.colors.textPrimary },
  right:   { flexDirection: 'row' },
  rightBtn:{ padding: spacing.sm },
});

export default AppHeader;
