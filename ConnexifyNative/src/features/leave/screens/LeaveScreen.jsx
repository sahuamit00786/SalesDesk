import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Toast from 'react-native-toast-message';
import DocumentPicker from 'react-native-document-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import Badge from '../../../design-system/components/Badge';
import Button from '../../../design-system/components/Button';
import Avatar from '../../../design-system/components/Avatar';
import FAB from '../../../design-system/components/FAB';
import Sheet from '../../../design-system/components/Sheet';
import SelectField from '../../../design-system/components/SelectField';
import DateField from '../../../design-system/components/DateField';
import TextField from '../../../design-system/components/TextField';
import ProgressBar from '../../../design-system/components/ProgressBar';
import { SegmentedTabs } from '../../../design-system/components/SegmentedTabs';
import { Divider } from '../../../design-system/components/SectionHeader';
import { Skeleton } from '../../../design-system/components/Skeleton';
import EmptyState from '../../../design-system/components/EmptyState';
import ErrorState from '../../../design-system/components/ErrorState';
import ConfirmSheet from '../../../design-system/components/ConfirmSheet';
import { Umbrella, Paperclip, PartyPopper, Check, X } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import {
  useLeaveTypes,
  useLeaveBalance,
  useMyLeaveRequests,
  usePendingApprovals,
  useHolidays,
  useLeaveMutations,
} from '../hooks';
import { LEAVE_STATUS_TONES } from '../api';
import { useIsHrManagerOrAdmin } from '../../../hooks/permissions';
import { formatDate, toISODate, relativeTime } from '../../../utils/format';

const ApplySheet = forwardRef(function ApplySheet({ types, onDone }, ref) {
  const sheetRef = useRef(null);
  const { apply } = useLeaveMutations();
  const [leaveTypeId, setLeaveTypeId] = useState(null);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [errors, setErrors] = useState({});

  useImperativeHandle(ref, () => ({
    open: () => {
      setLeaveTypeId(null);
      setFromDate(null);
      setToDate(null);
      setIsHalfDay(false);
      setReason('');
      setAttachment(null);
      setErrors({});
      requestAnimationFrame(() => sheetRef.current?.present());
    },
  }));

  const pickAttachment = async () => {
    try {
      const res = await DocumentPicker.pickSingle({ type: [DocumentPicker.types.allFiles], copyTo: 'cachesDirectory' });
      if (res.size && res.size > 8 * 1024 * 1024) {
        Toast.show({ type: 'error', text1: 'File too large', text2: 'Maximum size is 8 MB' });
        return;
      }
      setAttachment({ uri: res.fileCopyUri || res.uri, name: res.name || 'document', type: res.type || 'application/octet-stream' });
    } catch (e) {
      if (!DocumentPicker.isCancel(e)) Toast.show({ type: 'error', text1: 'Could not attach file' });
    }
  };

  const submit = async () => {
    const next = {};
    if (!leaveTypeId) next.leaveTypeId = 'Pick a leave type';
    if (!fromDate) next.fromDate = 'Pick a start date';
    if (!isHalfDay && !toDate) next.toDate = 'Pick an end date';
    if (!reason.trim()) next.reason = 'A short reason is required';
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await apply.mutateAsync({
        leaveTypeId,
        fromDate: toISODate(fromDate),
        toDate: toISODate(isHalfDay ? fromDate : toDate),
        reason: reason.trim(),
        isHalfDay,
        document: attachment,
      });
      Toast.show({ type: 'success', text1: 'Leave request submitted' });
      sheetRef.current?.dismiss();
      onDone?.();
    } catch {
      // hook toasts
    }
  };

  return (
    <Sheet ref={sheetRef} title="Apply for leave" scrollable snapPoints={['80%']}>
      <SelectField
        label="Leave type *"
        value={leaveTypeId}
        onChange={setLeaveTypeId}
        options={(types || []).map((t) => ({ value: t.id, label: t.name, description: t.description }))}
        error={errors.leaveTypeId}
        style={styles.field}
      />
      <View style={styles.halfRow}>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">Half day</AppText>
          <AppText variant="caption" color="inkMuted">
            Counts as 0.5 day
          </AppText>
        </View>
        <Switch value={isHalfDay} onValueChange={setIsHalfDay} />
      </View>
      <View style={styles.row}>
        <DateField label="From *" value={fromDate} onChange={setFromDate} error={errors.fromDate} style={styles.rowItem} />
        {!isHalfDay ? (
          <DateField label="To *" value={toDate} onChange={setToDate} minimumDate={fromDate || undefined} error={errors.toDate} style={styles.rowItem} />
        ) : null}
      </View>
      <TextField label="Reason *" value={reason} onChangeText={setReason} multiline placeholder="Why are you taking leave?" error={errors.reason} style={styles.field} />
      <Button
        title={attachment ? attachment.name : 'Attach document (optional)'}
        variant="ghost"
        icon={Paperclip}
        fullWidth
        onPress={pickAttachment}
        style={styles.field}
      />
      <Button title="Submit request" fullWidth loading={apply.isPending} onPress={submit} />
    </Sheet>
  );
});

export default function LeaveScreen() {
  const theme = useTheme();
  const isManager = useIsHrManagerOrAdmin();
  const [segment, setSegment] = useState('overview');

  const types = useLeaveTypes();
  const balance = useLeaveBalance();
  const requests = useMyLeaveRequests();
  const approvals = usePendingApprovals(isManager && segment === 'approvals');
  const holidays = useHolidays();
  const { approve, reject, cancel } = useLeaveMutations();

  const applyRef = useRef(null);
  const confirmRef = useRef(null);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'requests', label: 'My requests' },
    ...(isManager ? [{ key: 'approvals', label: 'Approvals', count: approvals.data?.length }] : []),
  ];

  const refetchAll = () => {
    balance.refetch();
    requests.refetch();
    holidays.refetch();
    if (isManager) approvals.refetch();
  };

  const typeName = (req) => req.leaveType?.name || (types.data || []).find((t) => t.id === req.leaveTypeId)?.name || 'Leave';

  return (
    <ScreenScaffold>
      <AppHeader title="Leave" />
      <View style={styles.segmentWrap}>
        <SegmentedTabs tabs={tabs} value={segment} onChange={setSegment} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={balance.isRefetching || requests.isRefetching} onRefresh={refetchAll} tintColor={theme.brand} colors={[theme.brand]} />}
      >
        {segment === 'overview' ? (
          <>
            <AppText variant="captionStrong" color="inkFaint" style={styles.blockTitle}>
              BALANCES
            </AppText>
            {balance.isPending ? (
              <Skeleton height={110} />
            ) : balance.isError ? (
              <ErrorState error={balance.error} onRetry={balance.refetch} compact />
            ) : (balance.data || []).length === 0 ? (
              <Card style={styles.cardPad}>
                <AppText variant="body" color="inkFaint">
                  No leave balances configured yet.
                </AppText>
              </Card>
            ) : (
              <View style={styles.balanceGrid}>
                {balance.data.map((b, i) => {
                  const allocated = Number(b.allocated ?? b.total ?? 0);
                  const used = Number(b.used ?? 0);
                  const remaining = b.remaining != null ? Number(b.remaining) : Math.max(0, allocated - used);
                  return (
                    <Animated.View key={b.id || i} entering={FadeInDown.duration(280).delay(i * 50)} style={styles.balanceCell}>
                      <Card style={styles.balanceCard}>
                        <AppText variant="caption" color="inkMuted" numberOfLines={1}>
                          {b.leaveType?.name || b.name || 'Leave'}
                        </AppText>
                        <AppText variant="heading" style={styles.balanceValue}>
                          {remaining}
                          <AppText variant="caption" color="inkFaint">
                            {' '}
                            / {allocated || '—'}
                          </AppText>
                        </AppText>
                        <ProgressBar value={allocated > 0 ? Math.min(1, used / allocated) : 0} height={5} />
                      </Card>
                    </Animated.View>
                  );
                })}
              </View>
            )}

            <AppText variant="captionStrong" color="inkFaint" style={styles.blockTitle}>
              UPCOMING HOLIDAYS
            </AppText>
            {holidays.isPending ? (
              <Skeleton height={90} />
            ) : (holidays.data || []).length === 0 ? (
              <Card style={styles.cardPad}>
                <AppText variant="body" color="inkFaint">
                  No public holidays configured.
                </AppText>
              </Card>
            ) : (
              <Card padded={false} style={styles.listCard}>
                {holidays.data
                  .filter((h) => new Date(h.date || h.holidayDate).getTime() >= Date.now() - 86400000)
                  .slice(0, 8)
                  .map((h, i) => (
                    <View key={h.id || i}>
                      {i > 0 ? <Divider inset={52} /> : null}
                      <View style={styles.holidayRow}>
                        <View style={[styles.holidayIcon, { backgroundColor: theme.brandFaint, borderRadius: theme.radius.full }]}>
                          <PartyPopper size={16} color={theme.brand} strokeWidth={2} />
                        </View>
                        <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                          {h.name || h.title}
                        </AppText>
                        <AppText variant="caption" color="inkMuted">
                          {formatDate(h.date || h.holidayDate)}
                        </AppText>
                      </View>
                    </View>
                  ))}
              </Card>
            )}
          </>
        ) : null}

        {segment === 'requests' ? (
          requests.isPending ? (
            <Skeleton height={200} />
          ) : requests.isError ? (
            <ErrorState error={requests.error} onRetry={requests.refetch} compact />
          ) : (requests.data || []).length === 0 ? (
            <EmptyState icon={Umbrella} title="No leave requests" message="Apply for leave and track its approval here." actionLabel="Apply for leave" onAction={() => applyRef.current?.open()} />
          ) : (
            requests.data.map((req, i) => (
              <Animated.View key={req.id} entering={i < 8 ? FadeInDown.duration(260).delay(i * 35) : undefined}>
                <Card style={styles.requestCard}>
                  <View style={styles.requestHead}>
                    <AppText variant="bodyStrong">{typeName(req)}</AppText>
                    <Badge label={req.status || 'pending'} tone={LEAVE_STATUS_TONES[req.status] || 'neutral'} size="sm" />
                  </View>
                  <AppText variant="caption" color="inkMuted">
                    {formatDate(req.fromDate)}
                    {req.toDate && req.toDate !== req.fromDate ? ` → ${formatDate(req.toDate)}` : ''}
                    {req.isHalfDay ? ' · Half day' : ''}
                    {req.days != null ? ` · ${req.days} day${Number(req.days) === 1 ? '' : 's'}` : ''}
                  </AppText>
                  {req.reason ? (
                    <AppText variant="caption" color="inkFaint" numberOfLines={2} style={styles.reason}>
                      {req.reason}
                    </AppText>
                  ) : null}
                  {req.status === 'pending' ? (
                    <Button
                      title="Cancel request"
                      variant="dangerSoft"
                      size="sm"
                      onPress={() =>
                        confirmRef.current?.open({
                          title: 'Cancel this request?',
                          destructive: true,
                          confirmLabel: 'Cancel request',
                          onConfirm: () => cancel.mutateAsync(req.id),
                        })
                      }
                      style={styles.cancelBtn}
                    />
                  ) : null}
                </Card>
              </Animated.View>
            ))
          )
        ) : null}

        {segment === 'approvals' ? (
          approvals.isPending ? (
            <Skeleton height={200} />
          ) : approvals.isError ? (
            <ErrorState error={approvals.error} onRetry={approvals.refetch} compact />
          ) : (approvals.data || []).length === 0 ? (
            <EmptyState icon={Check} title="Queue is clear" message="No leave requests waiting for your approval." />
          ) : (
            approvals.data.map((req, i) => (
              <Animated.View key={req.id} entering={i < 8 ? FadeInDown.duration(260).delay(i * 35) : undefined}>
                <Card style={styles.requestCard}>
                  <View style={styles.approvalHead}>
                    <Avatar name={req.user?.name} size={36} />
                    <View style={styles.flex}>
                      <AppText variant="bodyStrong" numberOfLines={1}>
                        {req.user?.name || '—'}
                      </AppText>
                      <AppText variant="caption" color="inkMuted">
                        {typeName(req)} · {formatDate(req.fromDate)}
                        {req.toDate && req.toDate !== req.fromDate ? ` → ${formatDate(req.toDate)}` : ''}
                        {req.isHalfDay ? ' · Half day' : ''}
                      </AppText>
                    </View>
                    <AppText variant="micro" color="inkFaint">
                      {relativeTime(req.createdAt)}
                    </AppText>
                  </View>
                  {req.reason ? (
                    <AppText variant="caption" color="inkFaint" numberOfLines={2} style={styles.reason}>
                      "{req.reason}"
                    </AppText>
                  ) : null}
                  <View style={styles.approvalActions}>
                    <Button
                      title="Reject"
                      variant="dangerSoft"
                      size="sm"
                      icon={X}
                      onPress={() =>
                        confirmRef.current?.open({
                          title: `Reject ${req.user?.name}'s leave?`,
                          destructive: true,
                          confirmLabel: 'Reject',
                          onConfirm: () => reject.mutateAsync({ id: req.id }),
                        })
                      }
                      style={styles.flex}
                    />
                    <Button
                      title="Approve"
                      size="sm"
                      icon={Check}
                      loading={approve.isPending}
                      onPress={() =>
                        approve.mutate(req.id, {
                          onSuccess: () => Toast.show({ type: 'success', text1: 'Leave approved' }),
                        })
                      }
                      style={styles.flex}
                    />
                  </View>
                </Card>
              </Animated.View>
            ))
          )
        ) : null}
      </ScrollView>

      {segment !== 'approvals' ? <FAB icon={Umbrella} label="Apply" onPress={() => applyRef.current?.open()} /> : null}
      <ApplySheet ref={applyRef} types={types.data} onDone={refetchAll} />
      <ConfirmSheet ref={confirmRef} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  segmentWrap: { paddingHorizontal: 16, marginBottom: 10 },
  scroll: { paddingHorizontal: 16, paddingBottom: 110 },
  blockTitle: { letterSpacing: 0.8, marginBottom: 10, marginTop: 6 },
  balanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  balanceCell: { width: '47%', flexGrow: 1 },
  balanceCard: { gap: 8 },
  balanceValue: { marginBottom: 2 },
  cardPad: { marginBottom: 14 },
  listCard: { paddingVertical: 4, marginBottom: 14 },
  holidayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  holidayIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  requestCard: { marginBottom: 10 },
  requestHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reason: { marginTop: 6 },
  cancelBtn: { marginTop: 12, alignSelf: 'flex-start' },
  approvalHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  approvalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  field: { marginBottom: 14 },
  halfRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1, marginBottom: 14 },
});
