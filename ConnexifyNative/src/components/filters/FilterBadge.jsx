import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { fontSize, fontWeight } from '../../theme';

const FilterBadge = ({ count, style }) => {
  const { theme } = useTheme();
  if (!count) return null;

  return (
    <View style={[styles.badge, { backgroundColor: theme.colors.danger }, style]}>
      <Text style={styles.text}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position:       'absolute',
    top:    -6,
    right:  -6,
    minWidth:       16,
    height:         16,
    borderRadius:   8,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  text: { color: '#fff', fontSize: 9, fontWeight: fontWeight.bold },
});

export default FilterBadge;
