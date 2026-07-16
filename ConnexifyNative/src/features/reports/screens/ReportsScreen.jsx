import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import StatCard from '../../../design-system/components/StatCard';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import ErrorState from '../../../design-system/components/ErrorState';
import EmptyState from '../../../design-system/components/EmptyState';
import BarChartCard from '../../../design-system/components/charts/BarChartCard';
import LineChartCard from '../../../design-system/components/charts/LineChartCard';
import DonutChartCard from '../../../design-system/components/charts/DonutChartCard';
import { BarChart3, Users, TrendingUp, CheckSquare, Briefcase } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useWorkspaceId } from '../../../hooks/useListQuery';
import { reportsApi } from '../api';

/**
 * Reports — read-only mobile surface over the analytics endpoints. Gated by
 * requireAnalyticsView server-side; non-analytics users get a clean 403
 * rendered as ErrorState.
 *
 * Every analytics endpoint responds with the SAME envelope:
 *   { data: { kpis: {flat numbers}, charts: {named arrays}, tables: {named arrays} } }
 * (confirmed across leads/pipeline/team reports) — not a generic
 * series/rows/byStage shape. Stat cards come from `kpis`; the chart comes
 * from the first non-empty array under `charts`.
 */

const REPORTS = [
  { key: 'leads', label: 'Leads', icon: Users, fetch: reportsApi.leads, chart: 'bar' },
  { key: 'pipeline', label: 'Pipeline', icon: TrendingUp, fetch: reportsApi.pipeline, chart: 'donut' },
  { key: 'team', label: 'Team performance', icon: Users, fetch: reportsApi.team, chart: 'bar' },
  { key: 'deals', label: 'Deals', icon: Briefcase, fetch: reportsApi.deals, chart: 'bar' },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare, fetch: reportsApi.tasks, chart: 'donut' },
  { key: 'activities', label: 'Activities', icon: BarChart3, fetch: reportsApi.activities, chart: 'line' },
];

export function ReportsHubScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <ScreenScaffold>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <AppText variant="heading">Reports</AppText>
      </View>
      <ScrollView contentContainerStyle={styles.hub}>
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <Pressable
              key={r.key}
              onPress={() => navigation.navigate('ReportDetail', { reportKey: r.key, label: r.label })}
              accessibilityRole="button"
              accessibilityLabel={`Open ${r.label} report`}
            >
              <Card style={styles.hubCard}>
                <Icon size={20} />
                <AppText variant="body" weight="600">{r.label}</AppText>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    </ScreenScaffold>
  );
}

// Flat numeric fields from `data.kpis` → stat cards.
function extractStats(data) {
  const src = data?.kpis;
  if (!src || typeof src !== 'object') return [];
  return Object.entries(src)
    .filter(([, v]) => typeof v === 'number')
    .slice(0, 6)
    .map(([k, v]) => ({
      label: k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase()),
      value: v,
    }));
}

// First non-empty array under `data.charts` → {label, value}[] for the chart.
function extractSeries(data) {
  const charts = data?.charts;
  if (!charts || typeof charts !== 'object') return [];
  for (const candidate of Object.values(charts)) {
    if (Array.isArray(candidate) && candidate.length) {
      const rows = candidate
        .map((row) => ({
          label: String(row.name ?? row.label ?? row.stage ?? row.date ?? row.week ?? row.status ?? row.source ?? ''),
          value: Number(row.value ?? row.count ?? row.total ?? 0),
        }))
        .filter((r) => r.label);
      if (rows.length) return rows;
    }
  }
  return [];
}

export function ReportDetailScreen({ route }) {
  const { reportKey, label } = route.params || {};
  const theme = useTheme();
  const ws = useWorkspaceId();
  const def = REPORTS.find((r) => r.key === reportKey);

  const query = useQuery({
    queryKey: [ws, 'report', reportKey],
    queryFn: () => def.fetch(),
    enabled: Boolean(ws && def),
    select: (r) => r.data,
  });

  const data = query.data;
  const stats = extractStats(data);
  const series = extractSeries(data);

  return (
    <ScreenScaffold>
      <AppHeader title={label || 'Report'} />
      {query.isPending ? (
        <SkeletonList count={5} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : (!stats.length && !series.length) ? (
        <EmptyState icon={BarChart3} title="No data" message="There's nothing to report for this period yet." />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {stats.length ? (
            <View style={styles.statGrid}>
              {stats.map((s) => <StatCard key={s.label} label={s.label} value={String(s.value)} style={styles.stat} />)}
            </View>
          ) : null}

          {series.length ? (
            def.chart === 'donut' ? (
              <DonutChartCard title={label} items={series} />
            ) : def.chart === 'line' ? (
              <LineChartCard title={label} series={[{ label, color: theme.brand, points: series }]} />
            ) : (
              <BarChartCard title={label} items={series} />
            )
          ) : null}
        </ScrollView>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  hub: { padding: 12, gap: 10 },
  hubCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginBottom: 4 },
  body: { padding: 12, gap: 12 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexBasis: '47%', flexGrow: 1 },
});
