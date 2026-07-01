import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { fontSize, fontWeight, spacing, borderRadius } from '../../theme';

const AppHeader = ({ title, subtitle, onBack, rightActions = [], navigation }) => {
  const { theme } = useTheme();
  const insets    = useSafeAreaInsets();
  const s         = styles(theme, insets);

  const handleBack = () => {
    if (onBack) onBack();
    else navigation?.goBack();
  };

  return (
    <View style={s.header}>
      {onBack !== false && (
        <TouchableOpacity
          style={s.backBtn}
          onPress={handleBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrow-left" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      )}

      <View style={s.titleBlock}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      <View style={s.right}>
        {rightActions.map((action, i) => (
          <TouchableOpacity
            key={i}
            style={s.actionBtn}
            onPress={action.onPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={action.label}
          >
            <Icon name={action.icon} size={22} color={action.color || theme.colors.textPrimary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = (theme, insets) => StyleSheet.create({
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   theme.colors.surface,
    paddingTop:        insets.top + (Platform.OS === 'android' ? spacing.sm : spacing.xs),
    paddingBottom:     spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 1 },
    shadowOpacity:     0.06,
    shadowRadius:      4,
    elevation:         3,
  },
  backBtn: {
    width:          40,
    height:         40,
    borderRadius:   borderRadius.md,
    alignItems:     'center',
    justifyContent: 'center',
    marginRight:    spacing.xs,
  },
  titleBlock: { flex: 1 },
  title: {
    fontSize:   fontSize.md,
    fontWeight: fontWeight.bold,
    color:      theme.colors.textPrimary,
  },
  subtitle: {
    fontSize:  fontSize.xs,
    color:     theme.colors.textSecondary,
    marginTop: 1,
  },
  right:     { flexDirection: 'row', alignItems: 'center' },
  actionBtn: {
    width:          40,
    height:         40,
    borderRadius:   borderRadius.md,
    alignItems:     'center',
    justifyContent: 'center',
  },
});

export default AppHeader;
