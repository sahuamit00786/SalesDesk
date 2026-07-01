import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Switch,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Animatable from 'react-native-animatable';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../theme/ThemeContext';
import { useLeaveStore } from '../../store/leaveStore';
import { useAuthStore } from '../../store/authStore';
import { fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import AppHeader from '../../components/navigation/AppHeader';
import SkeletonList from '../../components/feedback/SkeletonList';
import EmptyState from '../../components/feedback/EmptyState';
import SelectInput from '../../components/inputs/SelectInput';
import DateInput from '../../components/inputs/DateInput';
import AppInput from '../../components/inputs/AppInput';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import GhostButton from '../../components/buttons/GhostButton';
import SwipeableRow from '../../components/misc/SwipeableRow';
import StatusBadge from '../../components/misc/StatusBadge';

const applySchema = yup.object({
  leaveTypeId:  yup.string().required('Select leave type'),
  fromDate:     yup.date().required('Select start date').nullable(),
  toDate:       yup.date().required('Select end date').nullable()
    .min(yup.ref('fromDate'), 'End must be after start'),
  reason:       yup.string().required('Reason required'),
});

const STATUS_COLORS = {
  pending:   '#F59E0B',
  approved:  '#10B981',
  rejected:  '#EF4444',
  cancelled: '#94A3B8',
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ── Balance Cards ────────────────────────────────────────────────
const BalanceCard = ({ item, theme }) => {
  const used = Number(item.used || 0);
  const allocated = Number(item.allocated || 0);
  const available = Number(item.available || 0);
  const pct = allocated > 0 ? Math.min((used / allocated) * 100, 100) : 0;

  return (
    <View style={[bc.card, { backgroundColor: theme.colors.surface }, shadows.card]}>
      <Text style={[bc.type, { color: theme.colors.textPrimary }]}>{item.LeaveType?.name || '—'}</Text>
      <View style={bc.row}>
        <View style={bc.stat}>
          <Text style={[bc.val, { color: theme.colors.primary }]}>{available}</Text>
          <Text style={[bc.lbl, { color: theme.colors.textMuted }]}>Available</Text>
        </View>
        <View style={bc.stat}>
          <Text style={[bc.val, { color: theme.colors.textSecondary }]}>{used}</Text>
          <Text style={[bc.lbl, { color: theme.colors.textMuted }]}>Used</Text>
        </View>
        <View style={bc.stat}>
          <Text style={[bc.val, { color: theme.colors.textSecondary }]}>{allocated}</Text>
          <Text style={[bc.lbl, { color: theme.colors.textMuted }]}>Total</Text>
        </View>
      </View>
      <View style={[bc.bar, { backgroundColor: theme.colors.borderLight }]}>
        <View style={[bc.fill, { width: `${pct}%`, backgroundColor: pct > 80 ? '#EF4444' : theme.colors.primary }]} />
      </View>
    </View>
  );
};

const bc = StyleSheet.create({
  card: { borderRadius: borderRadius.lg, padding: spacing.base, marginRight: spacing.base, width: 180 },
  type: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  row:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  stat: { alignItems: 'center' },
  val:  { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  lbl:  { fontSize: fontSize.xs },
  bar:  { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
});

// ── Leave Request Row ────────────────────────────────────────────
const RequestRow = ({ request, onCancel, theme }) => {
  const statusColor = STATUS_COLORS[request.status] || '#94A3B8';
  const isPending = request.status === 'pending';

  return (
    <SwipeableRow
      rightActions={isPending ? [{ icon: 'close', color: '#EF4444', label: 'Cancel', onPress: () => onCancel(request.id) }] : []}
    >
      <View style={[rr.row, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.borderLight }]}>
        <View style={[rr.accent, { backgroundColor: statusColor }]} />
        <View style={rr.body}>
          <View style={rr.top}>
            <Text style={[rr.type, { color: theme.colors.textPrimary }]}>{request.LeaveType?.name}</Text>
            <StatusBadge status={request.status} color={statusColor} />
          </View>
          <Text style={[rr.dates, { color: theme.colors.textSecondary }]}>
            {formatDate(request.fromDate)} → {formatDate(request.toDate)}
            {request.isHalfDay ? ' (Half Day)' : ` · ${request.days} day${request.days !== 1 ? 's' : ''}`}
          </Text>
          {request.reason ? (
            <Text style={[rr.reason, { color: theme.colors.textMuted }]} numberOfLines={1}>{request.reason}</Text>
          ) : null}
        </View>
      </View>
    </SwipeableRow>
  );
};

const rr = StyleSheet.create({
  row:    { flexDirection: 'row', borderBottomWidth: 1 },
  accent: { width: 4 },
  body:   { flex: 1, padding: spacing.base },
  top:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  type:   { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  dates:  { fontSize: fontSize.sm },
  reason: { fontSize: fontSize.xs, marginTop: 2 },
});

// ── Approval Row (manager) ───────────────────────────────────────
const ApprovalRow = ({ request, onApprove, onReject, theme }) => (
  <View style={[ar.row, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.borderLight }]}>
    <View style={ar.body}>
      <Text style={[ar.name, { color: theme.colors.textPrimary }]}>{request.User?.name}</Text>
      <Text style={[ar.info, { color: theme.colors.textSecondary }]}>
        {request.LeaveType?.name} · {formatDate(request.fromDate)} → {formatDate(request.toDate)}
        {' '}({request.days} days)
      </Text>
      {request.reason ? <Text style={[ar.reason, { color: theme.colors.textMuted }]} numberOfLines={1}>{request.reason}</Text> : null}
    </View>
    <View style={ar.actions}>
      <TouchableOpacity style={[ar.btn, { backgroundColor: '#10B98120' }]} onPress={() => onApprove(request.id)}>
        <Icon name="check" size={18} color="#10B981" />
      </TouchableOpacity>
      <TouchableOpacity style={[ar.btn, { backgroundColor: '#EF444420' }]} onPress={() => onReject(request.id)}>
        <Icon name="close" size={18} color="#EF4444" />
      </TouchableOpacity>
    </View>
  </View>
);

const ar = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', padding: spacing.base, borderBottomWidth: 1, gap: 10 },
  body:    { flex: 1 },
  name:    { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  info:    { fontSize: fontSize.sm, marginTop: 2 },
  reason:  { fontSize: fontSize.xs, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  btn:     { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

// ── Apply Form Sheet ─────────────────────────────────────────────
const ApplySheet = ({ leaveTypes, onSaved, sheetRef, theme }) => {
  const { applyLeave } = useLeaveStore();
  const [isHalfDay, setHalfDay] = useState(false);

  const typeOptions = leaveTypes.map((t) => ({ value: t.id, label: t.name }));

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(applySchema),
    defaultValues: { leaveTypeId: '', fromDate: null, toDate: null, reason: '' },
  });

  const close = () => { reset(); setHalfDay(false); sheetRef?.current?.close(); };

  const onSubmit = async (data) => {
    try {
      await applyLeave({
        leaveTypeId: data.leaveTypeId,
        fromDate:    data.fromDate,
        toDate:      isHalfDay ? data.fromDate : data.toDate,
        isHalfDay,
        reason:      data.reason,
      });
      Toast.show({ type: 'success', text1: 'Leave applied successfully' });
      close();
      onSaved?.();
    } catch (e) {
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed to apply leave' });
    }
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['85%']}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
      keyboardBehavior="interactive"
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={[{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: theme.colors.textPrimary, marginBottom: spacing.base }]}>
          Apply for Leave
        </Text>

        <Controller
          control={control} name="leaveTypeId"
          render={({ field: { onChange, value } }) => (
            <SelectInput label="Leave Type" value={value} options={typeOptions} onChange={onChange} icon="tag-outline" error={errors.leaveTypeId?.message} />
          )}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.base }}>
          <Switch value={isHalfDay} onValueChange={setHalfDay} />
          <Text style={{ color: theme.colors.textPrimary, fontSize: fontSize.base }}>Half Day</Text>
        </View>

        <Controller
          control={control} name="fromDate"
          render={({ field: { onChange, value } }) => (
            <DateInput label="From Date" value={value} onChange={onChange} icon="calendar-start" error={errors.fromDate?.message} />
          )}
        />

        {!isHalfDay && (
          <Controller
            control={control} name="toDate"
            render={({ field: { onChange, value } }) => (
              <DateInput label="To Date" value={value} onChange={onChange} icon="calendar-end" error={errors.toDate?.message} />
            )}
          />
        )}

        <Controller
          control={control} name="reason"
          render={({ field: { onChange, value } }) => (
            <AppInput label="Reason" value={value} onChangeText={onChange} icon="text-box-outline" multiline numberOfLines={3} error={errors.reason?.message} />
          )}
        />

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
          <GhostButton title="Cancel" onPress={close} style={{ flex: 1 }} />
          <PrimaryButton title="Apply" onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={{ flex: 2 }} />
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

// ── Main Screen ──────────────────────────────────────────────────
const TABS = ['My Leave', 'Apply', 'Approvals'];

const LeaveScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { isManager } = useAuthStore();
  const applyRef = useRef(null);

  const {
    leaveTypes, balance, myRequests, pendingApprovals,
    isLoading, isRefreshing,
    load, refresh, loadPendingApprovals, cancelLeave, approveLeave, rejectLeave,
  } = useLeaveStore();

  const [activeTab, setActiveTab] = useState(0);
  const tabs = isManager() ? TABS : TABS.slice(0, 2);

  useEffect(() => {
    load();
    if (isManager()) loadPendingApprovals();
  }, []);

  const handleCancel = async (id) => {
    try {
      await cancelLeave(id);
      Toast.show({ type: 'success', text1: 'Leave cancelled' });
    } catch { Toast.show({ type: 'error', text1: 'Cancel failed' }); }
  };

  const handleApprove = async (id) => {
    try {
      await approveLeave(id);
      Toast.show({ type: 'success', text1: 'Leave approved' });
    } catch { Toast.show({ type: 'error', text1: 'Approve failed' }); }
  };

  const handleReject = async (id) => {
    try {
      await rejectLeave(id, '');
      Toast.show({ type: 'success', text1: 'Leave rejected' });
    } catch { Toast.show({ type: 'error', text1: 'Reject failed' }); }
  };

  if (isLoading && balance.length === 0) return (
    <View style={[s.root, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Leave" navigation={navigation} />
      <SkeletonList />
    </View>
  );

  return (
    <View style={[s.root, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Leave" navigation={navigation} />

      {/* Tabs */}
      <View style={[s.tabs, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.borderLight }]}>
        {tabs.map((tab, i) => (
          <TouchableOpacity key={tab} style={[s.tab, activeTab === i && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]} onPress={() => setActiveTab(i)}>
            <Text style={[s.tabText, { color: activeTab === i ? theme.colors.primary : theme.colors.textSecondary }]}>
              {tab}
              {tab === 'Approvals' && pendingApprovals.length > 0 ? ` (${pendingApprovals.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* My Leave Tab */}
        {activeTab === 0 && (
          <Animatable.View animation="fadeIn" duration={300}>
            <Text style={[s.sectionTitle, { color: theme.colors.textSecondary }]}>Balance</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: spacing.base, gap: spacing.sm }}>
              {balance.map((item) => <BalanceCard key={item.id} item={item} theme={theme} />)}
            </ScrollView>

            <Text style={[s.sectionTitle, { color: theme.colors.textSecondary, marginTop: spacing.sm }]}>My Requests</Text>
            {myRequests.length === 0 ? (
              <EmptyState icon="calendar-blank" title="No leave requests" subtitle="Apply for leave using the Apply tab" />
            ) : (
              myRequests.map((r) => <RequestRow key={r.id} request={r} onCancel={handleCancel} theme={theme} />)
            )}
          </Animatable.View>
        )}

        {/* Apply Tab */}
        {activeTab === 1 && (
          <Animatable.View animation="fadeIn" duration={300} style={s.applyCenter}>
            <Icon name="calendar-plus" size={64} color={theme.colors.primaryLight} style={{ marginBottom: 16 }} />
            <Text style={[s.applyTitle, { color: theme.colors.textPrimary }]}>Apply for Leave</Text>
            <Text style={[s.applySub, { color: theme.colors.textSecondary }]}>Fill in the form to submit a leave request</Text>
            <PrimaryButton title="Open Apply Form" onPress={() => applyRef.current?.expand()} style={{ width: '80%', marginTop: spacing.lg }} />
          </Animatable.View>
        )}

        {/* Approvals Tab (manager) */}
        {activeTab === 2 && (
          <Animatable.View animation="fadeIn" duration={300}>
            {pendingApprovals.length === 0 ? (
              <EmptyState icon="check-all" title="No pending approvals" subtitle="All requests have been processed" />
            ) : (
              pendingApprovals.map((r) => (
                <ApprovalRow key={r.id} request={r} onApprove={handleApprove} onReject={handleReject} theme={theme} />
              ))
            )}
          </Animatable.View>
        )}
      </ScrollView>

      <ApplySheet leaveTypes={leaveTypes} onSaved={refresh} sheetRef={applyRef} theme={theme} />
    </View>
  );
};

const s = StyleSheet.create({
  root:        { flex: 1 },
  tabs:        { flexDirection: 'row', borderBottomWidth: 1 },
  tab:         { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  tabText:     { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  sectionTitle:{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: 4 },
  applyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, paddingTop: 80 },
  applyTitle:  { fontSize: fontSize.xl, fontWeight: fontWeight.bold, textAlign: 'center' },
  applySub:    { fontSize: fontSize.base, textAlign: 'center', marginTop: 6, lineHeight: 22 },
});

export default LeaveScreen;
