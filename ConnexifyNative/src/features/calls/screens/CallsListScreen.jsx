import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import Badge from '../../../design-system/components/Badge';
import Chip from '../../../design-system/components/Chip';
import FAB from '../../../design-system/components/FAB';
import Sheet from '../../../design-system/components/Sheet';
import SearchBar from '../../../design-system/components/SearchBar';
import Avatar from '../../../design-system/components/Avatar';
import SelectField from '../../../design-system/components/SelectField';
import TextField from '../../../design-system/components/TextField';
import Button from '../../../design-system/components/Button';
import { SegmentedTabs } from '../../../design-system/components/SegmentedTabs';
import EmptyState from '../../../design-system/components/EmptyState';
import ErrorState from '../../../design-system/components/ErrorState';
import { SkeletonList, Skeleton } from '../../../design-system/components/Skeleton';
import ConfirmSheet from '../../../design-system/components/ConfirmSheet';
import SwipeRow from '../../../design-system/components/SwipeRow';
import { Phone, PhoneIncoming, PhoneOutgoing, Trash2, X, UserPlus, Briefcase } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { keys } from '../../../api/queryKeys';
import { useListQuery, useWorkspaceId } from '../../../hooks/useListQuery';
import { callsApi, CALL_OUTCOMES, LEAD_FILTERS } from '../api';
import { leadsApi } from '../../leads/api';
import { formatDurationExact, formatDateTime } from '../../../utils/format';
import { ROUTES } from '../../../navigation/routes';

const OUTCOME_TONES = {
  connected: 'success',
  no_answer: 'neutral',
  voicemail: 'info',
  followup_needed: 'warning',
};

const LogCallSheet = forwardRef(function LogCallSheet({ onSaved }, ref) {
  const theme = useTheme();
  const sheetRef = useRef(null);
  const [lead, setLead] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [callType, setCallType] = useState('outbound');
  const [outcome, setOutcome] = useState('connected');
  const [minutes, setMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => {
      setLead(null);
      setQuery('');
      setResults([]);
      setCallType('outbound');
      setOutcome('connected');
      setMinutes('');
      setNotes('');
      requestAnimationFrame(() => sheetRef.current?.present());
    },
  }));

  const search = async (text) => {
    if (!text.trim()) return setResults([]);
    try {
      setSearching(true);
      const { data } = await leadsApi.list({ search: text.trim(), limit: 8, page: 1 });
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const submit = async () => {
    if (!lead) return;
    try {
      setBusy(true);
      await callsApi.create({
        leadId: lead.id,
        callType,
        outcome,
        duration: minutes ? Math.round(Number(minutes) * 60) : 0,
        notes: notes.trim() || undefined,
      });
      Toast.show({ type: 'success', text1: 'Call logged' });
      sheetRef.current?.dismiss();
      onSaved?.();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Could not log call', text2: err?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet ref={sheetRef} title="Log call" scrollable snapPoints={['78%']}>
      {!lead ? (
        <>
          <SearchBar value={query} onChangeText={setQuery} onDebounced={search} placeholder="Search leads…" />
          <View style={styles.results}>
            {searching ? (
              <>
                <Skeleton height={48} />
                <Skeleton height={48} style={styles.gapTop} />
              </>
            ) : (
              results.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setLead(item)}
                  accessibilityRole="button"
                  style={[styles.resultRow, { borderRadius: theme.radius.md }]}
                  android_ripple={{ color: theme.brandFaint }}
                >
                  <Avatar name={item.contactName || item.title} size={34} />
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {item.contactName || item.title}
                    </AppText>
                    <AppText variant="caption" color="inkFaint" numberOfLines={1}>
                      {item.phone || item.company || '—'}
                    </AppText>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </>
      ) : (
        <>
          <View style={[styles.leadPill, { backgroundColor: theme.brandFaint, borderRadius: theme.radius.md }]}>
            <Avatar name={lead.contactName || lead.title} size={30} />
            <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
              {lead.contactName || lead.title}
            </AppText>
            <Pressable onPress={() => setLead(null)} hitSlop={8} accessibilityLabel="Change lead">
              <X size={16} color={theme.colors.inkMuted} strokeWidth={2.4} />
            </Pressable>
          </View>
          <SegmentedTabs
            tabs={[
              { key: 'outbound', label: 'Outgoing' },
              { key: 'inbound', label: 'Incoming' },
            ]}
            value={callType}
            onChange={setCallType}
            style={styles.field}
          />
          <SelectField label="Outcome" value={outcome} onChange={setOutcome} options={CALL_OUTCOMES} style={styles.field} />
          <TextField label="Duration (minutes)" value={minutes} onChangeText={(v) => setMinutes(v.replace(/[^\d.]/g, ''))} keyboardType="numeric" placeholder="5" style={styles.field} />
          <TextField label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Key points from the call" style={styles.field} />
          <Button title="Log call" fullWidth loading={busy} onPress={submit} />
        </>
      )}
    </Sheet>
  );
});

const ConvertSheet = forwardRef(function ConvertSheet({ onConverted }, ref) {
  const sheetRef = useRef(null);
  const [call, setCall] = useState(null);
  const [busy, setBusy] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (item) => {
      setCall(item);
      requestAnimationFrame(() => sheetRef.current?.present());
    },
  }));

  const convert = async (type) => {
    if (!call) return;
    try {
      setBusy(true);
      const { data } = await callsApi.convert(call.id, { type });
      Toast.show({ type: 'success', text1: type === 'opportunity' ? 'Opportunity created' : 'Lead created' });
      sheetRef.current?.dismiss();
      onConverted?.(data);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Could not convert', text2: err?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet ref={sheetRef} title="Convert this call" subtitle={call?.callerName || call?.phoneNumber || 'Unknown caller'}>
      <Button title="Create lead" icon={UserPlus} fullWidth loading={busy} onPress={() => convert('lead')} style={styles.field} />
      <Button title="Create opportunity" icon={Briefcase} variant="secondary" fullWidth loading={busy} onPress={() => convert('opportunity')} />
    </Sheet>
  );
});

export default function CallsListScreen({ navigation }) {
  const theme = useTheme();
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  const [outcomeFilter, setOutcomeFilter] = useState(null);
  const [leadFilter, setLeadFilter] = useState(undefined); // undefined|'true'|'false' — server-side hasLead filter
  const logRef = useRef(null);
  const confirmRef = useRef(null);
  const convertRef = useRef(null);

  const params = useMemo(() => (leadFilter !== undefined ? { hasLead: leadFilter } : {}), [leadFilter]);

  const list = useListQuery({
    keyFn: (w, p) => keys.calls.list(w, p),
    fetcher: (p) => callsApi.list(p),
    params,
    limit: 25,
  });

  const removeCall = useMutation({
    mutationFn: (id) => callsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.calls.all(ws) }),
    onError: (err) => Toast.show({ type: 'error', text1: 'Delete failed', text2: err?.message }),
  });

  const items = useMemo(
    () => (outcomeFilter ? list.items.filter((c) => c.outcome === outcomeFilter) : list.items),
    [list.items, outcomeFilter],
  );

  return (
    <ScreenScaffold>
      <AppHeader title="Calls" />
      <View style={styles.filters}>
        {LEAD_FILTERS.map((f) => (
          <Chip key={f.label} label={f.label} selected={leadFilter === f.value} onPress={() => setLeadFilter(f.value)} />
        ))}
      </View>
      <View style={styles.filters}>
        {CALL_OUTCOMES.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={outcomeFilter === o.value}
            onPress={() => setOutcomeFilter(outcomeFilter === o.value ? null : o.value)}
          />
        ))}
      </View>

      {list.isPending ? (
        <SkeletonList count={7} cardHeight={84} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="No calls logged"
          message="Log your first call to build the timeline."
          actionLabel="Log call"
          onAction={() => logRef.current?.open()}
        />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => String(item.id)}
          estimatedItemSize={92}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.4}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
          refreshControl={
            <RefreshControl refreshing={list.isRefetching && !list.isFetchingNextPage} onRefresh={list.refetch} tintColor={theme.brand} colors={[theme.brand]} />
          }
          renderItem={({ item, index }) => {
            const inbound = item.callType === 'inbound';
            const DirIcon = inbound ? PhoneIncoming : PhoneOutgoing;
            const outcomeMeta = CALL_OUTCOMES.find((o) => o.value === item.outcome);
            const displayName = item.lead?.contactName || item.lead?.title || item.callerName || item.phoneNumber || (inbound ? 'Incoming call' : 'Outgoing call');
            const synced = item.source === 'device_sync';
            return (
              <Animated.View entering={index < 8 ? FadeInDown.duration(280).delay(index * 40) : undefined}>
                <SwipeRow
                  actions={[
                    ...(!item.leadId
                      ? [
                          {
                            key: 'convert',
                            label: 'Convert',
                            icon: UserPlus,
                            color: theme.brand,
                            onPress: () => convertRef.current?.open(item),
                          },
                        ]
                      : []),
                    {
                      key: 'delete',
                      label: 'Delete',
                      icon: Trash2,
                      color: theme.colors.danger,
                      onPress: () =>
                        confirmRef.current?.open({
                          title: 'Delete call log?',
                          destructive: true,
                          onConfirm: () => removeCall.mutateAsync(item.id),
                        }),
                    },
                  ]}
                  style={styles.rowWrap}
                >
                  <Card style={styles.card}>
                    <Pressable
                      style={styles.row}
                      onPress={() =>
                        item.leadId
                          ? navigation.navigate(ROUTES.LEAD_DETAIL, { leadId: item.leadId, id: item.leadId })
                          : convertRef.current?.open(item)
                      }
                      accessibilityRole="button"
                    >
                      <View style={[styles.dirIcon, { backgroundColor: inbound ? theme.colors.infoSoft : theme.brandFaint, borderRadius: theme.radius.full }]}>
                        <DirIcon size={17} color={inbound ? '#0284C7' : theme.brand} strokeWidth={2.1} />
                      </View>
                      <View style={styles.flex}>
                        <AppText variant="bodyStrong" numberOfLines={1}>
                          {displayName}
                        </AppText>
                        <View style={styles.metaRow}>
                          {outcomeMeta ? <Badge label={outcomeMeta.label} tone={OUTCOME_TONES[item.outcome] || 'neutral'} size="sm" /> : null}
                          {!item.leadId ? <Badge label="No lead" tone="neutral" size="sm" /> : null}
                          {item.duration ? (
                            <AppText variant="micro" color="inkFaint">
                              {formatDurationExact(item.duration)}
                            </AppText>
                          ) : null}
                        </View>
                        <View style={styles.metaRow}>
                          <AppText variant="micro" color="inkFaint">
                            {formatDateTime(item.createdAt)}
                          </AppText>
                          {synced ? (
                            <AppText variant="micro" color="inkFaint" style={styles.time}>
                              Synced by {item.owner?.name || 'device'}
                            </AppText>
                          ) : null}
                        </View>
                        {item.notes ? (
                          <AppText variant="caption" color="inkMuted" numberOfLines={2} style={styles.notes}>
                            {item.notes}
                          </AppText>
                        ) : null}
                      </View>
                    </Pressable>
                  </Card>
                </SwipeRow>
              </Animated.View>
            );
          }}
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <AppText variant="caption" color="inkFaint" style={styles.footer}>
                Loading more…
              </AppText>
            ) : null
          }
        />
      )}

      <FAB label="Log call" onPress={() => logRef.current?.open()} />
      <LogCallSheet ref={logRef} onSaved={list.refetch} />
      <ConvertSheet ref={convertRef} onConverted={list.refetch} />
      <ConfirmSheet ref={confirmRef} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  listContent: { paddingHorizontal: 16, paddingBottom: 110, paddingTop: 4 },
  footer: { textAlign: 'center', paddingVertical: 14 },
  rowWrap: { marginBottom: 10 },
  card: { padding: 13 },
  row: { flexDirection: 'row', gap: 12 },
  dirIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  time: { marginLeft: 'auto' },
  notes: { marginTop: 6 },
  results: { marginTop: 10 },
  gapTop: { marginTop: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingVertical: 10 },
  leadPill: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, marginBottom: 14 },
  field: { marginBottom: 14 },
});
