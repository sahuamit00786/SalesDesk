import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';

const Divider = ({ style }) => {
  const { theme } = useTheme();
  return <View style={[{ height: 1, backgroundColor: theme.colors.borderLight }, styles.base, style]} />;
};

const styles = StyleSheet.create({
  base: { marginVertical: spacing.sm },
});

export default Divider;
