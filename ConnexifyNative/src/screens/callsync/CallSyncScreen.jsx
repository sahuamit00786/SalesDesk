import React, { useEffect, useRef, useCallback, useState, forwardRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Animated, Linking, Platform, ScrollView,
} from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { useCallSyncStore } from '../../store/callSyncStore';
import { syncCallToCrm } from '../../services/simCardService';
import { useStaggeredList } from '../../hooks/useStaggeredList';
import { fontSize, fontWeight, spacing, borderRadius } from '../../theme';
import AppHeader from '../../components/navigation/AppHeader';
import SearchInput from '../../components/inputs/SearchInput';
import EmptyState from '../../components/feedback/EmptyState';
import ErrorState from '../../components/feedback/ErrorState';
import FilterBottomSheet from '../../components/filters/FilterBottomSheet';
import FilterBadge from '../../components/filters/FilterBadge';
import ActiveFiltersRow from '../../components/filters/ActiveFiltersRow';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import GhostButton from '../../components/buttons/GhostButton';
import SelectInput from '../../components/inputs/SelectInput';
import AppInput from '../../components/inputs/AppInput';
import { formatDateTime } from '../../utils/formatters';

const TYPE_CONFIG = {
  incoming: { icon: 'phone-incoming', color: '#10B981', label: 'Incoming' },
  outgoing: { icon: 'phone-outgoing', color: '#4F46E5', label: 'Outgoing' },
  missed:   { icon: 'phone-missed',   color: '#EF4444', label: 'Missed'   },
  rejected: { icon: 'phone-cancel',   color: '#F97316', label: 'Rejected'  },
  other:    { icon: 'phone',          color: '#94A3B8', label: 'Other'    },
};

const FILTER_GROUPS = [
  {
    key: 'types', title: 'Call Type',
    options: [
      { value: 'incoming', label: 'Incoming' },
      { value: 'outgoing', label: 'Outgoing' },
      { value: 'missed',   label: 'Missed'   },
      { value: 'rejected', label: 'Rejected'  },
    ],
  },
  {
    key: 'minDuration', title: 'Min Duration',
    options: [
      { value: 0,   label: 'Any'     },
      { value: 30,  label: '> 30s'   },
      { value: 60,  label: '> 1 min' },
      { value: 300, label: '> 5 min' },
    ],
    singleSelect: true,
  },
];

const DATE_RANGE_GROUPS = [
  { title: 'Call Date', fromKey: 'dateFrom', toKey: 'dateTo' },
];

const OUTCOME_OPTIONS = [
  { value: 'connected',       label: 'Connected'        },
  { value: 'no_answer',       label: 'No Answer'        },
  { value: 'voicemail',       label: 'Left Voicemail'   },
  { value: 'followup_needed', label: 'Follow-up Needed' },
];

const formatDuration = (secs) => {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
};

// ── SIM Selector Pills ───────────────────────────────────────────
const SimSelector = ({ simCards, selectedSimId, onSelect, theme }) => {
  if (!simCards || simCards.length <= 1) return null;

  const pills = [{ subscriptionId: -1, displayName: 'All SIMs', carrierName: '' }, ...simCards];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ss.wrap} contentContainerStyle={ss.inner}>
      {pills.map((sim) => {
        const active = sim.subscriptionId === selectedSimId;
        return (
          <TouchableOpacity
            key={sim.subscriptionId}
            style={[ss.pill, active ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.primaryLight }]}
            onPress={() => onSelect(sim.subscriptionId)}
            activeOpacity={0.8}
          >
            <Icon name="sim" size={13} color={active ? '#fff' : theme.colors.primary} />
            <Text style={[ss.pillText, { color: active ? '#fff' : theme.colors.primary }]}>
              {sim.displayName}
              {sim.carrierName ? ` · ${sim.carrierName}` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const ss = StyleSheet.create({
  wrap:     { borderBottomWidth: 1 },
  inner:    { paddingHorizontal: spacing.base, paddingVertical: 8, gap: 8 },
  pill:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full },
  pillText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});

// ── Call Log Row ─────────────────────────────────────────────────
const CallRow = ({ item, theme, onLongPress }) => {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
  const call = () => { if (item.number) Linking.openURL(`tel:${item.number}`); };

  return (
    <TouchableOpacity
      style={[cr.row, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.borderLight }]}
      onPress={call}
      onLongPress={() => onLongPress(item)}
      activeOpacity={0.75}
    >
      <View style={[cr.iconBox, { backgroundColor: cfg.color + '18' }]}>
        <Icon name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <View style={cr.info}>
        <Text style={[cr.name, { color: theme.colors.textPrimary }]}>
          {item.name || item.number || 'Unknown'}
        </Text>
        {item.name ? <Text style={[cr.number, { color: theme.colors.textMuted }]}>{item.number}</Text> : null}
        <View style={cr.meta}>
          <Text style={[cr.type, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={[cr.dot, { color: theme.colors.textMuted }]}>·</Text>
          <Text style={[cr.date, { color: theme.colors.textMuted }]}>{formatDateTime(item.date)}</Text>
        </View>
      </View>
      <View style={cr.right}>
        <Text style={[cr.duration, { color: item.type === 'missed' ? '#EF4444' : theme.colors.textSecondary }]}>
          {formatDuration(item.duration)}
        </Text>
        <Icon name="phone-forward-outline" size={16} color={theme.colors.textMuted} style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );
};

const cr = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', padding: spacing.base, borderBottomWidth: 1, gap: 12 },
  iconBox:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  info:     { flex: 1 },
  name:     { fontSize: fontSize.base, fontWeight: fontWeight.medium },
  number:   { fontSize: fontSize.sm, marginTop: 1 },
  meta:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  type:     { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  dot:      { fontSize: fontSize.xs },
  date:     { fontSize: fontSize.xs },
  right:    { alignItems: 'flex-end' },
  duration: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});

// ── Summary Bar ──────────────────────────────────────────────────
const SummaryBar = ({ logs, theme }) => {
  const counts = { incoming: 0, outgoing: 0, missed: 0 };
  logs.forEach((l) => { if (counts[l.type] !== undefined) counts[l.type]++; });
  return (
    <View style={sb.bar}>
      {Object.entries(counts).map(([type, count]) => {
        const cfg = TYPE_CONFIG[type];
        return (
          <View key={type} style={[sb.chip, { backgroundColor: cfg.color + '18' }]}>
            <Icon name={cfg.icon} size={13} color={cfg.color} />
            <Text style={[sb.chipText, { color: cfg.color }]}>{count} {cfg.label}</Text>
          </View>
        );
      })}
    </View>
  );
};

const sb = StyleSheet.create({
  bar:      { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.base, paddingVertical: 8, flexWrap: 'wrap' },
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full },
  chipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});

// ── Sync to CRM Sheet ────────────────────────────────────────────
const syncSchema = yup.object({
  outcome: yup.string().required('Select an outcome'),
  notes:   yup.string().optional(),
});

const SyncToCrmSheet = forwardRef(({ call, simCards, onSynced }, ref) => {
  const { theme } = useTheme();
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(syncSchema),
    defaultValues: { outcome: 'connected', notes: '' },
  });

  const close = useCallback(() => { reset(); ref?.current?.close(); }, []);

  const onSubmit = async (data) => {
    try {
      const sim = simCards.find((s) => s.subscriptionId?.toString() === call?.subscriptionId);
      await syncCallToCrm({
        callType:  call?.type === 'incoming' ? 'inbound' : 'outbound',
        duration:  call?.duration || 0,
        outcome:   data.outcome,
        notes:     data.notes || null,
        simLabel:  sim?.displayName || null,
      });
      Toast.show({ type: 'success', text1: 'Synced to CRM' });
      reset();
      onSynced?.();
      ref?.current?.close();
    } catch (e) {
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Sync failed' });
    }
  };

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={['55%']}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={[sh.title, { color: theme.colors.textPrimary }]}>Sync to CRM</Text>
        {call && (
          <Text style={[sh.sub, { color: theme.colors.textSecondary }]}>
            {call.name || call.number} · {formatDuration(call.duration)} · {TYPE_CONFIG[call.type]?.label}
          </Text>
        )}

        <Controller
          control={control} name="outcome"
          render={({ field: { onChange, value } }) => (
            <SelectInput
              label="Call Outcome"
              value={value}
              options={OUTCOME_OPTIONS}
              onChange={onChange}
              icon="phone-check-outline"
              error={errors.outcome?.message}
            />
          )}
        />

        <Controller
          control={control} name="notes"
          render={({ field: { onChange, value } }) => (
            <AppInput
              label="Notes (optional)"
              value={value}
              onChangeText={onChange}
              icon="note-text-outline"
              multiline
              numberOfLines={3}
            />
          )}
        />

        <View style={sh.actions}>
          <GhostButton title="Cancel" onPress={close} style={{ flex: 1 }} />
          <PrimaryButton title="Sync" onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={{ flex: 2 }} />
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

SyncToCrmSheet.displayName = 'SyncToCrmSheet';

const sh = StyleSheet.create({
  title:   { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: 2 },
  sub:     { fontSize: fontSize.sm, marginBottom: spacing.base },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
});

// ── Main Screen ──────────────────────────────────────────────────
const CallSyncScreen = ({ navigation }) => {
  const { theme }  = useTheme();
  const filterRef  = useRef(null);
  const syncRef    = useRef(null);
  const [selectedCall, setSelectedCall] = useState(null);

  const {
    logs, filtered, filters, isLoading, hasPermission, error, lastSynced,
    simCards, selectedSimId,
    syncCallLogs, setFilters, resetFilters, activeFilterCount, selectSim,
  } = useCallSyncStore();

  useEffect(() => {
    if (hasPermission === null) syncCallLogs();
  }, []);

  const handleSearch = useCallback((text) => setFilters({ search: text }), []);

  const handleLongPress = useCallback((call) => {
    setSelectedCall(call);
    syncRef.current?.expand();
  }, []);

  const activeFilters = [
    ...(filters.types || []).map((v) => ({ key: `types:${v}`, label: TYPE_CONFIG[v]?.label || v })),
    ...(filters.dateFrom || filters.dateTo ? [{ key: 'dateRange', label: 'Date range set' }] : []),
    ...(filters.minDuration > 0 ? [{ key: 'minDuration', label: `> ${formatDuration(filters.minDuration)}` }] : []),
  ];

  const removeFilter = (key) => {
    if (key === 'dateRange')      { setFilters({ dateFrom: null, dateTo: null }); }
    else if (key === 'minDuration') { setFilters({ minDuration: 0 }); }
    else {
      const [type, val] = key.split(':');
      setFilters({ [type]: (filters[type] || []).filter((v) => v !== val) });
    }
  };

  const filterCount = activeFilterCount();
  const getItemStyle = useStaggeredList(filtered.length);
  const permissionDenied = hasPermission === false;

  return (
    <View style={[s.root, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Call History"
        navigation={navigation}
        rightActions={[{
          icon: 'information-outline',
          label: 'Long-press any row to sync to CRM',
          onPress: () => Toast.show({ type: 'info', text1: 'Long-press a call row to sync it to CRM' }),
        }]}
      />

      {permissionDenied ? (
        <View style={s.center}>
          <Icon name="phone-lock" size={64} color={theme.colors.textMuted} style={{ marginBottom: 16 }} />
          <Text style={[s.permTitle, { color: theme.colors.textPrimary }]}>Permission Required</Text>
          <Text style={[s.permSub, { color: theme.colors.textSecondary }]}>
            Allow Connexify to read call history to sync your call logs with leads.
          </Text>
          <PrimaryButton title="Grant Permission" onPress={syncCallLogs} style={s.permBtn} />
        </View>
      ) : (
        <>
          {/* SIM Selector */}
          <SimSelector
            simCards={simCards}
            selectedSimId={selectedSimId}
            onSelect={selectSim}
            theme={theme}
          />

          {/* Search + Filters */}
          <View style={[s.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.borderLight }]}>
            <View style={s.headerTop}>
              <View style={s.searchRow}>
                <SearchInput value={filters.search} onChangeText={handleSearch} placeholder="Search name or number..." style={s.search} />
                <TouchableOpacity style={s.iconBtn} onPress={() => filterRef.current?.expand()}>
                  <Icon name="tune-variant" size={22} color={filterCount ? theme.colors.primary : theme.colors.textSecondary} />
                  <FilterBadge count={filterCount} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={[s.syncBtn, { backgroundColor: theme.colors.primaryLight }]} onPress={syncCallLogs} disabled={isLoading}>
                <Icon name="sync" size={16} color={theme.colors.primary} />
                <Text style={[s.syncText, { color: theme.colors.primary }]}>Sync</Text>
              </TouchableOpacity>
            </View>
            {lastSynced && (
              <Text style={[s.lastSync, { color: theme.colors.textMuted }]}>
                Last synced: {formatDateTime(lastSynced)}
              </Text>
            )}
            <ActiveFiltersRow filters={activeFilters} onRemove={removeFilter} />
          </View>

          {logs.length > 0 && <SummaryBar logs={filtered} theme={theme} />}

          {isLoading ? (
            <View style={s.center}>
              <Icon name="sync" size={40} color={theme.colors.primary} />
              <Text style={[s.loadText, { color: theme.colors.textSecondary }]}>Reading call logs...</Text>
            </View>
          ) : error ? (
            <ErrorState message={error} onRetry={syncCallLogs} />
          ) : filtered.length === 0 && logs.length === 0 ? (
            <EmptyState
              icon="phone-off"
              title="No call logs"
              subtitle="Tap Sync to load your device call history"
              ctaTitle="Sync Now"
              onCta={syncCallLogs}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="filter-off-outline"
              title="No results"
              subtitle="Try adjusting your filters"
              ctaTitle="Reset Filters"
              onCta={resetFilters}
            />
          ) : (
            <>
              <Text style={[s.hint, { color: theme.colors.textMuted }]}>
                Long-press a call to sync it to CRM
              </Text>
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <Animated.View style={getItemStyle(index)}>
                    <CallRow item={item} theme={theme} onLongPress={handleLongPress} />
                  </Animated.View>
                )}
                contentContainerStyle={{ paddingBottom: 80 }}
                getItemLayout={(_data, index) => ({ length: 75, offset: 75 * index, index })}
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                windowSize={10}
              />
            </>
          )}

          <FilterBottomSheet
            ref={filterRef}
            filterGroups={FILTER_GROUPS}
            dateRangeGroups={DATE_RANGE_GROUPS}
            values={filters}
            onChange={setFilters}
            onApply={() => {}}
            onReset={resetFilters}
          />

          <SyncToCrmSheet
            ref={syncRef}
            call={selectedCall}
            simCards={simCards}
            onSynced={() => {}}
          />
        </>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  root:       { flex: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  permTitle:  { fontSize: fontSize.xl, fontWeight: fontWeight.bold, textAlign: 'center', marginBottom: 8 },
  permSub:    { fontSize: fontSize.base, textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg },
  permBtn:    { width: '80%' },
  header:     { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  headerTop:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  search:     { flex: 1 },
  iconBtn:    { padding: spacing.sm, position: 'relative' },
  syncBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: borderRadius.md },
  syncText:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  lastSync:   { fontSize: fontSize.xs, marginTop: 4 },
  loadText:   { fontSize: fontSize.base, marginTop: 12 },
  hint:       { fontSize: fontSize.xs, textAlign: 'center', paddingVertical: 6 },
});

export default CallSyncScreen;
