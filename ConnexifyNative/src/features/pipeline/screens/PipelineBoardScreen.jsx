import React, { useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import SelectSheet from '../../../design-system/components/SelectSheet';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import EmptyState from '../../../design-system/components/EmptyState';
import ErrorState from '../../../design-system/components/ErrorState';
import { useTheme } from '../../../design-system/ThemeProvider';
import { Layers } from '../../../design-system/icons';
import { useOpportunitiesList } from '../../leads/hooks';
import { opportunitiesApi } from '../../leads/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { keys } from '../../../api/queryKeys';
import { useWorkspaceId } from '../../../hooks/useListQuery';
import { ROUTES } from '../../../navigation/routes';
import { showApiError } from '../../../utils/errorMessage';
import { formatMoney } from '../../../utils/format';
import Toast from 'react-native-toast-message';

/**
 * Pipeline Kanban — horizontal stage columns for opportunities. Mobile-honest:
 * moving a card is a tap → "move to stage" sheet (NOT drag). Reuses the
 * opportunity status patch (PATCH /opportunities/:id/status, {pipelineStatusId}).
 *
 * The populated pipeline-status object on each row is `pipelineStatusInfo`
 * (from `GET /leads`'s include alias) — `pipelineStatus` itself is just the
 * raw status-id column, not an object.
 *
 * Register: <Stack.Screen name={ROUTES.PIPELINE} component={PipelineBoardScreen} />
 */

export default function PipelineBoardScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  const query = useOpportunitiesList({ limit: 100 });
  const stageSheetRef = useRef(null);
  const movingRef = useRef(null);

  const rows = query.items || [];

  // Group by pipeline status; derive columns from what's present.
  const { columns, byStage } = useMemo(() => {
    const map = new Map();
    for (const o of rows) {
      const stage = o.pipelineStatusInfo?.name || o.opportunityStage || 'Unstaged';
      if (!map.has(stage)) map.set(stage, []);
      map.get(stage).push(o);
    }
    return { columns: [...map.keys()], byStage: map };
  }, [rows]);

  const patchStage = useMutation({
    mutationFn: ({ id, pipelineStatusId }) => opportunitiesApi.patchStatus(id, pipelineStatusId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.opportunities.all(ws) });
      Toast.show({ type: 'success', text1: 'Moved' });
    },
    onError: (err) => showApiError(err, 'Could not move opportunity'),
  });

  const stageOptions = useMemo(() => {
    // Build from any opportunity carrying pipeline status metadata.
    const opts = new Map();
    for (const o of rows) {
      if (o.pipelineStatusInfo?.id) opts.set(o.pipelineStatusInfo.id, o.pipelineStatusInfo.name);
    }
    return [...opts.entries()].map(([value, label]) => ({ value, label }));
  }, [rows]);

  const openMoveSheet = (o) => {
    movingRef.current = o;
    stageSheetRef.current?.open({
      title: `Move "${o.title || o.contactName || ''}"`,
      value: o.pipelineStatus,
      options: stageOptions,
      onChange: (pipelineStatusId) => {
        const op = movingRef.current;
        if (op && pipelineStatusId && pipelineStatusId !== op.pipelineStatus) {
          patchStage.mutate({ id: op.id, pipelineStatusId });
        }
      },
    });
  };

  if (query.isPending) return <ScreenScaffold><SkeletonList count={6} /></ScreenScaffold>;
  if (query.isError) return <ScreenScaffold><ErrorState error={query.error} onRetry={query.refetch} /></ScreenScaffold>;
  if (!rows.length) return <ScreenScaffold><EmptyState icon={Layers} title="No opportunities" message="Opportunities you can see will appear on the board." /></ScreenScaffold>;

  return (
    <ScreenScaffold>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <AppText variant="heading">Pipeline</AppText>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.board}>
        {columns.map((stage) => {
          const items = byStage.get(stage) || [];
          const total = items.reduce((s, o) => s + Number(o.value || 0), 0);
          return (
            <View key={stage} style={[styles.column, { backgroundColor: theme.colors.surfaceAlt }]}>
              <View style={styles.colHead}>
                <AppText variant="body" weight="700">{stage}</AppText>
                <AppText variant="caption" color="muted">{items.length} · {formatMoney(total, theme.currency)}</AppText>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {items.map((o) => (
                  <Pressable
                    key={o.id}
                    onPress={() => navigation.navigate(ROUTES.OPPORTUNITY_DETAIL, { leadId: o.id })}
                    onLongPress={() => openMoveSheet(o)}
                    accessibilityRole="button"
                    accessibilityLabel={`${o.title || o.contactName}. Long press to move.`}
                  >
                    <Card style={styles.card}>
                      <AppText variant="body" weight="600" numberOfLines={1}>{o.title || o.contactName}</AppText>
                      {o.value ? <AppText variant="caption" color="muted">{formatMoney(o.value, o.valueCurrency || theme.currency)}</AppText> : null}
                    </Card>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>

      <SelectSheet ref={stageSheetRef} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  board: { padding: 12, gap: 12 },
  column: { width: 260, borderRadius: 14, padding: 10, maxHeight: '100%' },
  colHead: { marginBottom: 8, gap: 2 },
  card: { padding: 10, marginBottom: 8, gap: 2 },
});
