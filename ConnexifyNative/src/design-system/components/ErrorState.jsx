import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AppText from './AppText';
import Button from './Button';
import { AlertCircle, WifiOff, RefreshCw, CircleSlash } from '../icons';
import { useTheme } from '../ThemeProvider';

/** Error panel with retry. Pass the ApiError for smart copy (network/403/other). */
export default function ErrorState({ error, title, message, onRetry, style, compact = false }) {
  const theme = useTheme();
  const isNetwork = error?.status === 0 || error?.code === 'NETWORK';
  const isForbidden = error?.status === 403 || error?.code === 'FORBIDDEN';

  const Icon = isNetwork ? WifiOff : isForbidden ? CircleSlash : AlertCircle;
  const heading = title || (isNetwork ? 'No connection' : isForbidden ? 'No access' : 'Something went wrong');
  const body =
    message ||
    (isNetwork
      ? 'Check your internet connection and try again.'
      : isForbidden
        ? "You don't have permission to view this."
        : error?.message || 'An unexpected error occurred.');

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={[styles.wrap, compact && styles.compact, style]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.dangerSoft, borderRadius: theme.radius.full }]}>
        <Icon size={26} color={theme.colors.danger} strokeWidth={2} />
      </View>
      <AppText variant={compact ? 'subheading' : 'heading'} style={styles.title}>
        {heading}
      </AppText>
      <AppText variant="body" color="inkMuted" style={styles.message}>
        {body}
      </AppText>
      {onRetry && !isForbidden ? (
        <Button title="Try again" variant="secondary" icon={RefreshCw} onPress={onRetry} style={styles.action} />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 32 },
  compact: { paddingVertical: 24 },
  iconWrap: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { textAlign: 'center' },
  message: { textAlign: 'center', marginTop: 6 },
  action: { marginTop: 18 },
});
