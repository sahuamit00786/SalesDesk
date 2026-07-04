import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import Badge from '../../../design-system/components/Badge';
import IconButton from '../../../design-system/components/IconButton';
import FAB from '../../../design-system/components/FAB';
import Sheet from '../../../design-system/components/Sheet';
import TextField from '../../../design-system/components/TextField';
import DateField from '../../../design-system/components/DateField';
import Button from '../../../design-system/components/Button';
import EmptyState from '../../../design-system/components/EmptyState';
import ErrorState from '../../../design-system/components/ErrorState';
import { Skeleton } from '../../../design-system/components/Skeleton';
import ChartLegend from '../../../design-system/components/charts/ChartLegend';
import { ChevronLeft, ChevronRight, CalendarDays, BellRing, Check, Trash2 } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { keys } from '../../../api/queryKeys';
import { useWorkspaceId } from '../../../hooks/useListQuery';
import { calendarApi, remindersApi, EVENT_KIND_COLOR_INDEX, EVENT_KIND_LABELS } from '../api';
import { categorical } from '../../../design-system/tokens/chartPalette';
import { formatTime } from '../../../utils/format';
import { ROUTES } from '../../../navigation/routes';

const AddReminderSheet = forwardRef(function AddReminderSheet({ onSaved, defaultDate }, ref) {
  const sheetRef = useRef(null);
  const [title, setTitle] = useState('');
  const [remindAt, setRemindAt] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => {
      setTitle('');
      const base = defaultDate ? new Date(defaultDate) : new Date();
      base.setHours(9, 0, 0, 0);
      setRemindAt(base);
      setNotes('');
      requestAnimationFrame(() => sheetRef.current?.present());
    },
  }));

  const submit = async () => {
    if (!title.trim() || !remindAt) return;
    try {
      setBusy(true);
      await remindersApi.create({ title: title.trim(), remindAt: remindAt.toISOString(), notes: notes.trim() || undefined });
      Toast.show({ type: 'success', text1: 'Reminder set' });
      sheetRef.current?.dismiss();
      onSaved?.();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Could not set reminder', text2: err?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet ref={sheetRef} title="New reminder">
      <TextField label="Title" value={title} onChangeText={setTitle} placeholder="Call back Jane" style={styles.sheetField} />
      <DateField label="When" mode="datetime" value={remindAt} onChange={setRemindAt} style={styles.sheetField} />
      <TextField label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Optional" style={styles.sheetField} />
      <Button title="Set reminder" fullWidth loading={busy} disabled={!title.trim() || !remindAt} onPress={submit} />
    </Sheet>
  );
});

export default function CalendarScreen({ navigation }) {
  const theme = useTheme();
  const ws = useWorkspaceId();
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());
  const reminderRef = useRef(null);

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });

  const events = useQuery({
    queryKey: keys.calendar.events(ws, format(month, 'yyyy-MM')),
    queryFn: () => calendarApi.events({ from: gridStart.toISOString(), to: gridEnd.toISOString() }),
    enabled: Boolean(ws),
    select: (r) => (Array.isArray(r.data) ? r.data : []),
    staleTime: 60_000,
  });

  const reminderDone = useMutation({
    mutationFn: (id) => remindersApi.update(id, { status: 'done' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.calendar.all(ws) }),
  });
  const reminderDelete = useMutation({
    mutationFn: (id) => remindersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.calendar.all(ws) }),
  });

  const cat = categorical(theme.dark);
  const kindColor = (kind) => cat[EVENT_KIND_COLOR_INDEX[kind] ?? 0];

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const ev of events.data || []) {
      const d = new Date(ev.start || ev.at || ev.remindAt);
      if (Number.isNaN(d.getTime())) continue;
      const key = format(d, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    }
    for (const list of map.values()) list.sort((a, b) => new Date(a.start) - new Date(b.start));
    return map;
  }, [events.data]);

  const weeks = useMemo(() => {
    const out = [];
    let cursor = gridStart;
    while (cursor <= gridEnd) {
      const week = [];
      for (let i = 0; i < 7; i += 1) {
        week.push(cursor);
        cursor = addDays(cursor, 1);
      }
      out.push(week);
    }
    return out;
  }, [month]);

  const dayEvents = eventsByDay.get(format(selected, 'yyyy-MM-dd')) || [];

  const openEvent = (ev) => {
    if (ev.kind === 'meeting' && (ev.meetingId || ev.id)) {
      navigation.navigate(ROUTES.MEETING_DETAIL, { meetingId: ev.meetingId || ev.id });
    } else if ((ev.kind === 'task' || ev.kind === 'followup' || ev.kind === 'opportunity') && ev.leadId) {
      navigation.navigate(ROUTES.LEAD_DETAIL, { leadId: ev.leadId, id: ev.leadId });
    }
  };

  const s = styles;

  return (
    <ScreenScaffold>
      <AppHeader
        title="Calendar"
        right={
          <>
            <IconButton icon={ChevronLeft} accessibilityLabel="Previous month" onPress={() => setMonth((m) => addMonths(m, -1))} />
            <IconButton icon={ChevronRight} accessibilityLabel="Next month" onPress={() => setMonth((m) => addMonths(m, 1))} />
          </>
        }
      />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={events.isRefetching} onRefresh={events.refetch} tintColor={theme.brand} colors={[theme.brand]} />
        }
      >
        <Card padded={false} style={s.gridCard}>
          <AppText variant="subheading" style={s.monthTitle}>
            {format(month, 'MMMM yyyy')}
          </AppText>
          <View style={s.weekHeader}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <AppText key={i} variant="micro" color="inkFaint" style={s.weekDay}>
                {d}
              </AppText>
            ))}
          </View>
          {events.isPending ? (
            <View style={s.gridSkeleton}>
              <Skeleton height={200} />
            </View>
          ) : (
            weeks.map((week, wi) => (
              <View key={wi} style={s.weekRow}>
                {week.map((day) => {
                  const inMonth = isSameMonth(day, month);
                  const sel = isSameDay(day, selected);
                  const today = isToday(day);
                  const dots = (eventsByDay.get(format(day, 'yyyy-MM-dd')) || []).slice(0, 3);
                  return (
                    <Pressable
                      key={day.toISOString()}
                      onPress={() => setSelected(day)}
                      accessibilityRole="button"
                      accessibilityLabel={format(day, 'd MMMM')}
                      style={[
                        s.dayCell,
                        sel && { backgroundColor: theme.brand, borderRadius: theme.radius.md },
                        !sel && today && { backgroundColor: theme.brandFaint, borderRadius: theme.radius.md },
                      ]}
                    >
                      <AppText
                        variant={sel || today ? 'captionStrong' : 'caption'}
                        color={sel ? theme.onBrand : inMonth ? 'ink' : 'inkFaint'}
                      >
                        {format(day, 'd')}
                      </AppText>
                      <View style={s.dotRow}>
                        {dots.map((ev, i) => (
                          <View key={i} style={[s.dot, { backgroundColor: sel ? theme.onBrand : kindColor(ev.kind) }]} />
                        ))}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))
          )}
          <View style={s.legendWrap}>
            <ChartLegend
              items={Object.entries(EVENT_KIND_LABELS).map(([kind, label]) => ({ label, color: kindColor(kind) }))}
            />
          </View>
        </Card>

        <AppText variant="subheading" style={s.dayTitle}>
          {isToday(selected) ? 'Today' : format(selected, 'EEEE, d MMM')}
        </AppText>

        {events.isError ? (
          <ErrorState error={events.error} onRetry={events.refetch} compact />
        ) : dayEvents.length === 0 ? (
          <EmptyState compact icon={CalendarDays} title="Nothing scheduled" message="Add a reminder or schedule a meeting." />
        ) : (
          dayEvents.map((ev, i) => (
            <Animated.View key={`${ev.kind}-${ev.id}-${i}`} entering={i < 10 ? FadeInDown.duration(240).delay(i * 30) : undefined}>
              <Card style={s.eventCard}>
                <Pressable onPress={() => openEvent(ev)} style={s.eventRow} accessibilityRole="button">
                  <View style={[s.kindBar, { backgroundColor: kindColor(ev.kind), borderRadius: theme.radius.full }]} />
                  <View style={s.flex}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {ev.title || EVENT_KIND_LABELS[ev.kind] || 'Event'}
                    </AppText>
                    <View style={s.eventMeta}>
                      <Badge label={EVENT_KIND_LABELS[ev.kind] || ev.kind} tone="neutral" size="sm" />
                      <AppText variant="micro" color="inkFaint">
                        {ev.allDay ? 'All day' : `${formatTime(ev.start)}${ev.end ? ` – ${formatTime(ev.end)}` : ''}`}
                      </AppText>
                    </View>
                  </View>
                  {ev.kind === 'reminder' ? (
                    <View style={s.reminderActions}>
                      <IconButton
                        icon={Check}
                        size={32}
                        variant="brand"
                        accessibilityLabel="Mark reminder done"
                        onPress={() => reminderDone.mutate(ev.id)}
                      />
                      <IconButton
                        icon={Trash2}
                        size={32}
                        accessibilityLabel="Delete reminder"
                        color={theme.colors.danger}
                        onPress={() => reminderDelete.mutate(ev.id)}
                      />
                    </View>
                  ) : null}
                </Pressable>
              </Card>
            </Animated.View>
          ))
        )}
      </ScrollView>

      <FAB icon={BellRing} label="Reminder" onPress={() => reminderRef.current?.open()} />
      <AddReminderSheet ref={reminderRef} defaultDate={selected} onSaved={events.refetch} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 110 },
  gridCard: { paddingVertical: 12, paddingHorizontal: 10, marginBottom: 16 },
  monthTitle: { textAlign: 'center', marginBottom: 10 },
  weekHeader: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { flex: 1, textAlign: 'center' },
  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 7, margin: 1 },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 3, height: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  gridSkeleton: { padding: 12 },
  legendWrap: { paddingHorizontal: 8, paddingTop: 10 },
  dayTitle: { marginBottom: 10 },
  eventCard: { marginBottom: 8, padding: 12 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kindBar: { width: 4, alignSelf: 'stretch' },
  flex: { flex: 1 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  reminderActions: { flexDirection: 'row', gap: 6 },
  sheetField: { marginBottom: 14 },
});
