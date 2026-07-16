import React, { useRef, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Avatar from '../../../design-system/components/Avatar';
import Badge from '../../../design-system/components/Badge';
import IconButton from '../../../design-system/components/IconButton';
import { UnderlineTabs } from '../../../design-system/components/SegmentedTabs';
import { SkeletonDetail } from '../../../design-system/components/Skeleton';
import ErrorState from '../../../design-system/components/ErrorState';
import SelectSheet from '../../../design-system/components/SelectSheet';
import ConfirmSheet from '../../../design-system/components/ConfirmSheet';
import FAB from '../../../design-system/components/FAB';
import {
  Phone,
  MessageCircle,
  Mail,
  Pencil,
  Trash2,
  ChevronDown,
  Briefcase,
  Plus,
} from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import {
  useLeadDetail,
  useLeadSub,
  useLeadMutations,
  useLeadSubMutations,
  useLeadFormMeta,
  useDuplicates,
  useDuplicateMutations,
  useLeadDocuments,
  useLeadDocumentMutations,
  useLogLeadCall,
} from '../hooks';
import { useLeadCalls } from '../../calls/hooks';
import { useIsManagerOrAdmin } from '../../../hooks/permissions';
import { STATUS_LABELS, STATUS_OPTIONS } from '../constants';
import { OverviewTab, CallsTab, NotesTab, TasksTab, FollowupsTab, FilesTab } from '../components/LeadDetailTabs';
import { AddActivitySheet, AddCallSheet, AddNoteSheet, AddTaskSheet, AddFollowupSheet } from '../components/LeadAddSheets';
import LeadTagPicker from '../components/LeadTagPicker';
import LeadFileUpload from '../components/LeadFileUpload';
import TimelineTab from '../components/TimelineTab';
import Card from '../../../design-system/components/Card';
import Button from '../../../design-system/components/Button';
import { formatMoney } from '../../../utils/format';
import { ROUTES } from '../../../navigation/routes';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'calls', label: 'Calls' },
  { key: 'notes', label: 'Notes' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'followups', label: 'Follow-ups' },
  { key: 'files', label: 'Files' },
];

function QuickAction({ icon: Icon, label, onPress, color }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.quickAction}>
      <View style={[styles.quickIcon, { backgroundColor: `${color}1A`, borderRadius: theme.radius.lg }]}>
        <Icon size={20} color={color} strokeWidth={2.2} />
      </View>
      <AppText variant="micro" color="inkMuted">
        {label}
      </AppText>
    </Pressable>
  );
}

export default function LeadDetailScreen({ navigation, route }) {
  const theme = useTheme();
  const leadId = route.params?.leadId || route.params?.id;
  const [tab, setTab] = useState('overview');

  const detail = useLeadDetail(leadId);
  const lead = detail.data?.lead;

  const activities = useLeadSub(leadId, 'activities');
  const calls = useLeadCalls(leadId);
  const notes = useLeadSub(leadId, 'notes');
  const tasks = useLeadSub(leadId, 'tasks');
  const followups = useLeadSub(leadId, 'followups');
  const files = useLeadDocuments(leadId);

  const { patchStatus, remove, convertToOpportunity, patchPipelineStatus } = useLeadMutations();
  const sub = useLeadSubMutations(leadId);
  const docs = useLeadDocumentMutations(leadId);
  const logCall = useLogLeadCall(leadId);
  const formMeta = useLeadFormMeta();

  const canManage = useIsManagerOrAdmin();
  const dups = useDuplicates(); // workspace-scoped; filtered to this lead client-side below
  const { merge, dismiss } = useDuplicateMutations();
  const dup = (dups.data || []).find((d) => d.matchedLeadId === leadId && d.status === 'pending');

  const statusRef = useRef(null);
  const confirmRef = useRef(null);
  const activitySheetRef = useRef(null);
  const callSheetRef = useRef(null);
  const noteSheetRef = useRef(null);
  const taskSheetRef = useRef(null);
  const followupSheetRef = useRef(null);

  const phone = lead?.phone ? `${lead.phoneCountryCode || ''}${lead.phone}` : '';
  const wa = (lead?.profileMeta?.whatsappNumber || phone).replace(/[^\d]/g, '');

  const openStatusSheet = () =>
    statusRef.current?.open({
      title: 'Change status',
      value: lead?.status,
      options: STATUS_OPTIONS.map((v) => ({ value: v, label: STATUS_LABELS[v] })),
      onChange: (status) =>
        patchStatus.mutate(
          { id: leadId, status },
          { onSuccess: () => Toast.show({ type: 'success', text1: `Status set to ${STATUS_LABELS[status]}` }) },
        ),
    });

  const openStageSheet = () =>
    statusRef.current?.open({
      title: 'Move to stage',
      value: lead?.pipelineStatus || lead?.pipelineStatusInfo?.id,
      options: (formMeta.data?.pipelineStatuses || []).map((st) => ({ value: st.id, label: st.name })),
      onChange: (pipelineStatusId, option) =>
        patchPipelineStatus.mutate(
          { id: leadId, pipelineStatusId },
          { onSuccess: () => Toast.show({ type: 'success', text1: `Moved to ${option?.label || 'stage'}` }) },
        ),
    });

  const confirmDelete = () =>
    confirmRef.current?.open({
      title: 'Delete this lead?',
      message: `${lead?.contactName || 'This lead'} will be removed from your workspace.`,
      destructive: true,
      onConfirm: async () => {
        await remove.mutateAsync(leadId);
        Toast.show({ type: 'success', text1: 'Lead deleted' });
        navigation.goBack();
      },
    });

  const markAsOpportunity = () =>
    confirmRef.current?.open({
      title: 'Mark as opportunity?',
      message: 'This lead will appear in your opportunities pipeline.',
      confirmLabel: 'Convert',
      onConfirm: async () => {
        await convertToOpportunity.mutateAsync({ id: leadId, body: { isOpportunity: true } });
        Toast.show({ type: 'success', text1: 'Moved to opportunities' });
      },
    });

  const fabForTab = {
    timeline: () => activitySheetRef.current?.open(),
    calls: () => callSheetRef.current?.open(),
    notes: () => noteSheetRef.current?.open(),
    tasks: () => taskSheetRef.current?.open(),
    followups: () => followupSheetRef.current?.open(),
  }[tab];

  if (detail.isPending) {
    return (
      <ScreenScaffold>
        <AppHeader title="Lead" />
        <SkeletonDetail />
      </ScreenScaffold>
    );
  }

  if (detail.isError || !lead) {
    return (
      <ScreenScaffold>
        <AppHeader title="Lead" />
        <ErrorState error={detail.error} onRetry={detail.refetch} />
      </ScreenScaffold>
    );
  }

  const name = lead.contactName || lead.title || 'Untitled lead';

  return (
    <ScreenScaffold>
      <AppHeader
        title={name}
        right={
          <>
            <IconButton
              icon={Pencil}
              accessibilityLabel="Edit lead"
              onPress={() => navigation.navigate(ROUTES.EDIT_LEAD, { leadId, lead })}
            />
            <IconButton icon={Trash2} accessibilityLabel="Delete lead" onPress={confirmDelete} color={theme.colors.danger} />
          </>
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={detail.isRefetching} onRefresh={detail.refetch} tintColor={theme.brand} colors={[theme.brand]} />
        }
        stickyHeaderIndices={[1]}
      >
        {/* Hero */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.hero}>
          <Avatar name={name} size={64} />
          <AppText variant="heading" style={styles.heroName} numberOfLines={1}>
            {name}
          </AppText>
          {lead.company ? (
            <AppText variant="body" color="inkMuted" numberOfLines={1}>
              {lead.designation ? `${lead.designation} · ` : ''}
              {lead.company}
            </AppText>
          ) : null}
          <View style={styles.heroMeta}>
            <Pressable onPress={openStatusSheet} accessibilityRole="button" accessibilityLabel="Change status" style={styles.statusTap}>
              <Badge label={STATUS_LABELS[lead.status] || lead.status} status={lead.status} />
              <ChevronDown size={14} color={theme.colors.inkFaint} strokeWidth={2.4} />
            </Pressable>
            {lead.isOpportunity ? (
              <Pressable onPress={openStageSheet} accessibilityRole="button" accessibilityLabel="Move stage" style={styles.statusTap}>
                <Badge label={lead.pipelineStatusInfo?.name || 'Pipeline'} tone="brand" />
                <ChevronDown size={14} color={theme.colors.inkFaint} strokeWidth={2.4} />
              </Pressable>
            ) : null}
            {Number(lead.value) > 0 ? (
              <AppText variant="bodyStrong">{formatMoney(lead.value, lead.valueCurrency || theme.currency, { compact: true })}</AppText>
            ) : null}
          </View>

          <View style={styles.quickRow}>
            {phone ? <QuickAction icon={Phone} label="Call" color="#0D9488" onPress={() => Linking.openURL(`tel:${phone}`).catch(() => {})} /> : null}
            {wa ? (
              <QuickAction icon={MessageCircle} label="WhatsApp" color="#15803D" onPress={() => Linking.openURL(`https://wa.me/${wa}`).catch(() => {})} />
            ) : null}
            {lead.email ? <QuickAction icon={Mail} label="Email" color="#0284C7" onPress={() => Linking.openURL(`mailto:${lead.email}`).catch(() => {})} /> : null}
            {!lead.isOpportunity ? <QuickAction icon={Briefcase} label="To pipeline" color={theme.brand} onPress={markAsOpportunity} /> : null}
          </View>
        </Animated.View>

        {canManage && dup ? (
          <Card style={styles.dupCard}>
            <AppText variant="body" weight="600">Possible duplicate detected</AppText>
            <AppText variant="caption" color="muted">
              A new submission matched this lead on {dup.matchField || 'a field'} ({dup.matchedLeadTitle || name}).
            </AppText>
            <View style={styles.dupActions}>
              <Button
                title="Merge"
                size="sm"
                onPress={() => merge.mutate({ dupId: dup.id, body: { fieldSelections: {} } })}
              />
              <Button title="Dismiss" size="sm" variant="ghost" onPress={() => dismiss.mutate(dup.id)} />
            </View>
          </Card>
        ) : null}

        {/* Sticky tabs */}
        <View style={{ backgroundColor: theme.colors.page }}>
          <UnderlineTabs
            tabs={TABS.map((t) => ({
              ...t,
              count:
                t.key === 'tasks'
                  ? tasks.data?.length || undefined
                  : t.key === 'notes'
                    ? notes.data?.length || undefined
                    : undefined,
            }))}
            value={tab}
            onChange={setTab}
          />
        </View>

        <View style={styles.tabBody}>
          {tab === 'overview' ? (
            <>
              <OverviewTab lead={lead} currency={theme.currency} />
              <LeadTagPicker lead={lead} availableTags={formMeta.data?.tags || []} />
            </>
          ) : null}
          {tab === 'timeline' ? (
            <TimelineTab
              activities={activities.data || []}
              calls={calls.data || []}
              loading={activities.isPending || calls.isPending}
            />
          ) : null}
          {tab === 'calls' ? <CallsTab items={calls.data || []} loading={calls.isPending} /> : null}
          {tab === 'notes' ? (
            <NotesTab
              items={notes.data || []}
              loading={notes.isPending}
              onDelete={(note) =>
                confirmRef.current?.open({
                  title: 'Delete note?',
                  destructive: true,
                  onConfirm: () => sub.deleteNote.mutateAsync(note.id),
                })
              }
            />
          ) : null}
          {tab === 'tasks' ? (
            <TasksTab
              items={tasks.data || []}
              loading={tasks.isPending}
              onToggle={(task) =>
                sub.updateTask.mutate({
                  taskId: task.id,
                  body: { status: task.status === 'completed' ? 'pending' : 'completed' },
                })
              }
              onDelete={(task) =>
                confirmRef.current?.open({
                  title: 'Delete task?',
                  destructive: true,
                  onConfirm: () => sub.deleteTask.mutateAsync(task.id),
                })
              }
            />
          ) : null}
          {tab === 'followups' ? (
            <FollowupsTab
              items={followups.data || []}
              loading={followups.isPending}
              onToggle={(fu) => sub.updateFollowup.mutate({ followupId: fu.id, body: { status: 'done' } })}
              onDelete={(fu) =>
                confirmRef.current?.open({
                  title: 'Delete follow-up?',
                  destructive: true,
                  onConfirm: () => sub.deleteFollowup.mutateAsync(fu.id),
                })
              }
            />
          ) : null}
          {tab === 'files' ? (
            <>
              <LeadFileUpload leadId={lead.id} onUploaded={files.refetch} />
              <FilesTab
                items={files.data || []}
                loading={files.isPending}
                onDelete={(file) =>
                  confirmRef.current?.open({
                    title: `Delete "${file.name || 'this file'}"?`,
                    destructive: true,
                    onConfirm: () => docs.remove.mutateAsync(file.id),
                  })
                }
              />
            </>
          ) : null}
        </View>
      </ScrollView>

      {fabForTab ? <FAB icon={Plus} accessibilityLabel="Add" onPress={fabForTab} /> : null}

      <SelectSheet ref={statusRef} />
      <ConfirmSheet ref={confirmRef} />
      <AddActivitySheet ref={activitySheetRef} mutation={sub.addActivity} />
      <AddCallSheet ref={callSheetRef} mutation={logCall} />
      <AddNoteSheet ref={noteSheetRef} mutation={sub.addNote} />
      <AddTaskSheet ref={taskSheetRef} mutation={sub.addTask} />
      <AddFollowupSheet ref={followupSheetRef} mutation={sub.addFollowup} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 110 },
  hero: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 4, paddingBottom: 16 },
  heroName: { marginTop: 12, textAlign: 'center' },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  statusTap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  quickRow: { flexDirection: 'row', gap: 22, marginTop: 18 },
  quickAction: { alignItems: 'center', gap: 5 },
  quickIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  tabBody: { minHeight: 320 },
  dupCard: { marginHorizontal: 16, marginBottom: 12, padding: 12, gap: 8 },
  dupActions: { flexDirection: 'row', gap: 8 },
});
