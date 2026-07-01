import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { fontSize, fontWeight, spacing } from '../../theme';
import SecondaryButton from '../buttons/SecondaryButton';

const ErrorState = ({ message = 'Something went wrong', onRetry, style }) => {
  const { theme } = useTheme();
  const s = styles(theme);

  return (
    <View style={[s.container, style]}>
      <Icon name="alert-circle-outline" size={56} color={theme.colors.danger} />
      <Text style={s.message}>{message}</Text>
      {onRetry && <SecondaryButton title="Try again" onPress={onRetry} style={s.btn} fullWidth={false} />}
    </View>
  );
};

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['3xl'] },
  message:   { fontSize: fontSize.base, color: theme.colors.textSecondary, textAlign: 'center', marginVertical: spacing.base },
  btn:       { marginTop: spacing.sm },
});

export default ErrorState;
