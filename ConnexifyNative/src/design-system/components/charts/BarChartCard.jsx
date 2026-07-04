import React, { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import Card from '../Card';
import AppText from '../AppText';
import EmptyState from '../EmptyState';
import { BarChart2 } from '../../icons';
import { useTheme } from '../../ThemeProvider';

/**
 * Themed vertical bar chart. items: [{label, value, color?}] — colors follow the
 * entity (status charts) or the fixed categorical order. Rounded data-ends only,
 * recessive grid, tap a bar to read its exact value.
 */
export default function BarChartCard({ title, items, formatValue = (v) => String(v), style }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [focused, setFocused] = useState(null);

  const hasData = items?.some((i) => Number(i.value) > 0);
  const chartWidth = width - 32 - theme.spacing.lg * 2 - 40;
  const barWidth = Math.max(16, Math.min(30, Math.floor(chartWidth / Math.max(1, items?.length || 1)) - 14));

  const data = (items || []).map((item, idx) => ({
    value: Number(item.value) || 0,
    label: item.label,
    frontColor: item.color,
    onPress: () => setFocused(focused === idx ? null : idx),
  }));

  return (
    <Card style={[styles.card, style]}>
      <AppText variant="subheading">{title}</AppText>
      {focused != null && items[focused] ? (
        <AppText variant="caption" color="inkMuted" style={styles.focusLine}>
          {items[focused].label}: <AppText variant="captionStrong">{formatValue(items[focused].value)}</AppText>
        </AppText>
      ) : (
        <AppText variant="caption" color="inkFaint" style={styles.focusLine}>
          Tap a bar for the exact value
        </AppText>
      )}
      {!hasData ? (
        <EmptyState compact icon={BarChart2} title="No data yet" message="This range has nothing to show." />
      ) : (
        <View style={styles.chartWrap}>
          <BarChart
            data={data}
            width={chartWidth}
            height={170}
            barWidth={barWidth}
            spacing={14}
            initialSpacing={10}
            barBorderTopLeftRadius={4}
            barBorderTopRightRadius={4}
            frontColor={theme.brand}
            noOfSections={4}
            rulesColor={theme.colors.divider}
            rulesType="solid"
            yAxisThickness={0}
            xAxisThickness={0}
            yAxisTextStyle={{ color: theme.colors.inkFaint, fontSize: 10, fontFamily: theme.fonts.regular }}
            xAxisLabelTextStyle={{ color: theme.colors.inkFaint, fontSize: 10, fontFamily: theme.fonts.regular }}
            isAnimated
            animationDuration={500}
            disableScroll
          />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  focusLine: { marginTop: 2, marginBottom: 8 },
  chartWrap: { marginTop: 6 },
});
