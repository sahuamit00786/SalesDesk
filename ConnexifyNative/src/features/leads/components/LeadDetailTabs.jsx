import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import Card from '../../../design-system/components/Card';
import AppText from '../../../design-system/components/AppText';
import Badge from '../../../design-system/components/Badge';
import EmptyState from '../../../design-system/components/EmptyState';
import { Divider, KeyValueRow } from '../../../design-system/components/SectionHeader';
import { Skeleton } from '../../../design-system/components/Skeleton';
import {
  Phone,
  Mail,
  Video,
  StickyNote,
  CheckSquare,
  Activity as ActivityIcon,
  CalendarClock,
  File,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  FileAudio,
  FileVideo,
  Trash2,
  Check,
  Circle,
  PhoneIncoming,
  PhoneOutgoing,
} from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { SOURCE_LABELS } from '../constants';
import { CALL_OUTCOMES } from '../../calls/api';
import { fileUrl } from '../../documents/api';
import { formatDate, formatDateTime, formatDurationExact, formatMoney, relativeTime, formatNumber } from '../../../utils/format';

const CALL_OUTCOME_TONES = { connected: 'success', no_answer: 'neutral', voicemail: 'info', followup_needed: 'warning' };

const TYPE_ICONS = { call: Phone, email: Mail, meeting: Video, note: StickyNote, task: CheckSquare };

export function TabLoading() {
  return (
    <View style={styles.pad}>
      <Skeleton height={56} />
      <Skeleton height={56} style={styles.gap} />
      <Skeleton height={56} style={styles.gap} />
    </View>
  );
}

export function OverviewTab({ lead, currency }) {
  const address = [lead.street, lead.city, lead.state, lead.country, lead.postalCode].filter(Boolean).join(', ');
  const customValues = Array.isArray(lead.customFieldValues) ? lead.customFieldValues : [];

  return (
    <Animated.View entering={FadeInDown.duration(280)} style={styles.pad}>
      <Card padded={false} style={styles.card}>
        <View style={styles.cardInner}>
          <KeyValueRow label="Email" value={lead.email || '—'} />
          <Divider />
          <KeyValueRow label="Phone" value={lead.phone ? `${lead.phoneCountryCode || ''} ${lead.phone}` : '—'} />
          <Divider />
          <KeyValueRow label="Company" value={lead.company || '—'} />
          <Divider />
          <KeyValueRow label="Designation" value={lead.designation || '—'} />
          <Divider />
          <KeyValueRow label="Source" value={SOURCE_LABELS[lead.source] || lead.source || '—'} />
          <Divider />
          <KeyValueRow label="Assigned to" value={lead.assignee?.name || '—'} />
          <Divider />
          <KeyValueRow
            label="Value"
            value={Number(lead.value) > 0 ? formatMoney(lead.value, lead.valueCurrency || currency) : '—'}
          />
          <Divider />
          <KeyValueRow label="Score" value={formatNumber(lead.score || 0)} />
          <Divider />
          <KeyValueRow label="Closing date" value={lead.closingDate ? formatDate(lead.closingDate) : '—'} />
          {address ? (
            <>
              <Divider />
              <KeyValueRow label="Address" value={address} />
            </>
          ) : null}
        </View>
      </Card>

      {(lead.tags || []).length ? (
        <Card style={styles.card}>
          <AppText variant="captionStrong" color="inkFaint" style={styles.blockTitle}>
            TAGS
          </AppText>
          <View style={styles.tagRow}>
            {lead.tags.map((tag) => (
              <Badge key={tag.id || tag.name} label={tag.name} tone="brand" size="sm" />
            ))}
          </View>
        </Card>
      ) : null}

      {lead.requirement || lead.notes ? (
        <Card style={styles.card}>
          <AppText variant="captionStrong" color="inkFaint" style={styles.blockTitle}>
            {lead.requirement ? 'REQUIREMENT' : 'NOTES'}
          </AppText>
          <AppText variant="body" color="inkMuted">
            {lead.requirement || lead.notes}
          </AppText>
        </Card>
      ) : null}

      {customValues.length ? (
        <Card padded={false} style={styles.card}>
          <View style={styles.cardInner}>
            <AppText variant="captionStrong" color="inkFaint" style={[styles.blockTitle, styles.blockTitlePad]}>
              CUSTOM FIELDS
            </AppText>
            {customValues.map((cf, i) => (
              <View key={cf.id || i}>
                {i > 0 ? <Divider /> : null}
                <KeyValueRow
                  label={cf.field?.label || cf.field?.name || cf.label || 'Field'}
                  value={cf.value == null || cf.value === '' ? '—' : String(cf.value)}
                />
              </View>
            ))}
          </View>
        </Card>
      ) : null}
    </Animated.View>
  );
}

export function ActivityTab({ items, loading }) {
  const theme = useTheme();
  if (loading) return <TabLoading />;
  if (!items.length)
    return <EmptyState compact icon={ActivityIcon} title="No activity yet" message="Log a call, email or note." />;

  return (
    <View style={styles.pad}>
      {items.map((activity, i) => {
        const Icon = TYPE_ICONS[activity.type] || ActivityIcon;
        const isLast = i === items.length - 1;
        return (
          <Animated.View key={activity.id || i} entering={i < 10 ? FadeInDown.duration(260).delay(i * 30) : undefined} style={styles.timelineRow}>
            <View style={styles.timelineRail}>
              <View style={[styles.timelineDot, { backgroundColor: theme.brandSoft, borderRadius: theme.radius.full }]}>
                <Icon size={14} color={theme.brand} strokeWidth={2.2} />
              </View>
              {!isLast ? <View style={[styles.timelineLine, { backgroundColor: theme.colors.divider }]} /> : null}
            </View>
            <Card style={styles.timelineCard}>
              <View style={styles.timelineHead}>
                <Badge label={activity.type} tone="brand" size="sm" />
                <AppText variant="micro" color="inkFaint">
                  {relativeTime(activity.createdAt)}
                </AppText>
              </View>
              <AppText variant="body" style={styles.timelineBody}>
                {activity.body || '—'}
              </AppText>
            </Card>
          </Animated.View>
        );
      })}
    </View>
  );
}

export function CallsTab({ items, loading }) {
  const theme = useTheme();
  if (loading) return <TabLoading />;
  if (!items.length) return <EmptyState compact icon={Phone} title="No calls yet" message="Calls logged or synced for this lead appear here." />;

  return (
    <View style={styles.pad}>
      {items.map((call, i) => {
        const inbound = call.callType === 'inbound';
        const DirIcon = inbound ? PhoneIncoming : PhoneOutgoing;
        const outcomeMeta = CALL_OUTCOMES.find((o) => o.value === call.outcome);
        return (
          <Animated.View key={call.id || i} entering={i < 10 ? FadeInDown.duration(260).delay(i * 30) : undefined}>
            <Card style={styles.card}>
              <View style={styles.taskRow}>
                <View style={[styles.fuIcon, { backgroundColor: inbound ? theme.colors.infoSoft : theme.brandFaint, borderRadius: theme.radius.full }]}>
                  <DirIcon size={16} color={inbound ? '#0284C7' : theme.brand} strokeWidth={2.1} />
                </View>
                <View style={styles.taskTexts}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {call.callerName || call.lead?.contactName || call.phoneNumber || (inbound ? 'Incoming call' : 'Outgoing call')}
                  </AppText>
                  <View style={styles.taskMeta}>
                    {outcomeMeta ? <Badge label={outcomeMeta.label} tone={CALL_OUTCOME_TONES[call.outcome] || 'neutral'} size="sm" /> : null}
                    {call.duration ? (
                      <AppText variant="micro" color="inkFaint">
                        {formatDurationExact(call.duration)}
                      </AppText>
                    ) : null}
                  </View>
                  <AppText variant="micro" color="inkFaint" style={styles.callMeta}>
                    {formatDateTime(call.createdAt)}
                    {call.source === 'device_sync' ? ` · Synced by ${call.owner?.name || 'device'}` : call.owner?.name ? ` · Logged by ${call.owner.name}` : ''}
                  </AppText>
                  {call.notes ? (
                    <AppText variant="caption" color="inkMuted" numberOfLines={2} style={styles.callMeta}>
                      {call.notes}
                    </AppText>
                  ) : null}
                </View>
              </View>
            </Card>
          </Animated.View>
        );
      })}
    </View>
  );
}

export function NotesTab({ items, loading, onDelete }) {
  const theme = useTheme();
  if (loading) return <TabLoading />;
  if (!items.length) return <EmptyState compact icon={StickyNote} title="No notes yet" message="Capture context about this lead." />;

  return (
    <View style={styles.pad}>
      {items.map((note, i) => (
        <Animated.View key={note.id || i} entering={i < 10 ? FadeInDown.duration(260).delay(i * 30) : undefined}>
          <Card style={styles.card}>
            <AppText variant="body">{note.body || note.content || '—'}</AppText>
            <View style={styles.noteFooter}>
              <AppText variant="micro" color="inkFaint">
                {note.user?.name ? `${note.user.name} · ` : ''}
                {relativeTime(note.createdAt)}
              </AppText>
              {onDelete ? (
                <Pressable onPress={() => onDelete(note)} hitSlop={8} accessibilityLabel="Delete note">
                  <Trash2 size={15} color={theme.colors.inkFaint} strokeWidth={2} />
                </Pressable>
              ) : null}
            </View>
          </Card>
        </Animated.View>
      ))}
    </View>
  );
}

export function TasksTab({ items, loading, onToggle, onDelete }) {
  const theme = useTheme();
  if (loading) return <TabLoading />;
  if (!items.length) return <EmptyState compact icon={CheckSquare} title="No tasks" message="Add a task to move this lead forward." />;

  return (
    <View style={styles.pad}>
      {items.map((task, i) => {
        const done = task.status === 'completed';
        const overdue = !done && task.dueAt && new Date(task.dueAt).getTime() < Date.now();
        return (
          <Animated.View key={task.id || i} entering={i < 10 ? FadeInDown.duration(260).delay(i * 30) : undefined}>
            <Card style={styles.card}>
              <View style={styles.taskRow}>
                <Pressable
                  onPress={() => onToggle?.(task)}
                  hitSlop={8}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                >
                  {done ? (
                    <View style={[styles.checkOn, { backgroundColor: theme.colors.success, borderRadius: theme.radius.full }]}>
                      <Check size={13} color="#fff" strokeWidth={3} />
                    </View>
                  ) : (
                    <Circle size={22} color={theme.colors.borderStrong} strokeWidth={2} />
                  )}
                </Pressable>
                <View style={styles.taskTexts}>
                  <AppText variant="bodyStrong" style={done ? styles.strike : null} color={done ? 'inkFaint' : 'ink'}>
                    {task.title}
                  </AppText>
                  <View style={styles.taskMeta}>
                    {task.dueAt ? (
                      <AppText variant="micro" color={overdue ? 'danger' : 'inkFaint'}>
                        {overdue ? 'Overdue · ' : 'Due '}
                        {formatDateTime(task.dueAt)}
                      </AppText>
                    ) : null}
                    {task.priority ? (
                      <Badge
                        label={task.priority}
                        size="sm"
                        tone={task.priority === 'urgent' || task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'neutral'}
                      />
                    ) : null}
                  </View>
                </View>
                {onDelete ? (
                  <Pressable onPress={() => onDelete(task)} hitSlop={8} accessibilityLabel="Delete task">
                    <Trash2 size={15} color={theme.colors.inkFaint} strokeWidth={2} />
                  </Pressable>
                ) : null}
              </View>
            </Card>
          </Animated.View>
        );
      })}
    </View>
  );
}

export function FollowupsTab({ items, loading, onToggle, onDelete }) {
  const theme = useTheme();
  if (loading) return <TabLoading />;
  if (!items.length)
    return <EmptyState compact icon={CalendarClock} title="No follow-ups" message="Schedule a follow-up so nothing slips." />;

  return (
    <View style={styles.pad}>
      {items.map((fu, i) => {
        const done = fu.status === 'done' || fu.status === 'completed' || fu.completedAt;
        const overdue = !done && fu.dueAt && new Date(fu.dueAt).getTime() < Date.now();
        return (
          <Animated.View key={fu.id || i} entering={i < 10 ? FadeInDown.duration(260).delay(i * 30) : undefined}>
            <Card style={styles.card}>
              <View style={styles.taskRow}>
                <View style={[styles.fuIcon, { backgroundColor: overdue ? theme.colors.dangerSoft : theme.brandFaint, borderRadius: theme.radius.full }]}>
                  <CalendarClock size={16} color={overdue ? theme.colors.danger : theme.brand} strokeWidth={2.1} />
                </View>
                <View style={styles.taskTexts}>
                  <AppText variant="bodyStrong" color={done ? 'inkFaint' : 'ink'} style={done ? styles.strike : null}>
                    {formatDateTime(fu.dueAt)}
                  </AppText>
                  {fu.note ? (
                    <AppText variant="caption" color="inkMuted" numberOfLines={2}>
                      {fu.note}
                    </AppText>
                  ) : null}
                  {done ? <Badge label="Done" tone="success" size="sm" style={styles.fuBadge} /> : overdue ? <Badge label="Overdue" tone="danger" size="sm" style={styles.fuBadge} /> : null}
                </View>
                {!done && onToggle ? (
                  <Pressable onPress={() => onToggle(fu)} hitSlop={8} accessibilityLabel="Mark done">
                    <Circle size={22} color={theme.colors.borderStrong} strokeWidth={2} />
                  </Pressable>
                ) : null}
                {onDelete ? (
                  <Pressable onPress={() => onDelete(fu)} hitSlop={8} accessibilityLabel="Delete follow-up">
                    <Trash2 size={15} color={theme.colors.inkFaint} strokeWidth={2} />
                  </Pressable>
                ) : null}
              </View>
            </Card>
          </Animated.View>
        );
      })}
    </View>
  );
}

const FILE_TYPE_META = {
  image: { Icon: FileImage, bg: '#DBEAFE', fg: '#2563EB' },
  pdf: { Icon: FileText, bg: '#FFE4E6', fg: '#E11D48' },
  doc: { Icon: FileText, bg: '#E0F2FE', fg: '#0284C7' },
  sheet: { Icon: FileSpreadsheet, bg: '#DCFCE7', fg: '#16A34A' },
  slide: { Icon: FileText, bg: '#FFEDD5', fg: '#EA580C' },
  audio: { Icon: FileAudio, bg: '#EDE9FE', fg: '#7C3AED' },
  video: { Icon: FileVideo, bg: '#FCE7F3', fg: '#DB2777' },
  archive: { Icon: FileArchive, bg: '#FEF3C7', fg: '#D97706' },
};

function fileMetaFor(name) {
  const ext = String(name || '').split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'bmp', 'svg'].includes(ext)) return FILE_TYPE_META.image;
  if (ext === 'pdf') return FILE_TYPE_META.pdf;
  if (['doc', 'docx', 'rtf', 'txt'].includes(ext)) return FILE_TYPE_META.doc;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return FILE_TYPE_META.sheet;
  if (['ppt', 'pptx'].includes(ext)) return FILE_TYPE_META.slide;
  if (['mp3', 'wav', 'm4a', 'aac', 'flac'].includes(ext)) return FILE_TYPE_META.audio;
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return FILE_TYPE_META.video;
  if (['zip', 'rar', '7z'].includes(ext)) return FILE_TYPE_META.archive;
  return null;
}

function formatFileSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesTab({ items, loading, onDelete }) {
  const theme = useTheme();
  if (loading) return <TabLoading />;
  if (!items.length) return <EmptyState compact icon={File} title="No files" message="Files uploaded for this lead appear here." />;

  const openFile = (file) => {
    const url = fileUrl(file.filePath);
    if (!url) {
      Toast.show({ type: 'error', text1: 'File is not available' });
      return;
    }
    Linking.openURL(url).catch(() => Toast.show({ type: 'error', text1: 'Could not open file' }));
  };

  return (
    <View style={styles.pad}>
      {items.map((file, i) => {
        const meta = fileMetaFor(file.name || file.fileName) || { Icon: File, bg: theme.brandFaint, fg: theme.brand };
        const Icon = meta.Icon;
        const size = formatFileSize(file.fileSize ?? file.sizeBytes);
        return (
          <Animated.View key={file.id || i} entering={i < 10 ? FadeInDown.duration(260).delay(i * 30) : undefined}>
            <Card style={styles.card}>
              <View style={styles.taskRow}>
                <Pressable onPress={() => openFile(file)} accessibilityRole="button" style={styles.taskRow}>
                  <View style={[styles.fuIcon, { backgroundColor: meta.bg, borderRadius: theme.radius.md }]}>
                    <Icon size={17} color={meta.fg} strokeWidth={2} />
                  </View>
                  <View style={styles.taskTexts}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {file.name || file.fileName || 'File'}
                    </AppText>
                    <AppText variant="micro" color="inkFaint">
                      {[size, file.uploader?.name, relativeTime(file.createdAt)].filter(Boolean).join(' · ')}
                    </AppText>
                  </View>
                </Pressable>
                {onDelete ? (
                  <Pressable onPress={() => onDelete(file)} hitSlop={8} accessibilityLabel="Delete file">
                    <Trash2 size={15} color={theme.colors.inkFaint} strokeWidth={2} />
                  </Pressable>
                ) : null}
              </View>
            </Card>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingTop: 12 },
  gap: { marginTop: 10 },
  card: { marginBottom: 10 },
  cardInner: { paddingHorizontal: 16, paddingVertical: 4 },
  blockTitle: { letterSpacing: 0.8, marginBottom: 8 },
  blockTitlePad: { paddingTop: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineRail: { alignItems: 'center', width: 30 },
  timelineDot: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  timelineLine: { width: 2, flex: 1, marginVertical: 4 },
  timelineCard: { flex: 1, marginBottom: 14 },
  timelineHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  timelineBody: {},
  noteFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  taskTexts: { flex: 1 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  strike: { textDecorationLine: 'line-through' },
  checkOn: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  fuIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  fuBadge: { marginTop: 6 },
  callMeta: { marginTop: 4 },
});
