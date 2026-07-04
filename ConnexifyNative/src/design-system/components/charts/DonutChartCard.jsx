import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import Card from '../Card';
import AppText from '../AppText';
import ChartLegend from './ChartLegend';
import EmptyState from '../EmptyState';
import { CircleDot } from '../../icons';
import { useTheme } from '../../ThemeProvider';
import { formatNumber } from '../../../utils/format';

/**
 * Themed donut for share-of-whole. items: [{label, value, color}].
 * 2px surface gap between slices; center shows total or the focused slice.
 */
export default function DonutChartCard({ title, items, formatValue = (v) => formatNumber(v), style }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(null);

  const clean = (items || []).filter((i) => Number(i.value) > 0);
  const total = clean.reduce((sum, i) => sum + Number(i.value), 0);

  const data = clean.map((item, idx) => ({
    value: Number(item.value),
    color: item.color,
    focused: focused === idx,
    onPress: () => setFocused(focused === idx ? null : idx),
  }));

  const center = focused != null && clean[focused] ? clean[focused] : null;

  return (
    <Card style={[styles.card, style]}>
      <AppText variant="subheading">{title}</AppText>
      {total === 0 ? (
        <EmptyState compact icon={CircleDot} title="No data yet" message="This range has nothing to show." />
      ) : (
        <>
          <View style={styles.chartWrap}>
            <PieChart
              data={data}
              donut
              radius={84}
              innerRadius={56}
              innerCircleColor={theme.colors.card}
              strokeColor={theme.colors.card}
              strokeWidth={2}
              focusOnPress
              centerLabelComponent={() => (
                <View style={styles.center}>
                  <AppText variant="heading">{formatValue(center ? center.value : total)}</AppText>
                  <AppText variant="micro" color="inkFaint" numberOfLines={1}>
                    {center ? center.label : 'Total'}
                  </AppText>
                </View>
              )}
            />
          </View>
          <ChartLegend
            items={clean.map((i) => ({
              label: i.label,
              color: i.color,
              value: `${Math.round((i.value / total) * 100)}%`,
            }))}
            style={styles.legend}
          />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  chartWrap: { alignItems: 'center', marginTop: 14 },
  center: { alignItems: 'center' },
  legend: { marginTop: 14 },
});
