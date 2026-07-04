import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import Card from '../Card';
import AppText from '../AppText';
import ChartLegend from './ChartLegend';
import EmptyState from '../EmptyState';
import { Activity } from '../../icons';
import { useTheme } from '../../ThemeProvider';

/**
 * Two-series max line chart (change over time). series: [{label, color, points:[{label,value}]}].
 * 2px lines, crosshair tooltip on touch (pointerConfig), recessive grid.
 */
export default function LineChartCard({ title, series, style }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const s1 = series?.[0];
  const s2 = series?.[1];
  const hasData =
    (s1?.points || []).some((p) => Number(p.value) > 0) || (s2?.points || []).some((p) => Number(p.value) > 0);

  const chartWidth = width - 32 - theme.spacing.lg * 2 - 36;
  const data = (s1?.points || []).map((p) => ({ value: Number(p.value) || 0, label: p.label }));
  const data2 = s2 ? (s2.points || []).map((p) => ({ value: Number(p.value) || 0 })) : undefined;

  return (
    <Card style={[styles.card, style]}>
      <AppText variant="subheading">{title}</AppText>
      {!hasData ? (
        <EmptyState compact icon={Activity} title="No data yet" message="This range has nothing to show." />
      ) : (
        <>
          <View style={styles.chartWrap}>
            <LineChart
              data={data}
              data2={data2}
              width={chartWidth}
              height={160}
              color1={s1?.color}
              color2={s2?.color}
              thickness={2}
              curved
              hideDataPoints
              noOfSections={4}
              rulesColor={theme.colors.divider}
              rulesType="solid"
              yAxisThickness={0}
              xAxisThickness={0}
              yAxisTextStyle={{ color: theme.colors.inkFaint, fontSize: 10, fontFamily: theme.fonts.regular }}
              xAxisLabelTextStyle={{ color: theme.colors.inkFaint, fontSize: 9, fontFamily: theme.fonts.regular }}
              initialSpacing={8}
              spacing={Math.max(24, Math.floor(chartWidth / Math.max(1, data.length)))}
              pointerConfig={{
                pointerStripColor: theme.colors.inkFaint,
                pointerStripWidth: 1,
                strokeDashArray: [3, 4],
                pointerColor: theme.colors.ink,
                radius: 4,
                pointerLabelWidth: 120,
                autoAdjustPointerLabelPosition: true,
                pointerLabelComponent: (pts) => (
                  <View
                    style={[
                      styles.tooltip,
                      {
                        backgroundColor: theme.colors.cardElevated,
                        borderColor: theme.colors.border,
                        borderRadius: theme.radius.sm,
                        ...theme.elevation.raised,
                      },
                    ]}
                  >
                    <AppText variant="micro" color="inkFaint">
                      {pts?.[0]?.label || ''}
                    </AppText>
                    <AppText variant="captionStrong">
                      {s1?.label}: {pts?.[0]?.value ?? '—'}
                    </AppText>
                    {s2 ? (
                      <AppText variant="captionStrong">
                        {s2.label}: {pts?.[1]?.value ?? '—'}
                      </AppText>
                    ) : null}
                  </View>
                ),
              }}
            />
          </View>
          {series?.length > 1 ? (
            <ChartLegend items={series.map((s) => ({ label: s.label, color: s.color }))} style={styles.legend} />
          ) : null}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  chartWrap: { marginTop: 14 },
  tooltip: { paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1 },
  legend: { marginTop: 10 },
});
