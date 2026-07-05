import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import Badge from '../../../design-system/components/Badge';
import Chip from '../../../design-system/components/Chip';
import Button from '../../../design-system/components/Button';
import IconButton from '../../../design-system/components/IconButton';
import SearchBar from '../../../design-system/components/SearchBar';
import EmptyState from '../../../design-system/components/EmptyState';
import ErrorState from '../../../design-system/components/ErrorState';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Voicemail,
  Check,
  CheckCheck,
  RefreshCw,
  Signal,
  ShieldCheck,
} from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useWorkspaceId } from '../../../hooks/useListQuery';
import { useCallSyncStore } from '../../../stores/callSyncStore';
import { getSimCards, getCallLogsForSim, hasCallLogPermissions, requestCallLogPermissions, CALL_TYPE } from '../../../native/simCard';
import { buildLeadPhoneIndex, matchLeadForNumber, callDirection, syncDeviceCall } from '../api';
import { formatDuration, formatDateTime } from '../../../utils/format';

const DIRECTION_META = {
  incoming: { label: 'Incoming', icon: PhoneIncoming, tone: 'info' },
  outgoing: { label: 'Outgoing', icon: PhoneOutgoing, tone: 'brand' },
  missed: { label: 'Missed', icon: PhoneMissed, tone: 'danger' },
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'incoming', label: 'Incoming' },
  { key: 'outgoing', label: 'Outgoing' },
  { key: 'missed', label: 'Missed' },
];

export default function CallLogSyncScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const ws = useWorkspaceId();
  const syncedIds = useCallSyncStore((s) => s.syncedIds);
  const hydrateSynced = useCallSyncStore((s) => s.hydrate);
  const markSynced = useCallSyncStore((s) => s.markSynced);

  const [permission, setPermission] = useState('checking'); // checking|denied|granted
  const [sims, setSims] = useState([]);
  const [activeSim, setActiveSim] = useState(-1);
  const [directionFilter, setDirectionFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [leadIndex, setLeadIndex] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    hydrateSynced();
  }, [hydrateSynced]);

  const loadCalls = useCallback(async (subscriptionId) => {
    setLoading(true);
    setError(null);
    try {
      const [rows, simList] = await Promise.all([getCallLogsForSim(subscriptionId, 500), getSimCards()]);
      setCalls(Array.isArray(rows) ? rows : []);
      setSims(Array.isArray(simList) ? simList : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const ensureAccess = useCallback(async () => {
    const already = await hasCallLogPermissions();
    setPermission(already ? 'granted' : 'denied');
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      setPermission('unsupported');
      return;
    }
    ensureAccess();
  }, [ensureAccess]);

  useEffect(() => {
    if (permission !== 'granted') return;
    loadCalls(activeSim);
    setSelected(new Set());
  }, [activeSim, permission, loadCalls]);

  useEffect(() => {
    if (permission !== 'granted' || !ws) return;
    buildLeadPhoneIndex()
      .then(setLeadIndex)
      .catch(() => setLeadIndex(new Map()));
  }, [permission, ws]);

  const requestAccess = async () => {
    const granted = await requestCallLogPermissions();
    if (granted) {
      setPermission('granted');
    } else {
      Toast.show({ type: 'error', text1: 'Permission denied', text2: 'Call log access is required to sync calls.' });
    }
  };

  const matchedLeadFor = useCallback((item) => (leadIndex ? matchLeadForNumber(leadIndex, item.phoneNumber) : null), [leadIndex]);

  const filtered = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return calls.filter((c) => {
      if (directionFilter !== 'all' && callDirection(c.callType) !== directionFilter) return false;
      if (q && !(c.name || '').toLowerCase().includes(q) && !(c.phoneNumber || '').includes(q)) return false;
      return true;
    });
  }, [calls, directionFilter, searchInput]);

  const selectableIds = useMemo(() => filtered.filter((c) => !syncedIds.has(c.id)).map((c) => c.id), [filtered, syncedIds]);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  };

  const runSync = async () => {
    const items = filtered.filter((c) => selected.has(c.id));
    if (!items.length) return;
    setSyncing(true);

    // Matched numbers sync straight to their lead; unmatched sync as orphan
    // records (caller name/number kept) — convertible into a Lead/Opportunity
    // later from the Calls screen.
    const results = await Promise.allSettled(
      items.map((item) => {
        const lead = matchedLeadFor(item);
        return syncDeviceCall({
          leadId: lead?.id,
          name: item.name,
          phoneNumber: item.phoneNumber,
          callType: item.callType,
          callDate: item.callDate,
          callDuration: item.callDuration,
        }).then(() => item.id);
      }),
    );
    results.forEach((r) => {
      if (r.status === 'rejected') {
        const reason = r.reason;
        console.log('[callSync] sync failed. name=', reason?.name, 'code=', reason?.code, 'status=', reason?.status, 'message=', reason?.message, 'stack=', reason?.stack);
      }
    });
    const succeededIds = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    if (succeededIds.length) await markSynced(succeededIds);

    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of succeededIds) next.delete(id);
      return next;
    });

    const failedCount = items.length - succeededIds.length;
    setSyncing(false);

    if (succeededIds.length) {
      Toast.show({ type: 'success', text1: `Synced ${succeededIds.length} call${succeededIds.length > 1 ? 's' : ''}` });
    }
    if (failedCount) {
      Toast.show({ type: 'error', text1: `${failedCount} call${failedCount > 1 ? 's' : ''} failed to sync` });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCalls(activeSim);
  };

  if (permission === 'unsupported') {
    return (
      <ScreenScaffold>
        <EmptyState icon={PhoneCall} title="Not available" message="Call log sync is only available on Android." compact />
      </ScreenScaffold>
    );
  }

  if (permission === 'denied') {
    return (
      <ScreenScaffold>
        <View style={[styles.centerFill, { paddingTop: insets.top }]}>
          <EmptyState
            icon={ShieldCheck}
            title="Access your call log"
            message="LeadNest needs call log and phone state permission to read device calls and sync them to your leads."
            actionLabel="Grant access"
            onAction={requestAccess}
          />
        </View>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.titleRow}>
          <AppText variant="title">Call Logs</AppText>
          <IconButton icon={RefreshCw} accessibilityLabel="Refresh" onPress={onRefresh} />
        </View>

        {sims.length > 1 ? (
          <View style={styles.chipRow}>
            <Chip label="All SIMs" icon={Signal} selected={activeSim === -1} onPress={() => setActiveSim(-1)} />
            {sims.map((sim) => (
              <Chip
                key={sim.subscriptionId}
                label={sim.displayName || sim.carrierName || `SIM ${sim.slotIndex + 1}`}
                icon={Signal}
                selected={activeSim === sim.subscriptionId}
                onPress={() => setActiveSim(sim.subscriptionId)}
              />
            ))}
          </View>
        ) : null}

        <SearchBar value={searchInput} onChangeText={setSearchInput} placeholder="Search name or number…" style={styles.search} />

        <View style={styles.chipRow}>
          {FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} selected={directionFilter === f.key} onPress={() => setDirectionFilter(f.key)} />
          ))}
        </View>

        {selectableIds.length > 0 ? (
          <Pressable onPress={toggleSelectAll} style={styles.selectAllRow} accessibilityRole="button">
            <CheckCheck size={15} color={allSelected ? theme.brand : theme.colors.inkFaint} strokeWidth={2.2} />
            <AppText variant="label" color={allSelected ? 'brand' : 'inkMuted'}>
              {allSelected ? 'Clear selection' : `Select all (${selectableIds.length})`}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <SkeletonList count={7} cardHeight={78} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => loadCalls(activeSim)} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={PhoneCall} title="No calls found" message="Try a different SIM or filter." compact />
      ) : (
        <FlashList
          data={filtered}
          extraData={selected}
          keyExtractor={(item) => item.id}
          estimatedItemSize={78}
          contentContainerStyle={[styles.listContent, { paddingBottom: selected.size ? 100 : 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} colors={[theme.brand]} />}
          renderItem={({ item, index }) => {
            const synced = syncedIds.has(item.id);
            const dir = callDirection(item.callType);
            const meta = DIRECTION_META[dir];
            const DirIcon = item.callType === CALL_TYPE.VOICEMAIL ? Voicemail : meta.icon;
            const lead = matchedLeadFor(item);
            const isSelected = selected.has(item.id);
            return (
              <Animated.View entering={index < 10 ? FadeInDown.duration(240).delay(index * 25) : undefined}>
                <Pressable
                  onPress={() => !synced && toggleSelect(item.id)}
                  disabled={synced}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected, disabled: synced }}
                >
                  <Card style={[styles.card, isSelected && { borderColor: theme.brand, borderWidth: 1.5 }]}>
                    <View style={styles.row}>
                      <View
                        style={[
                          styles.checkCircle,
                          {
                            borderRadius: theme.radius.full,
                            borderColor: synced ? theme.colors.border : isSelected ? theme.brand : theme.colors.borderStrong,
                            backgroundColor: isSelected ? theme.brand : 'transparent',
                          },
                        ]}
                      >
                        {isSelected ? <Check size={13} color={theme.onBrand} strokeWidth={3} /> : null}
                      </View>
                      <View style={[styles.dirIcon, { backgroundColor: theme.colors.skeleton, borderRadius: theme.radius.full }]}>
                        <DirIcon size={16} color={theme.colors.inkMuted} strokeWidth={2.1} />
                      </View>
                      <View style={styles.flex}>
                        <AppText variant="bodyStrong" numberOfLines={1}>
                          {item.name || item.phoneNumber || 'Unknown'}
                        </AppText>
                        <View style={styles.metaRow}>
                          <AppText variant="micro" color="inkFaint">
                            {formatDateTime(item.callDate)}
                          </AppText>
                          {item.callDuration ? (
                            <AppText variant="micro" color="inkFaint">
                              · {formatDuration(item.callDuration)}
                            </AppText>
                          ) : null}
                        </View>
                        <View style={styles.badgeRow}>
                          {synced ? (
                            <Badge label="Synced" tone="success" size="sm" />
                          ) : lead ? (
                            <Badge label={lead.contactName || lead.title} tone="brand" size="sm" />
                          ) : (
                            <Badge label="No lead" tone="neutral" size="sm" />
                          )}
                        </View>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              </Animated.View>
            );
          }}
        />
      )}

      {selected.size > 0 ? (
        <View style={[styles.syncBar, { paddingBottom: insets.bottom + 12, backgroundColor: theme.colors.card, borderTopColor: theme.colors.divider }]}>
          <Button title={`Sync ${selected.size} call${selected.size > 1 ? 's' : ''}`} fullWidth loading={syncing} onPress={runSync} />
        </View>
      ) : null}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  search: { marginBottom: 10 },
  selectAllRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  centerFill: { flex: 1, justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingTop: 4 },
  card: { padding: 12, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkCircle: { width: 22, height: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dirIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  badgeRow: { flexDirection: 'row', marginTop: 6 },
  syncBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
