import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated } from 'react-native';
import { useStaggeredList } from '../../hooks/useStaggeredList';
import { FlashList } from '@shopify/flash-list';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { useLeadStore } from '../../store/leadStore';
import { useAuthStore } from '../../store/authStore';
import { userService } from '../../services/userService';
import { fontSize, fontWeight, spacing } from '../../theme';
import SearchInput from '../../components/inputs/SearchInput';
import LeadCard from '../../components/cards/LeadCard';
import SkeletonList from '../../components/feedback/SkeletonList';
import EmptyState from '../../components/feedback/EmptyState';
import ErrorState from '../../components/feedback/ErrorState';
import ListFooter from '../../components/feedback/ListFooter';
import FAB from '../../components/buttons/FAB';
import FilterBottomSheet from '../../components/filters/FilterBottomSheet';
import SortSheet from '../../components/filters/SortSheet';
import ActiveFiltersRow from '../../components/filters/ActiveFiltersRow';
import FilterBadge from '../../components/filters/FilterBadge';
import SwipeableRow from '../../components/misc/SwipeableRow';
import ConfirmSheet from '../../components/misc/ConfirmSheet';
import { formatDate } from '../../utils/formatters';

const SORT_OPTIONS = [
  { field: 'createdAt', label: 'Date Created',   icon: 'calendar-plus' },
  { field: 'name',      label: 'Name',            icon: 'sort-alphabetical-ascending' },
  { field: 'stage',     label: 'Stage',           icon: 'stairs' },
  { field: 'priority',  label: 'Priority',        icon: 'flag-outline' },
  { field: 'nextFollowUp', label: 'Follow-up Date', icon: 'calendar-clock' },
];

const BASE_FILTER_GROUPS = [
  {
    key: 'stage', title: 'Stage',
    options: ['New','Contacted','Interested','Follow-up','Converted','Lost']
      .map((v) => ({ value: v, label: v })),
  },
  {
    key: 'priority', title: 'Priority',
    options: ['High','Medium','Low'].map((v) => ({ value: v, label: v })),
  },
  {
    key: 'source', title: 'Source',
    options: ['Walk-in','Online','Referral','Cold Call','Social Media','Other']
      .map((v) => ({ value: v, label: v })),
  },
];

const DATE_RANGE_GROUPS = [
  { title: 'Created Date',   fromKey: 'createdFrom',  toKey: 'createdTo' },
  { title: 'Next Follow-up', fromKey: 'followUpFrom', toKey: 'followUpTo' },
];

const LeadsListScreen = ({ navigation }) => {
  const { theme }    = useTheme();
  const insets       = useSafeAreaInsets();
  const filterRef    = useRef(null);
  const sortRef      = useRef(null);
  const confirmRef   = useRef(null);
  const deleteId     = useRef(null);
  const { isManager } = useAuthStore();
  const [teamMembers, setTeamMembers] = useState([]);

  const {
    leads, filters, sort, isLoading, isRefreshing, isLoadingMore, error,
    fetchLeads, refresh, loadMore, setFilters, resetFilters, setSort,
    deleteLead, activeFilterCount,
  } = useLeadStore();

  useEffect(() => {
    fetchLeads(true);
    if (isManager()) {
      userService.getTeam({ limit: 100 })
        .then((d) => setTeamMembers(d?.data?.rows || d?.rows || []))
        .catch(() => {});
    }
  }, []);

  const filterGroups = isManager()
    ? [...BASE_FILTER_GROUPS, {
        key: 'assignedTo', title: 'Assigned To',
        options: teamMembers.map((m) => ({ value: m.id, label: m.name })),
      }]
    : BASE_FILTER_GROUPS;

  const handleSearch = useCallback((text) => {
    setFilters({ search: text });
    fetchLeads(true);
  }, []);

  const handleSort = (newSort) => { setSort(newSort); fetchLeads(true); };
  const handleFilterApply = () => fetchLeads(true);
  const handleFilterReset = () => { resetFilters(); fetchLeads(true); };

  const handleDelete = async () => {
    if (!deleteId.current) return;
    try {
      await deleteLead(deleteId.current);
      Toast.show({ type: 'success', text1: 'Lead deleted' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to delete lead' });
    }
  };

  // Build active filter chips for display row
  const activeFilters = [
    ...filters.stage.map((v) => ({ key: `stage:${v}`, label: v })),
    ...filters.priority.map((v) => ({ key: `priority:${v}`, label: v })),
    ...filters.source.map((v) => ({ key: `source:${v}`, label: v })),
    ...(filters.assignedTo || []).map((v) => {
      const m = teamMembers.find((t) => t.id === v);
      return { key: `assignedTo:${v}`, label: m?.name || v };
    }),
    ...(filters.createdFrom || filters.createdTo
      ? [{ key: 'createdRange', label: `Created: ${formatDate(filters.createdFrom)} – ${formatDate(filters.createdTo)}` }]
      : []),
    ...(filters.followUpFrom || filters.followUpTo
      ? [{ key: 'followUpRange', label: `Follow-up: ${formatDate(filters.followUpFrom)} – ${formatDate(filters.followUpTo)}` }]
      : []),
  ];

  const removeFilter = (key) => {
    if (key === 'createdRange') {
      setFilters({ createdFrom: null, createdTo: null });
    } else if (key === 'followUpRange') {
      setFilters({ followUpFrom: null, followUpTo: null });
    } else {
      const [type, val] = key.split(':');
      const arr = filters[type] || [];
      setFilters({ [type]: arr.filter((v) => v !== val) });
    }
    fetchLeads(true);
  };

  const filterCount = activeFilterCount();
  const s = styles(theme, insets);
  const getItemStyle = useStaggeredList(leads.length);

  const renderItem = ({ item, index }) => (
    <Animated.View style={getItemStyle(index)}>
      <SwipeableRow
        onEdit={() => navigation.navigate('EditLead', { id: item.id })}
        onDelete={() => { deleteId.current = item.id; confirmRef.current?.expand(); }}
      >
        <LeadCard lead={item} onPress={() => navigation.navigate('LeadDetail', { id: item.id })} />
      </SwipeableRow>
    </Animated.View>
  );

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={s.searchRow}>
          <SearchInput value={filters.search} onChangeText={handleSearch} placeholder="Search leads..." style={s.search} />
          <TouchableOpacity style={s.iconBtn} onPress={() => sortRef.current?.expand()} accessibilityLabel="Sort">
            <Icon name="sort" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => filterRef.current?.expand()} accessibilityLabel="Filter">
            <Icon name="tune-variant" size={22} color={filterCount ? theme.colors.primary : theme.colors.textSecondary} />
            <FilterBadge count={filterCount} />
          </TouchableOpacity>
        </View>

        {sort.field !== 'createdAt' && (
          <View style={s.sortRow}>
            <Icon name="sort" size={13} color={theme.colors.textMuted} />
            <Text style={s.sortLabel}>
              {SORT_OPTIONS.find((o) => o.field === sort.field)?.label} · {sort.order === 'ASC' ? '↑' : '↓'}
            </Text>
            <TouchableOpacity onPress={() => { setSort({ field: 'createdAt', order: 'DESC' }); fetchLeads(true); }}>
              <Icon name="close" size={14} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        <ActiveFiltersRow filters={activeFilters} onRemove={removeFilter} />
      </View>

      {isLoading && !leads.length ? (
        <View style={s.listPad}><SkeletonList count={6} /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchLeads(true)} />
      ) : (
        <FlashList
          data={leads}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          estimatedItemSize={110}
          contentContainerStyle={s.listPad}
          refreshing={isRefreshing}
          onRefresh={refresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={<ListFooter loading={isLoadingMore} />}
          ListEmptyComponent={
            <EmptyState
              icon="account-search-outline"
              title="No leads found"
              subtitle="Try adjusting your search or filters"
              ctaTitle="Add Lead"
              onCta={() => navigation.navigate('AddLead')}
            />
          }
        />
      )}

      <FAB icon="plus" onPress={() => navigation.navigate('AddLead')} />

      <FilterBottomSheet
        ref={filterRef}
        filterGroups={filterGroups}
        dateRangeGroups={DATE_RANGE_GROUPS}
        values={filters}
        onChange={setFilters}
        onApply={handleFilterApply}
        onReset={handleFilterReset}
      />

      <SortSheet ref={sortRef} options={SORT_OPTIONS} value={sort} onChange={handleSort} />

      <ConfirmSheet
        ref={confirmRef}
        title="Delete Lead?"
        subtitle="This action cannot be undone."
        confirmTitle="Delete"
        dangerous
        icon="trash-can-outline"
        onConfirm={handleDelete}
      />
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
  sortRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: spacing.xs },
  sortLabel: { fontSize: fontSize.xs, color: theme.colors.textMuted, flex: 1 },
  listPad:   { padding: spacing.base, paddingBottom: 100 },
});

export default LeadsListScreen;
