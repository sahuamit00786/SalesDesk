import React, { useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { trigger } from 'react-native-haptic-feedback';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import SearchBar from '../../../design-system/components/SearchBar';
import Badge from '../../../design-system/components/Badge';
import Card from '../../../design-system/components/Card';
import SwipeRow from '../../../design-system/components/SwipeRow';
import DateField from '../../../design-system/components/DateField';
import Sheet from '../../../design-system/components/Sheet';
import Button from '../../../design-system/components/Button';
import { SegmentedTabs } from '../../../design-system/components/SegmentedTabs';
import EmptyState from '../../../design-system/components/EmptyState';
import ErrorState from '../../../design-system/components/ErrorState';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import { ListTodo, Check, Circle, CalendarClock, Users } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useTasksList, useTaskMutations } from '../hooks';
import { formatDateTime, formatNumber } from '../../../utils/format';
import { ROUTES } from '../../../navigation/routes';

const SEGMENTS = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'done', label: 'Done' },
];

function paramsForSegment(segment) {
  switch (segment) {
    case 'today':
      return { horizon: 'today', status: 'pending,in_progress', sort: 'dueAt', sortDir: 'asc' };
    case 'upcoming':
      return { horizon: 'upcoming', status: 'pending,in_progress', sort: 'dueAt', sortDir: 'asc' };
    case 'overdue':
      return { overdue: 'true', status: 'pending,in_progress', sort: 'dueAt', sortDir: 'asc' };
    case 'done':
      return { status: 'completed', sort: 'dueAt', sortDir: 'desc' };
    default:
      return { sort: 'dueAt', sortDir: 'asc' };
  }
}

function TaskRow({ task, onToggle, onReschedule, onOpenLead, index }) {
  const theme = useTheme();
  const done = task.status === 'completed';
  const overdue = !done && task.dueAt && new Date(task.dueAt).getTime() < Date.now();

  const actions = done
    ? []
    : [
        { key: 'done', label: 'Done', icon: Check, color: '#15803D', onPress: () => onToggle(task) },
        { key: 'move', label: 'Move', icon: CalendarClock, color: '#B45309', onPress: () => onReschedule(task) },
      ];

  return (
    <Animated.View entering={index < 8 ? FadeInDown.duration(280).delay(index * 40) : undefined}>
      <SwipeRow actions={actions} style={styles.rowWrap}>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Pressable
              onPress={() => onToggle(task)}
              hitSlop={10}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
            >
              {done ? (
                <View style={[styles.checkOn, { backgroundColor: theme.colors.success, borderRadius: theme.radius.full }]}>
                  <Check size={14} color="#fff" strokeWidth={3} />
                </View>
              ) : (
                <Circle size={24} color={overdue ? theme.colors.danger : theme.colors.borderStrong} strokeWidth={2} />
              )}
            </Pressable>
            <View style={styles.texts}>
              <AppText variant="bodyStrong" color={done ? 'inkFaint' : 'ink'} style={done ? styles.strike : null} numberOfLines={2}>
                {task.title}
              </AppText>
              <View style={styles.metaRow}>
                {task.dueAt ? (
                  <AppText variant="micro" color={overdue ? 'danger' : 'inkFaint'}>
                    {overdue ? 'Overdue · ' : ''}
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
              {task.lead ? (
                <Pressable onPress={() => onOpenLead(task)} hitSlop={6} accessibilityRole="link">
                  <AppText variant="caption" color="brand" numberOfLines={1} style={styles.leadLink}>
                    {task.lead.contactName || task.lead.title}
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          </View>
        </Card>
      </SwipeRow>
    </Animated.View>
  );
}

export default function TasksListScreen({ navigation }) {
  const theme = useTheme();
  const [segment, setSegment] = useState('today');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [rescheduleTask, setRescheduleTask] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState(null);
  const rescheduleRef = useRef(null);

  const params = useMemo(() => {
    const p = paramsForSegment(segment);
    if (search.trim()) p.search = search.trim();
    return p;
  }, [segment, search]);

  const list = useTasksList(params);
  const { update } = useTaskMutations();

  const toggle = (task) => {
    trigger('impactLight', { enableVibrateFallback: false });
    const next = task.status === 'completed' ? 'pending' : 'completed';
    update.mutate(
      { taskId: task.id, body: { status: next } },
      { onSuccess: () => next === 'completed' && Toast.show({ type: 'success', text1: 'Task completed 🎉' }) },
    );
  };

  const openReschedule = (task) => {
    setRescheduleTask(task);
    setRescheduleDate(task.dueAt ? new Date(task.dueAt) : new Date());
    requestAnimationFrame(() => rescheduleRef.current?.present());
  };

  const saveReschedule = () => {
    if (!rescheduleTask || !rescheduleDate) return;
    update.mutate(
      { taskId: rescheduleTask.id, body: { dueAt: rescheduleDate.toISOString() } },
      {
        onSuccess: () => {
          Toast.show({ type: 'success', text1: 'Task rescheduled' });
          rescheduleRef.current?.dismiss();
        },
      },
    );
  };

  return (
    <ScreenScaffold>
      <AppHeader title="Tasks" subtitle={list.isPending ? undefined : `${formatNumber(list.total)} in view`} />
      <View style={styles.controls}>
        <SearchBar value={searchInput} onChangeText={setSearchInput} onDebounced={setSearch} placeholder="Search tasks…" />
        <SegmentedTabs tabs={SEGMENTS} value={segment} onChange={setSegment} style={styles.segments} />
      </View>

      {list.isPending ? (
        <SkeletonList count={7} cardHeight={86} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : list.isEmpty ? (
        <EmptyState
          icon={ListTodo}
          title={segment === 'done' ? 'Nothing completed yet' : segment === 'overdue' ? 'Nothing overdue' : 'All clear'}
          message={
            segment === 'overdue'
              ? 'Great — no overdue tasks.'
              : 'Tasks you add on leads appear here. Swipe a task to complete or reschedule it.'
          }
        />
      ) : (
        <FlashList
          data={list.items}
          keyExtractor={(item) => String(item.id)}
          estimatedItemSize={96}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.4}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
          refreshControl={
            <RefreshControl refreshing={list.isRefetching && !list.isFetchingNextPage} onRefresh={list.refetch} tintColor={theme.brand} colors={[theme.brand]} />
          }
          renderItem={({ item, index }) => (
            <TaskRow
              task={item}
              index={index}
              onToggle={toggle}
              onReschedule={openReschedule}
              onOpenLead={(t) => navigation.navigate(ROUTES.LEAD_DETAIL, { leadId: t.leadId || t.lead?.id, id: t.leadId || t.lead?.id })}
            />
          )}
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <AppText variant="caption" color="inkFaint" style={styles.footer}>
                Loading more…
              </AppText>
            ) : null
          }
        />
      )}

      <Sheet ref={rescheduleRef} title="Reschedule task" subtitle={rescheduleTask?.title}>
        <DateField label="New due date" mode="datetime" value={rescheduleDate} onChange={setRescheduleDate} style={styles.rescheduleField} />
        <Button title="Save" fullWidth loading={update.isPending} onPress={saveReschedule} />
      </Sheet>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, marginBottom: 10, gap: 10 },
  segments: {},
  listContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4 },
  footer: { textAlign: 'center', paddingVertical: 14 },
  rowWrap: { marginBottom: 10 },
  card: { padding: 14 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  checkOn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1 },
  strike: { textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  leadLink: { marginTop: 5 },
  rescheduleField: { marginBottom: 16 },
});
