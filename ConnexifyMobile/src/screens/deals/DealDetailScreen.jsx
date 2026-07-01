import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Animatable from 'react-native-animatable';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../theme/ThemeContext';
import { useDealStore } from '../../store/dealStore';
import { fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import AppHeader from '../../components/navigation/AppHeader';
import SkeletonList from '../../components/feedback/SkeletonList';
import ConfirmSheet from '../../components/misc/ConfirmSheet';

const STAGES = [
  { key: 'new',         label: 'New',         color: '#8B5CF6' },
  { key: 'qualified',   label: 'Qualified',   color: '#3B82F6' },
  { key: 'proposal',    label: 'Proposal',    color: '#06B6D4' },
  { key: 'negotiation', label: 'Negotiation', color: '#F59E0B' },
  { key: 'won',         label: 'Won',         color: '#10B981' },
  { key: 'lost',        label: 'Lost',        color: '#EF4444' },
];

const formatCurrency = (val) => val ? `₹${Number(val).toLocaleString('en-IN')}` : '—';
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const InfoRow = ({ icon, label, value, theme }) => (
  <View style={ir.row}>
    <Icon name={icon} size={18} color={theme.colors.textMuted} />
    <View style={ir.body}>
      <Text style={[ir.label, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[ir.value, { color: theme.colors.textPrimary }]}>{value || '—'}</Text>
    </View>
  </View>
);

const ir = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  body:  { flex: 1 },
  label: { fontSize: fontSize.xs, marginBottom: 2 },
  value: { fontSize: fontSize.base, fontWeight: fontWeight.medium },
});

// ── Stage Picker Sheet ───────────────────────────────────────────
const StagePicker = ({ current, onSelect, theme, sheetRef }) => (
  <BottomSheet
    ref={sheetRef}
    index={-1}
    snapPoints={['45%']}
    enablePanDownToClose
    backgroundStyle={{ backgroundColor: theme.colors.surface }}
    handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
  >
    <BottomSheetScrollView contentContainerStyle={{ padding: spacing.base }}>
      <Text style={[{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: theme.colors.textPrimary, marginBottom: spacing.base }]}>
        Move to Stage
      </Text>
      {STAGES.map((stage) => {
        const active = stage.key === current;
        return (
          <TouchableOpacity
            key={stage.key}
            style={[sp.row, active && { backgroundColor: stage.color + '18' }]}
            onPress={() => { onSelect(stage.key); sheetRef.current?.close(); }}
            activeOpacity={0.8}
          >
            <View style={[sp.dot, { backgroundColor: stage.color }]} />
            <Text style={[sp.label, { color: theme.colors.textPrimary }]}>{stage.label}</Text>
            {active && <Icon name="check" size={18} color={stage.color} />}
          </TouchableOpacity>
        );
      })}
    </BottomSheetScrollView>
  </BottomSheet>
);

const sp = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.base, borderRadius: borderRadius.md, marginBottom: 4 },
  dot:   { width: 12, height: 12, borderRadius: 6 },
  label: { flex: 1, fontSize: fontSize.base, fontWeight: fontWeight.medium },
});

// ── Payment Row ──────────────────────────────────────────────────
const PaymentRow = ({ payment, theme }) => (
  <View style={[pr.row, { borderBottomColor: theme.colors.borderLight }]}>
    <Icon name="cash-multiple" size={18} color={theme.colors.success} />
    <View style={{ flex: 1 }}>
      <Text style={[pr.amount, { color: theme.colors.textPrimary }]}>{formatCurrency(payment.amount)}</Text>
      <Text style={[pr.meta, { color: theme.colors.textMuted }]}>
        {payment.paymentMethod} · {formatDate(payment.paymentDate)}
      </Text>
    </View>
  </View>
);

const pr = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  amount: { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  meta:   { fontSize: fontSize.xs, marginTop: 2 },
});

// ── Main Screen ──────────────────────────────────────────────────
const DealDetailScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const { theme } = useTheme();
  const stageRef   = useRef(null);
  const deleteRef  = useRef(null);

  const { currentDeal: deal, payments, activities, detailLoading, fetchDealDetail, updateStage, deleteDeal } = useDealStore();

  useEffect(() => { fetchDealDetail(id); }, [id]);

  const handleStageChange = async (stage) => {
    try {
      await updateStage(id, stage);
      Toast.show({ type: 'success', text1: `Moved to ${stage}` });
    } catch {
      Toast.show({ type: 'error', text1: 'Stage update failed' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDeal(id);
      Toast.show({ type: 'success', text1: 'Deal deleted' });
      navigation.goBack();
    } catch {
      Toast.show({ type: 'error', text1: 'Delete failed' });
    }
  };

  if (detailLoading || !deal) return <><AppHeader title="Deal Detail" navigation={navigation} /><SkeletonList /></>;

  const stage = STAGES.find((s) => s.key === deal.stage) || STAGES[0];
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <View style={[s.root, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Deal Detail"
        navigation={navigation}
        rightActions={[
          { icon: 'delete-outline', label: 'Delete', onPress: () => deleteRef.current?.expand() },
        ]}
      />

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Hero */}
        <Animatable.View animation="fadeInDown" duration={400}>
          <View style={[s.hero, { backgroundColor: theme.colors.surface }, shadows.card]}>
            <View style={[s.stageBar, { backgroundColor: stage.color }]} />
            <View style={s.heroBody}>
              <Text style={[s.heroTitle, { color: theme.colors.textPrimary }]}>{deal.title}</Text>
              <Text style={[s.heroValue, { color: stage.color }]}>{formatCurrency(deal.value)}</Text>
              <TouchableOpacity
                style={[s.stagePill, { backgroundColor: stage.color + '20' }]}
                onPress={() => stageRef.current?.expand()}
              >
                <View style={[s.stageDot, { backgroundColor: stage.color }]} />
                <Text style={[s.stageLabel, { color: stage.color }]}>{stage.label}</Text>
                <Icon name="pencil" size={13} color={stage.color} />
              </TouchableOpacity>
            </View>
          </View>
        </Animatable.View>

        {/* Info */}
        <View style={[s.card, { backgroundColor: theme.colors.surface }, shadows.card]}>
          <InfoRow icon="account-outline"  label="Linked Lead"      value={deal.Lead?.name}        theme={theme} />
          <InfoRow icon="calendar-outline" label="Expected Close"   value={formatDate(deal.expectedClose)} theme={theme} />
          <InfoRow icon="account-tie"      label="Owner"            value={deal.Owner?.name}        theme={theme} />
          <InfoRow icon="calendar-plus"    label="Created"          value={formatDate(deal.createdAt)} theme={theme} />
        </View>

        {/* Payments */}
        <View style={[s.section, { backgroundColor: theme.colors.surface }, shadows.card]}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: theme.colors.textPrimary }]}>Payments</Text>
            <Text style={[s.sectionMeta, { color: theme.colors.success }]}>{formatCurrency(totalPaid)} received</Text>
          </View>
          {payments.length === 0 ? (
            <Text style={[s.empty, { color: theme.colors.textMuted }]}>No payments recorded</Text>
          ) : (
            payments.map((p) => <PaymentRow key={p.id} payment={p} theme={theme} />)
          )}
        </View>

        {/* Activities */}
        {activities.length > 0 && (
          <View style={[s.section, { backgroundColor: theme.colors.surface }, shadows.card]}>
            <Text style={[s.sectionTitle, { color: theme.colors.textPrimary }]}>Activity</Text>
            {activities.map((act) => (
              <View key={act.id} style={[s.actRow, { borderLeftColor: theme.colors.primary }]}>
                <Text style={[s.actType, { color: theme.colors.primary }]}>{act.type || act.activityType}</Text>
                <Text style={[s.actNote, { color: theme.colors.textSecondary }]} numberOfLines={2}>{act.description || act.notes || '—'}</Text>
                <Text style={[s.actDate, { color: theme.colors.textMuted }]}>{formatDate(act.createdAt)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <StagePicker current={deal.stage} onSelect={handleStageChange} theme={theme} sheetRef={stageRef} />

      <ConfirmSheet
        ref={deleteRef}
        title="Delete Deal"
        message={`Delete "${deal.title}"? This cannot be undone.`}
        danger
        onConfirm={handleDelete}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root:          { flex: 1 },
  scroll:        { padding: spacing.base, paddingBottom: 60, gap: spacing.base },
  hero:          { borderRadius: borderRadius.lg, overflow: 'hidden', flexDirection: 'row' },
  stageBar:      { width: 5 },
  heroBody:      { padding: spacing.base, flex: 1 },
  heroTitle:     { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  heroValue:     { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginTop: 4 },
  stagePill:     { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: borderRadius.full, marginTop: spacing.sm },
  stageDot:      { width: 8, height: 8, borderRadius: 4 },
  stageLabel:    { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  card:          { borderRadius: borderRadius.lg, padding: spacing.base },
  section:       { borderRadius: borderRadius.lg, padding: spacing.base },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle:  { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  sectionMeta:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  empty:         { fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.base },
  actRow:        { borderLeftWidth: 3, paddingLeft: spacing.sm, marginBottom: spacing.sm },
  actType:       { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  actNote:       { fontSize: fontSize.sm, marginTop: 2 },
  actDate:       { fontSize: fontSize.xs, marginTop: 2 },
});

export default DealDetailScreen;
