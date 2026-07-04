import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../design-system/ThemeProvider';

/** Page background wrapper — pair with AppHeader or a custom hero. */
export default function ScreenScaffold({ children, style }) {
  const theme = useTheme();
  return <View style={[styles.root, { backgroundColor: theme.colors.page }, style]}>{children}</View>;
}

const styles = StyleSheet.create({ root: { flex: 1 } });
