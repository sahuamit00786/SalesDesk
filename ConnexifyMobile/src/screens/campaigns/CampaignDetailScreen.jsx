import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  FlatList, ActivityIndicator, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../theme/ThemeContext';
import { useCampaignStore } from '../../store/campaignStore';
import { campaignService } from '../../services/campaignService';
import { fontSize, fontWeight, spacing, borderRadius } from '../../theme';
import AppHeader from '../../components/navigation/AppHeader';
import StatCard from '../../components/cards/StatCard';
import EmptyState from '../../components/feedback/EmptyState';
import ConfirmSheet from '../../components/misc/ConfirmSheet';
import FAB from '../../components/buttons/FAB';
import AddPaymentSheet from './AddPaymentSheet';
import AddLeadToCampaignSheet from './AddLeadToCampaignSheet';
import { formatDate, formatDateTime } from '../../utils/formatters';

const TAB_LEADS    = 'leads';
const TAB_PAYMENTS = 'payments';

const STATUS_COLORS = {
  active:    '#10B981',
  draft:     '#94A3B8',
  paused:    '#F59E0B',
  completed: '#4F46E5',
  cancelled: '#EF4444',
};

const PAYMENT_METHOD_ICONS = {
  Cash: 'cash',
  UPI: 'qrcode',
  'Bank Transfer': 'bank',
  Cheque: 'checkbook',
  Card: 'credit-card',
  Other: 'help-circle',
};

// ── Lead row ────────────────────────────────────────────────────
const LeadRow = ({ item, theme, onAddPayment, onRemove }) => {
  const lead = item.Lead || item;
  const amount = Number(item.amountReceived || 0);
  return (
    <View style={[lr.row, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.borderLight }]}>
      <View style={lr.info}>
        <Text style={[lr.name, { color: theme.colors.textPrimary }]}>{lead.name}</Text>
        <Text style={[lr.sub, { color: theme.colors.textMuted }]}>
          {lead.phone || lead.email || lead.stage || ''}
        </Text>
      </View>
      <View style={lr.right}>
        {amount > 0 && (
          <Text style={[lr.amount, { color: '#10B981' }]}>₹{amount.toLocaleString()}</Text>
        )}
        <View style={lr.actions}>
          <TouchableOpacity style={[lr.btn, { backgroundColor: theme.colors.primaryLight }]} onPress={() => onAddPayment(item)}>
            <Icon name="cash-plus" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[lr.btn, { backgroundColor: '#FEE2E2' }]} onPress={() => onRemove(item)}>
            <Icon name="account-remove-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const lr = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', padding: spacing.base, borderBottomWidth: 1 },
  info:    { flex: 1 },
  name:    { fontSize: fontSize.base, fontWeight: fontWeight.medium },
  sub:     { fontSize: fontSize.sm, marginTop: 2 },
  right:   { alignItems: 'flex-end', gap: 4 },
  amount:  { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  actions: { flexDirection: 'row', gap: 6 },
  btn:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});

// ── Payment row ─────────────────────────────────────────────────
const PaymentRow = ({ payment, theme }) => {
  const methodIcon = PAYMENT_METHOD_ICONS[payment.paymentMethod] || 'cash';
  return (
    <View style={[pr.row, { borderBottomColor: theme.colors.borderLight }]}>
      <View style={[pr.iconBox, { backgroundColor: theme.colors.primaryLight }]}>
        <Icon name={methodIcon} size={18} color={theme.colors.primary} />
      </View>
      <View style={pr.info}>
        <Text style={[pr.name, { color: theme.colors.textPrimary }]}>{payment.Lead?.name || payment.leadName || 'Lead'}</Text>
        <Text style={[pr.sub, { color: theme.colors.textMuted }]}>
          {payment.paymentMethod} · {formatDate(payment.paymentDate)}
        </Text>
        {!!payment.notes && <Text style={[pr.notes, { color: theme.colors.textSecondary }]}>{payment.notes}</Text>}
      </View>
      <Text style={[pr.amount, { color: '#10B981' }]}>₹{Number(payment.amount).toLocaleString()}</Text>
    </View>
  );
};

const pr = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', padding: spacing.base, borderBottomWidth: 1, gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  info:    { flex: 1 },
  name:    { fontSize: fontSize.base, fontWeight: fontWeight.medium },
  sub:     { fontSize: fontSize.sm, marginTop: 1 },
  notes:   { fontSize: fontSize.xs, marginTop: 2 },
  amount:  { fontSize: fontSize.base, fontWeight: fontWeight.bold },
});

// ── Main screen ─────────────────────────────────────────────────
const CampaignDetailScreen = ({ navigation, route }) => {
  const { id, name } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const { currentCampaign, campaignLeads, leadsLoading, fetchCampaignDetail, removeLeadFromCampaign, refreshCampaignLeads } = useCampaignStore();

  const [activeTab, setActiveTab]   = useState(TAB_LEADS);
  const [payments, setPayments]     = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [selectedLead, setSelectedLead]       = useState(null);

  const paymentRef  = useRef(null);
  const addLeadRef  = useRef(null);
  const confirmRef  = useRef(null);
  const removeTarget = useRef(null);

  useEffect(() => { fetchCampaignDetail(id); }, [id]);

  const fetchAllPayments = useCallback(async () => {
    if (!campaignLeads.length) { setPayments([]); return; }
    setPaymentsLoading(true);
    try {
      const results = await Promise.allSettled(
        campaignLeads.map((l) => campaignService.getPayments(id, l.id || l.Lead?.id))
      );
      const all = results.flatMap((r, i) => {
        if (r.status !== 'fulfilled') return [];
        const rows = r.value?.data?.rows || r.value?.rows || r.value?.data || [];
        const lead = campaignLeads[i];
        return rows.map((p) => ({ ...p, Lead: lead.Lead || lead }));
      });
      all.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
      setPayments(all);
    } catch { setPayments([]); }
    finally { setPaymentsLoading(false); }
  }, [id, campaignLeads]);

  useEffect(() => {
    if (activeTab === TAB_PAYMENTS && campaignLeads.length) fetchAllPayments();
  }, [activeTab, campaignLeads]);

  const campaign = currentCampaign;
  const statusColor = STATUS_COLORS[campaign?.status?.toLowerCase()] || '#94A3B8';
  const totalPaid = campaignLeads.reduce((acc, l) => acc + Number(l.amountReceived || 0), 0);
  const budget = Number(campaign?.budget || 0);

  const handleRemoveLead = (item) => {
    removeTarget.current = item;
    confirmRef.current?.expand();
  };

  const doRemove = async () => {
    const item = removeTarget.current;
    if (!item) return;
    const leadId = item.id || item.Lead?.id;
    try {
      await removeLeadFromCampaign(id, leadId);
      Toast.show({ type: 'success', text1: 'Lead removed' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to remove lead' });
    }
  };

  const handlePaymentSaved = () => {
    refreshCampaignLeads(id);
    if (activeTab === TAB_PAYMENTS) fetchAllPayments();
  };

  const FABActions = [
    { icon: 'account-plus-outline', label: 'Add Lead', onPress: () => addLeadRef.current?.expand() },
    ...(selectedLead ? [{ icon: 'cash-plus', label: 'Add Payment', onPress: () => paymentRef.current?.expand() }] : []),
  ];

  return (
    <View style={[s.root, { backgroundColor: theme.colors.background }]}>
      <AppHeader title={name || campaign?.name || 'Campaign'} navigation={navigation} />

      {/* Campaign info banner */}
      {campaign && (
        <View style={[s.banner, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.borderLight }]}>
          <View style={s.bannerTop}>
            <View style={[s.statusPill, { backgroundColor: statusColor + '22' }]}>
              <Text style={[s.statusText, { color: statusColor }]}>{campaign.status || 'Draft'}</Text>
            </View>
            {!!campaign.startDate && (
              <Text style={[s.dateText, { color: theme.colors.textMuted }]}>
                {formatDate(campaign.startDate)}{campaign.endDate ? ` – ${formatDate(campaign.endDate)}` : ''}
              </Text>
            )}
          </View>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={[s.statVal, { color: theme.colors.textPrimary }]}>{campaignLeads.length}</Text>
              <Text style={[s.statLabel, { color: theme.colors.textMuted }]}>Leads</Text>
            </View>
            {budget > 0 && (
              <View style={s.statItem}>
                <Text style={[s.statVal, { color: theme.colors.textPrimary }]}>₹{budget.toLocaleString()}</Text>
                <Text style={[s.statLabel, { color: theme.colors.textMuted }]}>Budget</Text>
              </View>
            )}
            <View style={s.statItem}>
              <Text style={[s.statVal, { color: '#10B981' }]}>₹{totalPaid.toLocaleString()}</Text>
              <Text style={[s.statLabel, { color: theme.colors.textMuted }]}>Collected</Text>
            </View>
            {budget > 0 && (
              <View style={s.statItem}>
                <Text style={[s.statVal, { color: budget > 0 && totalPaid >= budget ? '#10B981' : '#F59E0B' }]}>
                  {budget > 0 ? Math.round((totalPaid / budget) * 100) : 0}%
                </Text>
                <Text style={[s.statLabel, { color: theme.colors.textMuted }]}>Achieved</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={[s.tabs, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.borderLight }]}>
        {[TAB_LEADS, TAB_PAYMENTS].map((tab) => (
          <TouchableOpacity key={tab} style={s.tab} onPress={() => setActiveTab(tab)}>
            <Text style={[s.tabText, { color: activeTab === tab ? theme.colors.primary : theme.colors.textMuted, fontWeight: activeTab === tab ? fontWeight.bold : fontWeight.regular }]}>
              {tab === TAB_LEADS ? `Leads (${campaignLeads.length})` : 'Payments'}
            </Text>
            {activeTab === tab && <View style={[s.tabUnderline, { backgroundColor: theme.colors.primary }]} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === TAB_LEADS && (
        leadsLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : campaignLeads.length === 0 ? (
          <EmptyState
            icon="account-group-outline"
            title="No leads in this campaign"
            subtitle="Add leads using the + button below"
            ctaTitle="Add Leads"
            onCta={() => addLeadRef.current?.expand()}
          />
        ) : (
          <FlatList
            data={campaignLeads}
            keyExtractor={(item) => item.id || item.Lead?.id}
            renderItem={({ item }) => (
              <LeadRow
                item={item}
                theme={theme}
                onAddPayment={(lead) => { setSelectedLead(lead); paymentRef.current?.expand(); }}
                onRemove={handleRemoveLead}
              />
            )}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )
      )}

      {activeTab === TAB_PAYMENTS && (
        paymentsLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : payments.length === 0 ? (
          <EmptyState
            icon="cash-remove"
            title="No payments yet"
            subtitle="Tap the cash+ icon on a lead to record payment"
          />
        ) : (
          <FlatList
            data={payments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <PaymentRow payment={item} theme={theme} />}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )
      )}

      <FAB
        icon="plus"
        actions={[
          { icon: 'account-plus-outline', label: 'Add Lead',    onPress: () => addLeadRef.current?.expand() },
        ]}
      />

      <AddPaymentSheet
        ref={paymentRef}
        campaignId={id}
        lead={selectedLead}
        onSaved={handlePaymentSaved}
      />

      <AddLeadToCampaignSheet
        ref={addLeadRef}
        campaignId={id}
        existingLeadIds={campaignLeads.map((l) => l.id || l.Lead?.id).filter(Boolean)}
        onSaved={() => fetchCampaignDetail(id)}
      />

      <ConfirmSheet
        ref={confirmRef}
        title="Remove Lead?"
        subtitle="This will remove the lead from this campaign."
        confirmTitle="Remove"
        dangerous
        icon="account-remove-outline"
        onConfirm={doRemove}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root:        { flex: 1 },
  banner:      { padding: spacing.base, borderBottomWidth: 1 },
  bannerTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  statusPill:  { paddingHorizontal: 10, paddingVertical: 3, borderRadius: borderRadius.full },
  statusText:  { fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'capitalize' },
  dateText:    { fontSize: fontSize.xs },
  statsRow:    { flexDirection: 'row', gap: spacing.lg },
  statItem:    { alignItems: 'center' },
  statVal:     { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  statLabel:   { fontSize: fontSize.xs, marginTop: 1 },
  tabs:        { flexDirection: 'row', borderBottomWidth: 1 },
  tab:         { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabText:     { fontSize: fontSize.sm },
  tabUnderline:{ position: 'absolute', bottom: 0, height: 2, width: '60%', borderRadius: 1 },
});

export default CampaignDetailScreen;
