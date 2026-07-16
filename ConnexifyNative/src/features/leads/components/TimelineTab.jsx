import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import EmptyState from '../../../design-system/components/EmptyState';
import { useTheme } from '../../../design-system/ThemeProvider';
import {
  Activity as ActivityIcon,
  PhoneCall,
  StickyNote,
  RefreshCw,
  FileText,
  Bell,
  Rocket,
  PartyPopper,
  UserCheck,
  Zap,
  Tag,
  CheckSquare,
} from '../../../design-system/icons';
import { formatDateTime } from '../../../utils/format';

/**
 * TimelineTab — one merged, newest-first stream matching the web "Activity" tab.
 *
 * The server's Activity table already carries notes, tasks, follow-ups, status
 * changes, assignment, conversion, and document uploads for this lead (each
 * controller writes an Activity row as a side effect — see leadsController.js
 * and leadDocumentActivity.js), so `activities` alone reflects nearly
 * everything. Calls are the one thing genuinely stored elsewhere (CallLog,
 * not Activity), matching the web, so they're merged in client-side here.
 */

const STYLE = {
  note: { icon: StickyNote, tone: '#7C3AED', label: 'Note' },
  call: { icon: PhoneCall, tone: '#0284C7', label: 'Call' },
  task: { icon: CheckSquare, tone: '#0284C7', label: 'Task' },
  follow_up: { icon: Bell, tone: '#0284C7', label: 'Follow-up' },
  status_change: { icon: RefreshCw, tone: '#D97706', label: 'Status changed' },
  updated: { icon: RefreshCw, tone: '#2563EB', label: 'Updated' },
  assigned: { icon: UserCheck, tone: '#7C3AED', label: 'Assigned' },
  converted: { icon: Rocket, tone: '#D97706', label: 'Converted' },
  created: { icon: PartyPopper, tone: '#16A34A', label: 'Created' },
  document: { icon: FileText, tone: '#0D9488', label: 'Document' },
  automation: { icon: Zap, tone: '#C026D3', label: 'Automation' },
  tag: { icon: Tag, tone: '#4F46E5', label: 'Tag' },
  system: { icon: ActivityIcon, tone: '#6366F1', label: 'Activity' },
};

/** Map metadata.action from system activities to a visual bucket — mirrors the web's inferStyleKeyFromSystemAction. */
function keyFromAction(action) {
  const a = String(action || '').toLowerCase();
  if (!a) return null;
  if (a.startsWith('task_')) return 'task';
  if (a.startsWith('note_')) return 'note';
  if (a.startsWith('followup_')) return 'follow_up';
  if (a === 'lead_created' || a === 'created_from_duplicate') return 'created';
  if (a === 'converted_to_opportunity') return 'converted';
  if (a === 'owner_reassigned' || a === 'workflow_assign_owner') return 'assigned';
  if (a.startsWith('workflow_')) return 'automation';
  if (a === 'lead_status_changed') return 'status_change';
  if (a === 'lead_field_changed' || a === 'lead_collaborators_changed') return 'updated';
  if (a === 'document_uploaded' || a === 'document_moved' || a === 'document_deleted') return 'document';
  return null;
}

function visualKey(activity) {
  const md = activity?.metadata || {};
  const fromMeta = String(md.activityTypeKey || '').toLowerCase();
  if (fromMeta && STYLE[fromMeta]) return fromMeta;
  const fromAction = keyFromAction(md.action);
  if (fromAction) return fromAction;
  const fromType = String(activity?.type || '').toLowerCase();
  if (fromType && STYLE[fromType]) return fromType;
  return 'system';
}

function normalize({ activities = [], calls = [] }) {
  const rows = [];

  for (const a of activities) {
    const kind = visualKey(a);
    const isNote = kind === 'note';
    rows.push({
      id: `act:${a.id}`,
      kind,
      at: a.createdAt || a.created_at,
      title: isNote ? a.metadata?.title?.trim() || 'Note added' : STYLE[kind]?.label || 'Activity',
      body: isNote ? a.body : a.body || a.metadata?.title || '',
      by: a.user?.name,
    });
  }
  for (const c of calls) {
    rows.push({
      id: `call:${c.id}`,
      kind: 'call',
      at: c.createdAt || c.created_at,
      title: `${c.callType === 'inbound' ? 'Incoming' : 'Outgoing'} call${c.outcome ? ` · ${c.outcome.replace(/_/g, ' ')}` : ''}`,
      body: c.notes || '',
      by: c.owner?.name,
    });
  }

  return rows
    .filter((r) => r.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function TimelineRow({ row }) {
  const theme = useTheme();
  const meta = STYLE[row.kind] || STYLE.system;
  const Icon = meta.icon;
  return (
    <View style={styles.row}>
      <View style={styles.railCol}>
        <View style={[styles.dot, { backgroundColor: meta.tone }]}>
          <Icon size={12} color="#fff" strokeWidth={2.3} />
        </View>
        <View style={[styles.rail, { backgroundColor: theme.colors.surfaceBorder }]} />
      </View>
      <Card style={styles.card}>
        <AppText variant="body" weight="600" style={styles.title}>{row.title}</AppText>
        {row.body ? <AppText variant="caption" color="muted">{row.body}</AppText> : null}
        <View style={styles.footer}>
          <AppText variant="caption" color="muted">{formatDateTime(row.at)}</AppText>
          {row.by ? <AppText variant="caption" color="muted">by {row.by}</AppText> : null}
        </View>
      </Card>
    </View>
  );
}

export default function TimelineTab({ activities, calls, loading }) {
  const rows = useMemo(
    () => normalize({ activities: activities || [], calls: calls || [] }),
    [activities, calls],
  );

  if (loading) return <SkeletonList count={5} />;
  if (!rows.length) return <EmptyState icon={ActivityIcon} title="No activity yet" message="Calls, notes, tasks, and status changes will appear here as they happen." />;

  return (
    <View style={styles.wrap}>
      {rows.map((r) => <TimelineRow key={r.id} row={r} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 12 },
  row: { flexDirection: 'row', gap: 10 },
  railCol: { alignItems: 'center', width: 24 },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rail: { width: 2, flex: 1, marginTop: 2 },
  card: { flex: 1, marginBottom: 12, padding: 12, gap: 4 },
  title: {},
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
});
