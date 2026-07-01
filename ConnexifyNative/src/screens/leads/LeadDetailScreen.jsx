import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useTheme } from '../../theme/ThemeContext';
import { useLeadStore } from '../../store/leadStore';
import { activityService } from '../../services/activityService';
import { stageColorMap, priorityColorMap } from '../../theme/colors';
import { fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import { formatDate } from '../../utils/formatters';
import AppHeader from '../../components/navigation/AppHeader';
import StatusBadge from '../../components/misc/StatusBadge';
import ActivityCard from '../../components/cards/ActivityCard';
import ConfirmSheet from '../../components/misc/ConfirmSheet';
import AddActivitySheet from './AddActivitySheet';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import SecondaryButton from '../../components/buttons/SecondaryButton';

const STAGES     = ['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Lost'];
const PRIORITIES = ['High', 'Medium', 'Low'];

// ─── Info row ─────────────────────────────────────────────────────────────
const InfoRow = ({ icon, label, value, theme }) => {
  if (!value) return null;
  return (
    <View style={infoS(theme).row}>
      <Icon name={icon} size={15} color={theme.colors.textMuted} style={infoS(theme).icon} />
      <View>
        <Text style={infoS(theme).label}>{label}</Text>
        <Text style={infoS(theme).value}>{value}</Text>
      </View>
    </View>
  );
};
const infoS = (theme) => StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  icon:  { marginTop: 2, marginRight: spacing.sm, width: 18 },
  label: { fontSize: fontSize.xs, color: theme.colors.textMuted },
  value: { fontSize: fontSize.base, color: theme.colors.textPrimary, fontWeight: fontWeight.medium },
});

// ─── Priority selector sheet ───────────────────────────────────────────────
const PrioritySheet = ({ ref: _ref, sheetRef, current, onSelect, theme }) => {
  const renderBackdrop = useCallback((props) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
  ), []);
  return (
    <BottomSheet ref={sheetRef} index={-1} snapPoints={['30%']} enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
    >
      <BottomSheetView style={{ padding: spacing.base }}>
        <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: theme.colors.textPrimary, marginBottom: spacing.base }}>
          Change Priority
        </Text>
        {PRIORITIES.map((p) => {
          const meta = priorityColorMap[p] || {};
          return (
            <TouchableOpacity
              key={p}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
              }}
              onPress={() => { onSelect(p); sheetRef.current?.close(); }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: meta.text }} />
                <Text style={{ fontSize: fontSize.base, color: theme.colors.textPrimary }}>{p}</Text>
              </View>
              {current === p && <Icon name="check" size={18} color={theme.colors.primary} />}
            </TouchableOpacity>
          );
        })}
      </BottomSheetView>
    </BottomSheet>
  );
};

const LeadDetailScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const stageSheetRef    = useRef(null);
  const prioritySheetRef = useRef(null);
  const activitySheetRef = useRef(null);
  const confirmSheetRef  = useRef(null);
  const pendingStage     = useRef(null);

  const { currentLead, isLoading, fetchLead, updateLead, updateStage } = useLeadStore();
  const [activities, setActivities]   = useState([]);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue]   = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    fetchLead(id);
    loadActivities();
  }, [id]);

  useEffect(() => {
    if (currentLead?.id === id) setNotesValue(currentLead.notes || '');
  }, [currentLead]);

  const loadActivities = async () => {
    try {
      const data = await activityService.getActivities({ leadId: id, limit: 50 });
      setActivities(data?.data?.rows || data?.rows || []);
    } catch (_) {}
  };

  const handleStageSelect = (stage) => {
    pendingStage.current = stage;
    stageSheetRef.current?.close();
    setTimeout(() => confirmSheetRef.current?.expand(), 300);
  };

  const handleStageConfirm = async () => {
    try {
      await updateStage(id, pendingStage.current);
      Toast.show({ type: 'success', text1: `Stage → ${pendingStage.current}` });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to update stage' });
    }
  };

  const handlePrioritySelect = async (priority) => {
    try {
      await updateLead(id, { priority });
      Toast.show({ type: 'success', text1: `Priority → ${priority}` });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to update priority' });
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await updateLead(id, { notes: notesValue });
      setEditingNotes(false);
      Toast.show({ type: 'success', text1: 'Notes saved' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save notes' });
    }
    setSavingNotes(false);
  };

  const renderBackdrop = useCallback((props) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
  ), []);

  const lead = currentLead;
  const s = styles(theme, insets);

  if (!lead) return <View style={s.root}><AppHeader title="Lead" navigation={navigation} /></View>;

  const stageColor    = stageColorMap[lead.stage]?.[isDark ? 'dark' : 'light'] || theme.colors.primary;
  const priorityMeta  = priorityColorMap[lead.priority] || {};

  return (
    <View style={s.root}>
      <AppHeader
        title={lead.name}
        navigation={navigation}
        rightActions={[
          { icon: 'pencil-outline', label: 'Edit', onPress: () => navigation.navigate('EditLead', { id: lead.id }) },
        ]}
      />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Info Card ─────────────────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.nameRow}>
            <Text style={s.name}>{lead.name}</Text>
            <StatusBadge label={lead.stage} color={stageColor} />
          </View>
          <InfoRow icon="phone-outline"       label="Phone"     value={lead.phone}               theme={theme} />
          <InfoRow icon="email-outline"       label="Email"     value={lead.email}               theme={theme} />
          <InfoRow icon="source-branch"       label="Source"    value={lead.source}              theme={theme} />
          <InfoRow icon="account-tie-outline" label="Assigned"  value={lead.assignedTo?.name}    theme={theme} />
          <InfoRow icon="calendar-outline"    label="Follow-up" value={formatDate(lead.nextFollowUp)} theme={theme} />
          <InfoRow icon="calendar-plus"       label="Created"   value={formatDate(lead.createdAt)} theme={theme} />

          {/* Priority inline */}
          <TouchableOpacity
            style={s.priorityRow}
            onPress={() => prioritySheetRef.current?.expand()}
            accessibilityLabel="Change priority"
          >
            <Icon name="flag-outline" size={15} color={theme.colors.textMuted} style={{ marginRight: spacing.sm }} />
            <View>
              <Text style={{ fontSize: fontSize.xs, color: theme.colors.textMuted }}>Priority</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[s.priorityPill, { backgroundColor: priorityMeta.bg }]}>
                  <Text style={[s.priorityText, { color: priorityMeta.text }]}>{lead.priority || 'None'}</Text>
                </View>
                <Icon name="pencil-outline" size={13} color={theme.colors.textMuted} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Stage Selector ────────────────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Stage</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.stageRow}>
            {STAGES.map((stage) => {
              const color  = stageColorMap[stage]?.[isDark ? 'dark' : 'light'] || theme.colors.textMuted;
              const active = lead.stage === stage;
              return (
                <TouchableOpacity
                  key={stage}
                  style={[s.stagePill, { borderColor: color, backgroundColor: active ? color : 'transparent' }]}
                  onPress={() => handleStageSelect(stage)}
                  accessibilityLabel={`Stage: ${stage}`}
                >
                  <Text style={[s.stagePillText, { color: active ? '#fff' : color }]}>{stage}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Notes (inline edit) ───────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.notesHeader}>
            <Text style={s.sectionTitle}>Notes</Text>
            {!editingNotes
              ? <TouchableOpacity onPress={() => setEditingNotes(true)} accessibilityLabel="Edit notes">
                  <Icon name="pencil-outline" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              : <View style={s.notesBtns}>
                  <SecondaryButton title="Cancel" onPress={() => { setEditingNotes(false); setNotesValue(lead.notes || ''); }} style={s.notesBtn} fullWidth={false} />
                  <PrimaryButton title="Save" onPress={handleSaveNotes} loading={savingNotes} style={s.notesBtn} fullWidth={false} />
                </View>
            }
          </View>
          {editingNotes ? (
            <TextInput
              style={[s.notesInput, { color: theme.colors.textPrimary, borderColor: theme.colors.primary }]}
              value={notesValue}
              onChangeText={setNotesValue}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
              placeholder="Add notes..."
              placeholderTextColor={theme.colors.textMuted}
            />
          ) : (
            <TouchableOpacity onPress={() => setEditingNotes(true)} activeOpacity={0.7}>
              <Text style={s.notesText}>
                {lead.notes || <Text style={{ color: theme.colors.textMuted, fontStyle: 'italic' }}>Tap to add notes…</Text>}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Activity Timeline ─────────────────────────────────────── */}
        <Text style={s.timelineTitle}>Activity Timeline ({activities.length})</Text>
        {activities.length === 0 && (
          <Text style={s.noActivity}>No activities yet. Log the first one!</Text>
        )}
        {activities.map((act) => <ActivityCard key={act.id} activity={act} />)}
      </ScrollView>

      {/* ── Bottom Actions ────────────────────────────────────────── */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => lead.phone && Linking.openURL(`tel:${lead.phone}`)}
          accessibilityLabel="Call"
        >
          <Icon name="phone" size={22} color={theme.colors.success} />
          <Text style={[s.actionLabel, { color: theme.colors.success }]}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => {
            if (!lead.phone) return;
            const msg = encodeURIComponent(`Hi ${lead.name}, I'm reaching out regarding your inquiry.`);
            Linking.openURL(`whatsapp://send?phone=${lead.phone}&text=${msg}`);
          }}
          accessibilityLabel="WhatsApp"
        >
          <Icon name="whatsapp" size={22} color="#25D366" />
          <Text style={[s.actionLabel, { color: '#25D366' }]}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, s.logActivity]}
          onPress={() => activitySheetRef.current?.expand()}
          accessibilityLabel="Log Activity"
        >
          <Icon name="lightning-bolt" size={22} color="#fff" />
          <Text style={[s.actionLabel, { color: '#fff' }]}>Log Activity</Text>
        </TouchableOpacity>
      </View>

      {/* ── Sheets ───────────────────────────────────────────────── */}
      <AddActivitySheet ref={activitySheetRef} leadId={id} onSaved={loadActivities} />

      {/* Stage change confirm */}
      <ConfirmSheet
        ref={confirmSheetRef}
        title={`Change stage to "${pendingStage.current}"?`}
        subtitle="This will update the lead's current stage."
        confirmTitle="Confirm"
        icon="swap-horizontal"
        onConfirm={handleStageConfirm}
      />

      {/* Priority sheet */}
      <BottomSheet
        ref={prioritySheetRef}
        index={-1}
        snapPoints={['35%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
      >
        <BottomSheetView style={{ padding: spacing.base }}>
          <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: theme.colors.textPrimary, marginBottom: spacing.base }}>
            Change Priority
          </Text>
          {PRIORITIES.map((p) => {
            const meta = priorityColorMap[p] || {};
            return (
              <TouchableOpacity
                key={p}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight }}
                onPress={() => { handlePrioritySelect(p); prioritySheetRef.current?.close(); }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: meta.text }} />
                  <Text style={{ fontSize: fontSize.base, color: theme.colors.textPrimary }}>{p}</Text>
                </View>
                {lead.priority === p && <Icon name="check" size={18} color={theme.colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </BottomSheetView>
      </BottomSheet>

      {/* Stage selector sheet */}
      <BottomSheet
        ref={stageSheetRef}
        index={-1}
        snapPoints={['50%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
      >
        <BottomSheetView style={{ padding: spacing.base }}>
          <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: theme.colors.textPrimary, marginBottom: spacing.base }}>
            Change Stage
          </Text>
          {STAGES.map((stage) => {
            const color = stageColorMap[stage]?.[isDark ? 'dark' : 'light'] || theme.colors.primary;
            return (
              <TouchableOpacity
                key={stage}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight }}
                onPress={() => handleStageSelect(stage)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
                  <Text style={{ fontSize: fontSize.base, color: theme.colors.textPrimary }}>{stage}</Text>
                </View>
                {lead.stage === stage && <Icon name="check" size={18} color={theme.colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
};

const styles = (theme, insets) => StyleSheet.create({
  root:     { flex: 1, backgroundColor: theme.colors.background },
  scroll:   { flex: 1 },
  content:  { padding: spacing.base, paddingBottom: 100 },
  card:     { backgroundColor: theme.colors.surface, borderRadius: borderRadius.lg, padding: spacing.base, marginBottom: spacing.md, ...shadows.card },
  nameRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  name:     { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: theme.colors.textPrimary, flex: 1, marginRight: spacing.sm },
  priorityRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.sm },
  priorityPill:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  priorityText:{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  sectionTitle:{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: theme.colors.textPrimary, marginBottom: spacing.sm },
  stageRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  stagePill:{ paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: borderRadius.full, borderWidth: 1.5 },
  stagePillText:{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  notesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  notesBtns:   { flexDirection: 'row', gap: spacing.sm },
  notesBtn:    { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  notesInput: {
    borderWidth: 1.5, borderRadius: borderRadius.md,
    padding: spacing.sm, fontSize: fontSize.base, minHeight: 100,
    backgroundColor: theme.colors.background,
  },
  notesText:    { fontSize: fontSize.base, color: theme.colors.textSecondary, lineHeight: 22 },
  timelineTitle:{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: theme.colors.textPrimary, marginBottom: spacing.sm },
  noActivity:   { fontSize: fontSize.sm, color: theme.colors.textMuted, fontStyle: 'italic', marginBottom: spacing.base },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1, borderTopColor: theme.colors.borderLight,
    paddingTop: spacing.sm, paddingHorizontal: spacing.base, gap: spacing.sm,
  },
  actionBtn:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.md, gap: 4 },
  logActivity: { backgroundColor: theme.colors.primary },
  actionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});

export default LeadDetailScreen;
