import React, { useMemo, useRef, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppText from '../../../design-system/components/AppText';
import IconButton from '../../../design-system/components/IconButton';
import Button from '../../../design-system/components/Button';
import SearchBar from '../../../design-system/components/SearchBar';
import Chip from '../../../design-system/components/Chip';
import FAB from '../../../design-system/components/FAB';
import EmptyState from '../../../design-system/components/EmptyState';
import ErrorState from '../../../design-system/components/ErrorState';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import FilterSheet from '../../../design-system/components/FilterSheet';
import SortSheet from '../../../design-system/components/SortSheet';
import SelectSheet from '../../../design-system/components/SelectSheet';
import ConfirmSheet from '../../../design-system/components/ConfirmSheet';
import LeadCard from '../components/LeadCard';
import SavedViewsSheet from '../components/SavedViewsSheet';
import { Users, ListFilter, ArrowUpDown, X, UserCheck, Tag, Trash2, Bookmark, Archive, RefreshCw } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useLeadsList, useLeadFormMeta, useLeadMutations, useArchivedLeads, useRestoreLead } from '../hooks';
import { useIsManagerOrAdmin } from '../../../hooks/permissions';
import { STATUS_LABELS, STATUS_OPTIONS, SOURCE_LABELS, SOURCE_OPTIONS, LEAD_SORT_OPTIONS } from '../constants';
import { formatNumber } from '../../../utils/format';
import { ROUTES } from '../../../navigation/routes';

export default function LeadsListScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const canManage = useIsManagerOrAdmin();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({ field: 'createdAt', order: 'desc' });
  const [selected, setSelected] = useState([]); // bulk selection ids
  const [showArchived, setShowArchived] = useState(false);

  const filterRef = useRef(null);
  const sortRef = useRef(null);
  const selectRef = useRef(null);
  const confirmRef = useRef(null);
  const savedRef = useRef(null);

  const params = useMemo(() => {
    const p = { sort: sort.field, order: sort.order };
    if (search.trim()) p.search = search.trim();
    if (filters.status?.length) p.status = filters.status.join(',');
    if (filters.source?.length) p.source = filters.source.join(',');
    if (filters.assignedTo?.length) p.assignedTo = filters.assignedTo.join(',');
    return p;
  }, [search, filters, sort]);

  const list = useLeadsList(params);
  const formMeta = useLeadFormMeta();
  const { bulk } = useLeadMutations();
  const archived = useArchivedLeads(showArchived ? { page: 1, limit: 20 } : undefined);
  const restore = useRestoreLead();

  const activeFilterCount =
    (filters.status?.length ? 1 : 0) + (filters.source?.length ? 1 : 0) + (filters.assignedTo?.length ? 1 : 0);
  const selectionMode = selected.length > 0;

  const toggleSelect = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const runBulk = (action, payload, successMsg) => {
    bulk.mutate(
      { ids: selected, action, payload },
      {
        onSuccess: () => {
          Toast.show({ type: 'success', text1: successMsg });
          setSelected([]);
        },
      },
    );
  };

  const openBulkAssign = () =>
    selectRef.current?.open({
      title: 'Assign to',
      searchable: true,
      options: (formMeta.data?.users || []).map((u) => ({ value: u.id, label: u.name, description: u.email })),
      onChange: (userId) => runBulk('assign', { assignedTo: userId }, `Assigned ${selected.length} leads`),
    });

  const openBulkStatus = () =>
    selectRef.current?.open({
      title: 'Set status',
      options: STATUS_OPTIONS.map((sVal) => ({ value: sVal, label: STATUS_LABELS[sVal] })),
      onChange: (status) => runBulk('update', { status }, `Updated ${selected.length} leads`),
    });

  const openBulkDelete = () =>
    confirmRef.current?.open({
      title: `Delete ${selected.length} lead${selected.length > 1 ? 's' : ''}?`,
      message: 'They will be removed from your workspace.',
      destructive: true,
      onConfirm: () => runBulk('delete', {}, 'Leads deleted'),
    });

  const openFilters = () =>
    filterRef.current?.open({
      value: filters,
      sections: [
        { key: 'status', title: 'Status', multi: true, options: STATUS_OPTIONS.map((v) => ({ value: v, label: STATUS_LABELS[v] })) },
        { key: 'source', title: 'Source', multi: true, options: SOURCE_OPTIONS.map((v) => ({ value: v, label: SOURCE_LABELS[v] })) },
        {
          key: 'assignedTo',
          title: 'Assignee',
          multi: true,
          options: (formMeta.data?.users || []).map((u) => ({ value: u.id, label: u.name })),
        },
      ],
      onApply: setFilters,
    });

  const openSort = () =>
    sortRef.current?.open({ options: LEAD_SORT_OPTIONS, value: sort, onApply: setSort });

  const s = styles(theme);

  return (
    <ScreenScaffold>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.titleRow}>
          <View>
            <AppText variant="title">Leads</AppText>
            <AppText variant="caption" color="inkMuted">
              {list.isPending ? 'Loading…' : `${formatNumber(list.total)} total`}
            </AppText>
          </View>
          <View style={s.headerActions}>
            <IconButton icon={Bookmark} accessibilityLabel="Saved views" onPress={() => savedRef.current?.open()} />
            <IconButton icon={ArrowUpDown} accessibilityLabel="Sort" onPress={openSort} />
            <IconButton
              icon={ListFilter}
              accessibilityLabel="Filters"
              onPress={openFilters}
              badge={activeFilterCount}
              variant={activeFilterCount ? 'brand' : 'soft'}
            />
          </View>
        </View>
        <SearchBar
          value={searchInput}
          onChangeText={setSearchInput}
          onDebounced={setSearch}
          placeholder="Search name, company, email…"
          style={s.search}
        />
        {canManage ? (
          <View style={s.chipRow}>
            <Chip
              label="Show archived"
              icon={Archive}
              selected={showArchived}
              onPress={() => setShowArchived((v) => !v)}
            />
          </View>
        ) : null}
        {activeFilterCount > 0 ? (
          <View style={s.chipRow}>
            {(filters.status || []).map((v) => (
              <Chip
                key={`st-${v}`}
                label={STATUS_LABELS[v]}
                selected
                onPress={() => setFilters((f) => ({ ...f, status: f.status.filter((x) => x !== v) }))}
                onRemove={() => setFilters((f) => ({ ...f, status: f.status.filter((x) => x !== v) }))}
              />
            ))}
            {(filters.source || []).map((v) => (
              <Chip
                key={`so-${v}`}
                label={SOURCE_LABELS[v]}
                selected
                onPress={() => setFilters((f) => ({ ...f, source: f.source.filter((x) => x !== v) }))}
                onRemove={() => setFilters((f) => ({ ...f, source: f.source.filter((x) => x !== v) }))}
              />
            ))}
            {(filters.assignedTo || []).map((v) => (
              <Chip
                key={`as-${v}`}
                label={formMeta.data?.users?.find((u) => u.id === v)?.name || 'Assignee'}
                selected
                onPress={() => setFilters((f) => ({ ...f, assignedTo: f.assignedTo.filter((x) => x !== v) }))}
                onRemove={() => setFilters((f) => ({ ...f, assignedTo: f.assignedTo.filter((x) => x !== v) }))}
              />
            ))}
            <Chip label="Clear" icon={X} onPress={() => setFilters({})} />
          </View>
        ) : null}
      </View>

      {showArchived ? (
        archived.isPending ? (
          <SkeletonList count={7} cardHeight={96} />
        ) : archived.isError ? (
          <ErrorState error={archived.error} onRetry={archived.refetch} />
        ) : !archived.data?.rows?.length ? (
          <EmptyState icon={Archive} title="No archived leads" message="Deleted leads will appear here." />
        ) : (
          <FlashList
            data={archived.data.rows}
            keyExtractor={(item) => String(item.id)}
            estimatedItemSize={104}
            contentContainerStyle={s.listContent}
            renderItem={({ item, index }) => (
              <Animated.View entering={index < 8 ? FadeInDown.duration(280).delay(index * 40) : undefined}>
                <LeadCard
                  lead={item}
                  onPress={() => navigation.navigate(ROUTES.LEAD_DETAIL, { leadId: item.id, id: item.id })}
                  extraActions={[
                    { key: 'restore', label: 'Restore', icon: RefreshCw, color: theme.brand, onPress: () => restore.mutate(item.id) },
                  ]}
                />
              </Animated.View>
            )}
          />
        )
      ) : list.isPending ? (
        <SkeletonList count={7} cardHeight={96} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : list.isEmpty ? (
        <EmptyState
          icon={Users}
          title={search || activeFilterCount ? 'No matching leads' : 'No leads yet'}
          message={
            search || activeFilterCount
              ? 'Try adjusting your search or filters.'
              : 'Add your first lead to start tracking your pipeline.'
          }
          actionLabel={search || activeFilterCount ? undefined : 'Add lead'}
          onAction={() => navigation.navigate(ROUTES.ADD_LEAD)}
        />
      ) : (
        <FlashList
          data={list.items}
          keyExtractor={(item) => String(item.id)}
          estimatedItemSize={104}
          contentContainerStyle={s.listContent}
          onEndReachedThreshold={0.4}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching && !list.isFetchingNextPage}
              onRefresh={list.refetch}
              tintColor={theme.brand}
              colors={[theme.brand]}
            />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={index < 8 ? FadeInDown.duration(280).delay(index * 40) : undefined}>
              <LeadCard
                lead={item}
                selectionMode={selectionMode}
                selected={selected.includes(item.id)}
                onPress={() =>
                  selectionMode
                    ? toggleSelect(item.id)
                    : navigation.navigate(ROUTES.LEAD_DETAIL, { leadId: item.id, id: item.id })
                }
                onLongPress={() => toggleSelect(item.id)}
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

      {selectionMode ? (
        <Animated.View
          entering={FadeInUp.duration(220)}
          style={[
            s.bulkBar,
            {
              paddingBottom: Math.max(insets.bottom, 10),
              backgroundColor: theme.colors.cardElevated,
              borderColor: theme.colors.border,
              ...theme.elevation.sheet,
            },
          ]}
        >
          <View style={s.bulkInfo}>
            <AppText variant="bodyStrong">{selected.length} selected</AppText>
            <AppText variant="caption" color="brand" onPress={() => setSelected([])}>
              Cancel
            </AppText>
          </View>
          <View style={s.bulkActions}>
            <Button title="Assign" size="sm" variant="secondary" icon={UserCheck} onPress={openBulkAssign} style={s.bulkBtn} />
            <Button title="Status" size="sm" variant="secondary" icon={Tag} onPress={openBulkStatus} style={s.bulkBtn} />
            <Button title="Delete" size="sm" variant="dangerSoft" icon={Trash2} onPress={openBulkDelete} style={s.bulkBtn} />
          </View>
        </Animated.View>
      ) : (
        <FAB label="Add lead" onPress={() => navigation.navigate(ROUTES.ADD_LEAD)} />
      )}

      <FilterSheet ref={filterRef} />
      <SortSheet ref={sortRef} />
      <SelectSheet ref={selectRef} />
      <ConfirmSheet ref={confirmRef} />
      <SavedViewsSheet
        ref={savedRef}
        currentConfig={{ filters, sort }}
        onApply={(cfg) => {
          if (cfg.filters) setFilters(cfg.filters);
          if (cfg.sort) setSort(cfg.sort);
        }}
      />
    </ScreenScaffold>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    header: { paddingHorizontal: 16, paddingBottom: 10 },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerActions: { flexDirection: 'row', gap: 8 },
    search: { marginTop: 12 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    listContent: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 4 },
    footer: { textAlign: 'center', paddingVertical: 14 },
    bulkBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderTopWidth: 1,
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    bulkInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    bulkActions: { flexDirection: 'row', gap: 8 },
    bulkBtn: { flex: 1 },
  });
