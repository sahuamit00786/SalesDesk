import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';

const ListFooter = ({ loading }) => {
  const { theme } = useTheme();
  if (!loading) return <View style={styles.spacer} />;
  return (
    <View style={styles.container}>
      <ActivityIndicator color={theme.colors.primary} size="small" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.lg, alignItems: 'center' },
  spacer:    { height: spacing.lg },
});

export default ListFooter;
