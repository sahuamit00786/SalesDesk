import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { useCampaignStore } from '../../store/campaignStore';
import { useStaggeredList } from '../../hooks/useStaggeredList';
import { fontSize, fontWeight, spacing, borderRadius } from '../../theme';
import SearchInput from '../../components/inputs/SearchInput';
import SkeletonList from '../../components/feedback/SkeletonList';
import EmptyState from '../../components/feedback/EmptyState';
import ErrorState from '../../components/feedback/ErrorState';
import ListFooter from '../../components/feedback/ListFooter';
import FilterBottomSheet from '../../components/filters/FilterBottomSheet';
import FilterBadge from '../../components/filters/FilterBadge';
import ActiveFiltersRow from '../../components/filters/ActiveFiltersRow';
import AppHeader from '../../components/navigation/AppHeader';
import { formatDate } from '../../utils/formatters';

const FILTER_GROUPS = [
  {
    key: 'status', title: 'Status',
    options: ['Draft', 'Active', 'Paused', 'Completed', 'Cancelled']
      .map((v) => ({ value: v.toLowerCase(), label: v })),
  },
];

const STATUS_COLORS = {
  active:    '#10B981',
  draft:     '#94A3B8',
  paused:    '#F59E0B',
  completed: '#4F46E5',
  cancelled: '#EF4444',
};

const CampaignCard = ({ campaign, onPress, theme }) => {
  const statusColor = STATUS_COLORS[campaign.status?.toLowerCase()] || '#94A3B8';
  return (
    <TouchableOpacity style={[s.card, { backgroundColor: theme.colors.surface }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.cardBar, { backgroundColor: statusColor }]} />
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <Text style={[s.cardName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{campaign.name}</Text>
          <View style={[s.badge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[s.badgeText, { color: statusColor }]}>{campaign.status || 'Draft'}</Text>
          </View>
        </View>
        {!!campaign.description && (
          <Text style={[s.cardDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>{campaign.description}</Text>
        )}
        <View style={s.cardMeta}>
          <View style={s.metaItem}>
            <Icon name="account-group-outline" size={13} color={theme.colors.textMuted} />
            <Text style={[s.metaText, { color: theme.colors.textMuted }]}>{campaign.leadCount ?? 0} leads</Text>
          </View>
          {!!campaign.budget && (
            <View style={s.metaItem}>
              <Icon name="currency-inr" size={13} color={theme.colors.textMuted} />
              <Text style={[s.metaText, { color: theme.colors.textMuted }]}>₹{Number(campaign.budget).toLocaleString()}</Text>
            </View>
          )}
          {!!campaign.startDate && (
            <View style={s.metaItem}>
              <Icon name="calendar-outline" size={13} color={theme.colors.textMuted} />
              <Text style={[s.metaText, { color: theme.colors.textMuted }]}>{formatDate(campaign.startDate)}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const CampaignsListScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const filterRef = useRef(null);

  const {
    campaigns, filters, isLoading, isRefreshing, isLoadingMore, error,
    fetchCampaigns, refresh, loadMore, setFilters, resetFilters, activeFilterCount,
  } = useCampaignStore();

  useEffect(() => { fetchCampaigns(true); }, []);

  const handleSearch = useCallback((text) => {
    setFilters({ search: text });
    fetchCampaigns(true);
  }, []);

  const activeFilters = [
    ...(filters.status || []).map((v) => ({ key: `status:${v}`, label: v })),
  ];

  const removeFilter = (key) => {
    const [type, val] = key.split(':');
    const arr = filters[type] || [];
    setFilters({ [type]: arr.filter((v) => v !== val) });
    fetchCampaigns(true);
  };

  const filterCount = activeFilterCount();
  const getItemStyle = useStaggeredList(campaigns.length);

  return (
    <View style={[st.root, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Campaigns" navigation={navigation} />
      <View style={[st.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.borderLight }]}>
        <View style={st.searchRow}>
          <SearchInput value={filters.search} onChangeText={handleSearch} placeholder="Search campaigns..." style={st.search} />
          <TouchableOpacity style={st.iconBtn} onPress={() => filterRef.current?.expand()}>
            <Icon name="tune-variant" size={22} color={filterCount ? theme.colors.primary : theme.colors.textSecondary} />
            <FilterBadge count={filterCount} />
          </TouchableOpacity>
        </View>
        <ActiveFiltersRow filters={activeFilters} onRemove={removeFilter} />
      </View>

      {isLoading && !campaigns.length ? (
        <View style={st.listPad}><SkeletonList count={5} /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchCampaigns(true)} />
      ) : (
        <FlashList
          data={campaigns}
          renderItem={({ item, index }) => (
            <Animated.View style={getItemStyle(index)}>
              <CampaignCard
                campaign={item}
                theme={theme}
                onPress={() => navigation.navigate('CampaignDetail', { id: item.id, name: item.name })}
              />
            </Animated.View>
          )}
          keyExtractor={(item) => item.id}
          estimatedItemSize={120}
          contentContainerStyle={st.listPad}
          refreshing={isRefreshing}
          onRefresh={refresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={<ListFooter loading={isLoadingMore} />}
          ListEmptyComponent={
            <EmptyState
              icon="bullhorn-outline"
              title="No campaigns found"
              subtitle="Campaigns will appear here once created."
            />
          }
        />
      )}

      <FilterBottomSheet
        ref={filterRef}
        filterGroups={FILTER_GROUPS}
        values={filters}
        onChange={setFilters}
        onApply={() => fetchCampaigns(true)}
        onReset={() => { resetFilters(); fetchCampaigns(true); }}
      />
    </View>
  );
};

const s = StyleSheet.create({
  card:     { flexDirection: 'row', borderRadius: borderRadius.lg, marginBottom: spacing.sm, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardBar:  { width: 4, borderTopLeftRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.lg },
  cardBody: { flex: 1, padding: spacing.base },
  cardTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, flex: 1, marginRight: 8 },
  cardDesc: { fontSize: fontSize.sm, marginBottom: 8, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: fontSize.xs },
  badge:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  badgeText:{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'capitalize' },
});

const st = StyleSheet.create({
  root:      { flex: 1 },
  header:    { paddingHorizontal: spacing.base, paddingTop: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  search:    { flex: 1 },
  iconBtn:   { padding: spacing.sm, position: 'relative' },
  listPad:   { padding: spacing.base, paddingBottom: 100 },
});

export default CampaignsListScreen;
