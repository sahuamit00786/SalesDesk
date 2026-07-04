import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AppText from './AppText';
import Button from './Button';
import { Inbox } from '../icons';
import { useTheme } from '../ThemeProvider';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  message,
  actionLabel,
  onAction,
  style,
  compact = false,
}) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(350)} style={[styles.wrap, compact && styles.compact, style]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.brandFaint, borderRadius: theme.radius.full }]}>
        <View style={[styles.iconInner, { backgroundColor: theme.brandSoft, borderRadius: theme.radius.full }]}>
          <Icon size={compact ? 24 : 30} color={theme.brand} strokeWidth={1.8} />
        </View>
      </View>
      <AppText variant={compact ? 'subheading' : 'heading'} style={styles.title}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" color="inkMuted" style={styles.message}>
          {message}
        </AppText>
      ) : null}
      {actionLabel ? <Button title={actionLabel} variant="secondary" onPress={onAction} style={styles.action} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  compact: { paddingVertical: 28 },
  iconWrap: { padding: 10, marginBottom: 16 },
  iconInner: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center' },
  message: { textAlign: 'center', marginTop: 6 },
  action: { marginTop: 18 },
});
