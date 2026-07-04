import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '../AppText';

/** Legend rows — identity via colored dot; text stays in ink tokens (never series color). */
export default function ChartLegend({ items, style }) {
  if (!items?.length) return null;
  return (
    <View style={[styles.wrap, style]}>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: item.color }]} />
          <AppText variant="caption" color="inkMuted" numberOfLines={1}>
            {item.label}
          </AppText>
          {item.value != null ? (
            <AppText variant="captionStrong" color="ink">
              {item.value}
            </AppText>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, rowGap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
