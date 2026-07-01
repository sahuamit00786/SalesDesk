import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useDrawer } from '../../context/DrawerContext';
import { useDealStore } from '../../store/dealStore';
import { fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import FAB from '../../components/buttons/FAB';
import EmptyState from '../../components/feedback/EmptyState';
import ErrorState from '../../components/feedback/ErrorState';
import SkeletonList from '../../components/feedback/SkeletonList';
import AddDealSheet from './AddDealSheet';

const STAGES = [
  { key: 'new',         label: 'New',         color: '#8B5CF6' },
  { key: 'qualified',   label: 'Qualified',   color: '#3B82F6' },
  { key: 'proposal',    label: 'Proposal',    color: '#06B6D4' },
  { key: 'negotiation', label: 'Negotiation', color: '#F59E0B' },
  { key: 'won',         label: 'Won',         color: '#10B981' },
  { key: 'lost',        label: 'Lost',        color: '#EF4444' },
];

const formatCurrency = (val) => {
  if (!val) return '—';
  return `₹${Number(val).toLocaleString('en-IN')}`;
};

// ── Deal Card ─────────────────────────────────────────────────────────────────
const DealCard = ({ deal, stageColor, onPress, theme }) => (
  <TouchableOpacity
    style={[dc.card, { backgroundColor: theme.colors.surface }, shadows.card]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={[dc.accent, { backgroundColor: stageColor }]} />
    <View style={dc.body}>
      <Text style={[dc.title, { color: theme.colors.textPrimary }]} numberOfLines={1}>
        {deal.title || 'Untitled Deal'}
      </Text>
      <Text style={[dc.value, { color: stageColor }]}>{formatCurrency(deal.value)}</Text>
      {deal.Lead && (
        <Text style={[dc.lead, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {deal.Lead.name}
        </Text>
      )}
      {deal.expectedClose && (
        <Text style={[dc.date, { color: theme.colors.textMuted }]}>
          Close: {new Date(deal.expectedClose).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </Text>
      )}
    </View>
    <Icon name="chevron-right" size={18} color={theme.colors.textMuted} />
  </TouchableOpacity>
);

const dc = StyleSheet.create({
  card:   { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.lg, marginBottom: spacing.sm, overflow: 'hidden' },
  accent: { width: 4, alignSelf: 'stretch' },
  body:   { flex: 1, padding: spacing.base },
  title:  { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  value:  { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginTop: 2 },
  lead:   { fontSize: fontSize.sm, marginTop: 2 },
  date:   { fontSize: fontSize.xs, marginTop: 2 },
});

// ── Stage Column ──────────────────────────────────────────────────────────────
const StageColumn = ({ stage, deals, navigation, theme }) => (
  <View style={[col.wrap, { backgroundColor: theme.colors.surface + 'cc', borderColor: theme.colors.borderLight }]}>
    <View style={[col.header, { borderBottomColor: stage.color }]}>
      <View style={[col.dot, { backgroundColor: stage.color }]} />
      <Text style={[col.label, { color: theme.colors.textPrimary }]}>{stage.label}</Text>
      <View style={[col.countBadge, { backgroundColor: stage.color + '18' }]}>
        <Text style={[col.count, { color: stage.color }]}>{deals.length}</Text>
      </View>
    </View>
    {deals.map((deal) => (
      <Animatable.View key={deal.id} animation="fadeInUp" duration={280}>
        <DealCard
          deal={deal}
          stageColor={stage.color}
          theme={theme}
          onPress={() => navigation.navigate('DealDetail', { id: deal.id })}
        />
      </Animatable.View>
    ))}
    {deals.length === 0 && (
      <Text style={[col.empty, { color: theme.colors.textMuted }]}>No deals</Text>
    )}
  </View>
);

const col = StyleSheet.create({
  wrap:       { width: 248, borderRadius: borderRadius.lg, borderWidth: 1, padding: spacing.base, marginRight: spacing.base },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.base, borderBottomWidth: 2, paddingBottom: spacing.sm },
  dot:        { width: 10, height: 10, borderRadius: 5 },
  label:      { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  count:      { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  empty:      { fontSize: fontSize.xs, textAlign: 'center', paddingVertical: spacing.base },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
const DealsScreen = ({ navigation }) => {
  const { theme }      = useTheme();
  const insets         = useSafeAreaInsets();
  const { openDrawer } = useDrawer();
  const addRef         = useRef(null);

  const { deals, isLoading, isRefreshing, error, refresh } = useDealStore();

  useEffect(() => { refresh(); }, []);

  const grouped = STAGES.reduce((acc, s) => {
    acc[s.key] = deals.filter((d) => d.stage === s.key);
    return acc;
  }, {});

  const totalValue = deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  if (isLoading && deals.length === 0) return <SkeletonList />;
  if (error && deals.length === 0) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <View style={[s.root, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.colors.surface, paddingTop: insets.top + spacing.xs, borderBottomColor: theme.colors.border }]}>
        <View style={s.titleRow}>
          <TouchableOpacity style={s.menuBtn} onPress={openDrawer} accessibilityLabel="Open menu">
            <Icon name="menu" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={s.titleBlock}>
            <Text style={[s.title, { color: theme.colors.textPrimary }]}>Deals Pipeline</Text>
            <View style={s.meta}>
              <Text style={[s.metaLabel, { color: theme.colors.textSecondary }]}>{deals.length} deals</Text>
              <Text style={[s.metaDot,  { color: theme.colors.textMuted }]}>·</Text>
              <Text style={[s.metaValue,{ color: theme.colors.primary }]}>{formatCurrency(totalValue)} total</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Kanban board */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={theme.colors.primary} />
        }
        contentContainerStyle={[s.kanban, { paddingBottom: insets.bottom + 90 }]}
      >
        {STAGES.map((stage) => (
          <StageColumn
            key={stage.key}
            stage={stage}
            deals={grouped[stage.key] || []}
            navigation={navigation}
            theme={theme}
          />
        ))}
      </ScrollView>

      {deals.length === 0 && !isLoading && (
        <EmptyState
          icon="briefcase-outline"
          title="No deals yet"
          subtitle="Create your first deal to start tracking your pipeline"
          ctaTitle="Add Deal"
          onCta={() => addRef.current?.expand()}
        />
      )}

      <FAB icon="plus" onPress={() => addRef.current?.expand()} />

      <AddDealSheet ref={addRef} onSaved={refresh} />
    </View>
  );
};

const s = StyleSheet.create({
  root:       { flex: 1 },
  header:     {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  titleRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  menuBtn:    { padding: spacing.xs, borderRadius: 8 },
  titleBlock: { flex: 1 },
  title:      { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  meta:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaLabel:  { fontSize: fontSize.sm },
  metaDot:    { fontSize: fontSize.sm },
  metaValue:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  kanban:     { padding: spacing.base, paddingRight: 0 },
});

export default DealsScreen;
