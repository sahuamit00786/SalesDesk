import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useStaggeredList } from '../../hooks/useStaggeredList';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { useActivityStore } from '../../store/activityStore';
import { useAuthStore } from '../../store/authStore';
import { userService } from '../../services/userService';
import { spacing } from '../../theme';
import SearchInput from '../../components/inputs/SearchInput';
import ActivityCard from '../../components/cards/ActivityCard';
import SkeletonList from '../../components/feedback/SkeletonList';
import EmptyState from '../../components/feedback/EmptyState';
import ErrorState from '../../components/feedback/ErrorState';
import ListFooter from '../../components/feedback/ListFooter';
import FilterBottomSheet from '../../components/filters/FilterBottomSheet';
import SortSheet from '../../components/filters/SortSheet';
import FilterBadge from '../../components/filters/FilterBadge';
import ActiveFiltersRow from '../../components/filters/ActiveFiltersRow';
import AddActivitySheet from '../leads/AddActivitySheet';
import FAB from '../../components/buttons/FAB';

const BASE_FILTER_GROUPS = [
  {
    key: 'type', title: 'Activity Type',
    options: ['Call','Meeting','Email','WhatsApp','Site Visit','Demo','Follow-up','Note']
      .map((v) => ({ value: v, label: v })),
  },
  {
    key: 'leadStage', title: 'Lead Stage at Activity',
    options: ['New','Contacted','Interested','Follow-up','Converted','Lost']
      .map((v) => ({ value: v, label: v })),
  },
];

const DATE_RANGE_GROUPS = [
  { title: 'Activity Date', fromKey: 'dateFrom', toKey: 'dateTo' },
];

const SORT_OPTIONS = [
  { field: 'activityDate', label: 'Activity Date', icon: 'calendar' },
  { field: 'createdAt',    label: 'Date Logged',   icon: 'clock-outline' },
  { field: 'type',         label: 'Type',          icon: 'shape-outline' },
];

const ActivityListScreen = ({ navigation }) => {
  const { theme }    = useTheme();
  const insets       = useSafeAreaInsets();
  const filterRef    = useRef(null);
  const sortRef      = useRef(null);
  const addRef       = useRef(null);
  const { isManager } = useAuthStore();
  const [teamMembers, setTeamMembers] = useState([]);

  const {
    activities, filters, isLoading, isRefreshing, isLoadingMore, error,
    fetchActivities, refresh, loadMore, setFilters, resetFilters, activeFilterCount,
  } = useActivityStore();

  const [sort, setSort] = React.useState({ field: 'activityDate', order: 'DESC' });

  useEffect(() => {
    fetchActivities(true);
    if (isManager()) {
      userService.getTeam({ limit: 100 })
        .then((d) => setTeamMembers(d?.data?.rows || d?.rows || []))
        .catch(() => {});
    }
  }, []);

  const handleSearch = useCallback((text) => {
    setFilters({ search: text });
    fetchActivities(true);
  }, []);

  const filterGroups = isManager()
    ? [...BASE_FILTER_GROUPS, {
        key: 'assignedTo', title: 'Assigned To',
        options: teamMembers.map((m) => ({ value: m.id, label: m.name })),
      }]
    : BASE_FILTER_GROUPS;

  const activeFilters = [
    ...filters.type.map((v) => ({ key: `type:${v}`, label: v })),
    ...(filters.leadStage || []).map((v) => ({ key: `leadStage:${v}`, label: `Stage: ${v}` })),
    ...(filters.assignedTo || []).map((v) => {
      const m = teamMembers.find((t) => t.id === v);
      return { key: `assignedTo:${v}`, label: m?.name || v };
    }),
    ...(filters.dateFrom || filters.dateTo
      ? [{ key: 'dateRange', label: `Date range set` }]
      : []),
  ];

  const removeFilter = (key) => {
    if (key === 'dateRange') {
      setFilters({ dateFrom: null, dateTo: null });
    } else {
      const [type, val] = key.split(':');
      const arr = filters[type] || [];
      setFilters({ [type]: arr.filter((v) => v !== val) });
    }
    fetchActivities(true);
  };

  const filterCount = activeFilterCount();
  const s = styles(theme, insets);
  const getItemStyle = useStaggeredList(activities.length);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={s.searchRow}>
          <SearchInput value={filters.search} onChangeText={handleSearch} placeholder="Search activities..." style={s.search} />
          <TouchableOpacity style={s.iconBtn} onPress={() => sortRef.current?.expand()} accessibilityLabel="Sort">
            <Icon name="sort" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => filterRef.current?.expand()} accessibilityLabel="Filter">
            <Icon name="tune-variant" size={22} color={filterCount ? theme.colors.primary : theme.colors.textSecondary} />
            <FilterBadge count={filterCount} />
          </TouchableOpacity>
        </View>
        <ActiveFiltersRow filters={activeFilters} onRemove={removeFilter} />
      </View>

      {isLoading && !activities.length ? (
        <View style={s.listPad}><SkeletonList count={6} /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchActivities(true)} />
      ) : (
        <FlashList
          data={activities}
          renderItem={({ item, index }) => (
            <Animated.View style={getItemStyle(index)}>
              <ActivityCard activity={item} />
            </Animated.View>
          )}
          keyExtractor={(item) => item.id}
          estimatedItemSize={100}
          contentContainerStyle={s.listPad}
          refreshing={isRefreshing}
          onRefresh={refresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={<ListFooter loading={isLoadingMore} />}
          ListEmptyComponent={
            <EmptyState
              icon="lightning-bolt-outline"
              title="No activities yet"
              subtitle="Log calls, meetings, and more from any lead."
              ctaTitle="Log Activity"
              onCta={() => addRef.current?.expand()}
            />
          }
        />
      )}

      <FAB icon="plus" onPress={() => addRef.current?.expand()} />

      <FilterBottomSheet
        ref={filterRef}
        filterGroups={filterGroups}
        dateRangeGroups={DATE_RANGE_GROUPS}
        values={filters}
        onChange={setFilters}
        onApply={() => fetchActivities(true)}
        onReset={() => { resetFilters(); fetchActivities(true); }}
      />

      <SortSheet ref={sortRef} options={SORT_OPTIONS} value={sort} onChange={(s) => { setSort(s); fetchActivities(true); }} />

      <AddActivitySheet ref={addRef} onSaved={() => fetchActivities(true)} />
    </View>
  );
};

const styles = (theme, insets) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: theme.colors.background },
  header: {
    backgroundColor:   theme.colors.surface,
    paddingTop:        insets.top + spacing.sm,
    paddingHorizontal: spacing.base,
    paddingBottom:     spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  search:    { flex: 1 },
  iconBtn:   { padding: spacing.sm, position: 'relative' },
  listPad:   { padding: spacing.base, paddingBottom: 100 },
});

export default ActivityListScreen;
