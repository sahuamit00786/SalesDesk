import React, { useMemo, useRef, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppText from '../../../design-system/components/AppText';
import IconButton from '../../../design-system/components/IconButton';
import SearchBar from '../../../design-system/components/SearchBar';
import Chip from '../../../design-system/components/Chip';
import Badge from '../../../design-system/components/Badge';
import Avatar from '../../../design-system/components/Avatar';
import { PressableCard } from '../../../design-system/components/Card';
import EmptyState from '../../../design-system/components/EmptyState';
import ErrorState from '../../../design-system/components/ErrorState';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import SortSheet from '../../../design-system/components/SortSheet';
import { Briefcase, ArrowUpDown } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useOpportunitiesList, useLeadFormMeta } from '../../leads/hooks';
import { formatMoney, formatNumber, relativeTime } from '../../../utils/format';
import { ROUTES } from '../../../navigation/routes';

const SORT_OPTIONS = [
  { value: 'updatedAt', label: 'Recently updated' },
  { value: 'createdAt', label: 'Newest first' },
  { value: 'value', label: 'Value' },
  { value: 'score', label: 'Score' },
  { value: 'contactName', label: 'Name' },
];

function OpportunityCard({ item, currency, onPress }) {
  const theme = useTheme();
  const name = item.contactName || item.title || 'Untitled';
  return (
    <PressableCard onPress={onPress} style={styles.card}>
      <View style={styles.cardMain}>
        <Avatar name={name} size={44} />
        <View style={styles.cardTexts}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {name}
          </AppText>
          <AppText variant="caption" color="inkMuted" numberOfLines={1}>
            {item.company || item.email || '—'}
          </AppText>
          <View style={styles.cardMeta}>
            <Badge label={item.oppStatus?.name || 'No stage'} tone="brand" size="sm" />
            {Number(item.value) > 0 ? (
              <AppText variant="captionStrong">
                {formatMoney(item.value, item.valueCurrency || currency, { compact: true })}
              </AppText>
            ) : null}
            <AppText variant="micro" color="inkFaint" style={styles.updated}>
              {relativeTime(item.updatedAt || item.createdAt)}
            </AppText>
          </View>
        </View>
      </View>
    </PressableCard>
  );
}

export default function OpportunitiesListScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [stageId, setStageId] = useState(null);
  const [sort, setSort] = useState({ field: 'updatedAt', order: 'desc' });
  const sortRef = useRef(null);

  const formMeta = useLeadFormMeta();
  const stages = formMeta.data?.opportunityStatuses || [];

  const params = useMemo(() => {
    const p = { sort: sort.field, order: sort.order };
    if (search.trim()) p.search = search.trim();
    return p;
  }, [search, sort]);

  const list = useOpportunitiesList(params);

  // Stage filter is client-side: /leads has no oppStatus filter param (web filters via `filters` JSON)
  const items = useMemo(
    () => (stageId ? list.items.filter((it) => (it.opportunityStatus || it.oppStatus?.id) === stageId) : list.items),
    [list.items, stageId],
  );

  const s = styles;

  return (
    <ScreenScaffold>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.titleRow}>
          <View>
            <AppText variant="title">Opportunities</AppText>
            <AppText variant="caption" color="inkMuted">
              {list.isPending ? 'Loading…' : `${formatNumber(list.total)} in pipeline`}
            </AppText>
          </View>
          <IconButton
            icon={ArrowUpDown}
            accessibilityLabel="Sort"
            onPress={() => sortRef.current?.open({ options: SORT_OPTIONS, value: sort, onApply: setSort })}
          />
        </View>
        <SearchBar value={searchInput} onChangeText={setSearchInput} onDebounced={setSearch} placeholder="Search opportunities…" style={s.search} />
        {stages.length ? (
          <View style={s.stageRow}>
            <FlashList
              horizontal
              data={[{ id: null, name: 'All' }, ...stages]}
              keyExtractor={(item) => String(item.id)}
              estimatedItemSize={90}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Chip label={item.name} selected={stageId === item.id} onPress={() => setStageId(item.id)} style={s.stageChip} />
              )}
            />
          </View>
        ) : null}
      </View>

      {list.isPending ? (
        <SkeletonList count={7} cardHeight={96} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={search || stageId ? 'No matching opportunities' : 'Pipeline is empty'}
          message={
            search || stageId
              ? 'Try a different search or stage.'
              : 'Convert a lead with "To pipeline" to start tracking revenue.'
          }
        />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => String(item.id)}
          estimatedItemSize={104}
          contentContainerStyle={s.listContent}
          onEndReachedThreshold={0.4}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
          refreshControl={
            <RefreshControl refreshing={list.isRefetching && !list.isFetchingNextPage} onRefresh={list.refetch} tintColor={theme.brand} colors={[theme.brand]} />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={index < 8 ? FadeInDown.duration(280).delay(index * 40) : undefined}>
              <OpportunityCard
                item={item}
                currency={theme.currency}
                onPress={() => navigation.navigate(ROUTES.OPPORTUNITY_DETAIL, { leadId: item.id, id: item.id })}
              />
            </Animated.View>
          )}
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <AppText variant="caption" color="inkFaint" style={s.footer}>
                Loading more…
              </AppText>
            ) : null
          }
        />
      )}

      <SortSheet ref={sortRef} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  search: { marginTop: 12 },
  stageRow: { marginTop: 10, height: 38 },
  stageChip: { marginRight: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4 },
  footer: { textAlign: 'center', paddingVertical: 14 },
  card: { padding: 14, marginBottom: 10 },
  cardMain: { flexDirection: 'row', gap: 12 },
  cardTexts: { flex: 1 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 7 },
  updated: { marginLeft: 'auto' },
});
