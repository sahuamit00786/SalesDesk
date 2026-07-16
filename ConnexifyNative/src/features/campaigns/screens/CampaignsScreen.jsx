import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import Badge from '../../../design-system/components/Badge';
import ProgressBar from '../../../design-system/components/ProgressBar';
import EmptyState from '../../../design-system/components/EmptyState';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import { Megaphone } from '../../../design-system/icons';
import { keys } from '../../../api/queryKeys';
import { useWorkspaceId } from '../../../hooks/useListQuery';
import { campaignsApi } from '../api';
import { formatDate } from '../../../utils/format';

/**
 * Campaigns — read only (create/edit stays web-only). Server list is already
 * member-scoped: non-elevated users see campaigns they created or are a team
 * member of. Lead-count field is `totalLeads` (computed server-side from
 * stageCounts) — there is no `leadCount`/`currentLeads` field.
 */

export function CampaignsListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const ws = useWorkspaceId();
  const query = useQuery({
    queryKey: keys.campaigns.list(ws, {}),
    queryFn: () => campaignsApi.list(),
    enabled: Boolean(ws),
    select: (r) => (Array.isArray(r.data) ? r.data : []),
  });
  const rows = query.data || [];

  return (
    <ScreenScaffold>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <AppText variant="heading">Campaigns</AppText>
      </View>
      {query.isPending ? (
        <SkeletonList count={5} />
      ) : !rows.length ? (
        <EmptyState icon={Megaphone} title="No campaigns" message="Campaigns you're part of will appear here." />
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(c) => c.id}
          estimatedItemSize={92}
          renderItem={({ item }) => {
            const target = Number(item.leadTarget || 0);
            const current = Number(item.totalLeads || 0);
            const pct = target > 0 ? Math.min(1, current / target) : 0;
            return (
              <Pressable
                onPress={() => navigation.navigate('CampaignDetail', { campaignId: item.id })}
                accessibilityRole="button"
                accessibilityLabel={`Open campaign ${item.name}`}
              >
                <Card style={styles.card}>
                  <View style={styles.rowTop}>
                    <AppText variant="body" weight="600" numberOfLines={1} style={styles.flex}>{item.name}</AppText>
                    <Badge label={item.status || 'active'} tone={item.status === 'active' ? 'success' : 'neutral'} />
                  </View>
                  {target > 0 ? (
                    <>
                      <ProgressBar value={pct} />
                      <AppText variant="caption" color="muted">{current} / {target} leads</AppText>
                    </>
                  ) : (
                    <AppText variant="caption" color="muted">{current} leads</AppText>
                  )}
                  {item.endDate ? <AppText variant="caption" color="muted">Ends {formatDate(item.endDate)}</AppText> : null}
                </Card>
              </Pressable>
            );
          }}
          contentContainerStyle={styles.list}
        />
      )}
    </ScreenScaffold>
  );
}

export function CampaignDetailScreen({ route }) {
  const { campaignId } = route.params || {};
  const ws = useWorkspaceId();

  const detail = useQuery({
    queryKey: keys.campaigns.detail(ws, campaignId),
    queryFn: () => campaignsApi.detail(campaignId),
    enabled: Boolean(ws && campaignId),
    select: (r) => r.data,
  });
  const leads = useQuery({
    queryKey: keys.campaigns.leads(ws, campaignId, {}),
    queryFn: () => campaignsApi.leads(campaignId),
    enabled: Boolean(ws && campaignId),
    select: (r) => (Array.isArray(r.data) ? r.data : []),
  });

  const c = detail.data;

  return (
    <ScreenScaffold>
      <AppHeader title={c?.name || 'Campaign'} />
      {detail.isPending ? (
        <SkeletonList count={4} />
      ) : !c ? (
        <EmptyState icon={Megaphone} title="Not found" message="This campaign is unavailable." />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Card style={styles.card}>
            <Badge label={c.status || 'active'} tone={c.status === 'active' ? 'success' : 'neutral'} />
            {c.leadTarget ? <AppText variant="caption" color="muted">Target: {c.leadTarget} leads · {c.totalLeads || 0} so far</AppText> : null}
          </Card>
          <Card style={styles.card}>
            <AppText variant="label" color="muted">Leads ({(leads.data || []).length})</AppText>
            {leads.isPending ? (
              <AppText variant="caption" color="muted">Loading…</AppText>
            ) : (leads.data || []).slice(0, 50).map((l) => (
              <View key={l.id} style={styles.leadRow}>
                <AppText variant="body" numberOfLines={1}>{l.title || l.contactName || l.name}</AppText>
                {l.stage ? <AppText variant="caption" color="muted">{l.stage}</AppText> : null}
              </View>
            ))}
          </Card>
        </ScrollView>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  list: { padding: 12 },
  body: { padding: 12, gap: 12 },
  card: { padding: 14, gap: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  flex: { flex: 1 },
});
