import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from './AppText';
import { Skeleton } from './Skeleton';
import Card, { PressableCard } from './Card';
import { useTheme } from '../ThemeProvider';

/** KPI tile: icon chip, value, label, optional delta. */
export default function StatCard({ label, value, icon: Icon, tint, loading, onPress, delta, style }) {
  const theme = useTheme();
  const color = tint || theme.brand;
  const Wrapper = onPress ? PressableCard : Card;

  const deltaPositive = typeof delta === 'number' ? delta >= 0 : null;

  return (
    <Wrapper onPress={onPress} style={[styles.card, style]}>
      <View style={styles.top}>
        {Icon ? (
          <View style={[styles.iconChip, { backgroundColor: `${color}1A`, borderRadius: theme.radius.sm + 2 }]}>
            <Icon size={17} color={color} strokeWidth={2.2} />
          </View>
        ) : null}
        {delta != null ? (
          <AppText variant="captionStrong" color={deltaPositive ? 'success' : 'danger'}>
            {deltaPositive ? '▲' : '▼'} {Math.abs(delta)}%
          </AppText>
        ) : null}
      </View>
      {loading ? (
        <Skeleton width={64} height={22} style={styles.valueSkeleton} />
      ) : (
        <AppText variant="title" numberOfLines={1} style={styles.value}>
          {value ?? '—'}
        </AppText>
      )}
      <AppText variant="caption" color="inkMuted" numberOfLines={1}>
        {label}
      </AppText>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 100 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  iconChip: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  value: { marginBottom: 2 },
  valueSkeleton: { marginBottom: 6, marginTop: 4 },
});
