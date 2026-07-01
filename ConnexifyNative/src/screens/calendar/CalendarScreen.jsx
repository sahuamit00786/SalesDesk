import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, FlatList,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { calendarService } from '../../services/calendarService';
import { fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import AppHeader from '../../components/navigation/AppHeader';
import EmptyState from '../../components/feedback/EmptyState';
import SkeletonList from '../../components/feedback/SkeletonList';
import EventDetailSheet from './EventDetailSheet';

const TYPE_COLORS = {
  meeting:  '#8B5CF6',
  task:     '#06B6D4',
  reminder: '#F59E0B',
  event:    '#4F46E5',
};

const DAYS_IN_STRIP = 14;

const formatTime = (d) =>
  d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

const isSameDay = (a, b) => {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
};

// ── Week Strip ───────────────────────────────────────────────────
const WeekStrip = ({ selectedDate, onSelect, events, theme }) => {
  const days = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  for (let i = -2; i < DAYS_IN_STRIP - 2; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    days.push(d);
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ws.row}>
      {days.map((d) => {
        const isSelected = isSameDay(d, selectedDate);
        const isToday    = isSameDay(d, new Date());
        const hasEvents  = events.some((e) => isSameDay(e.start, d));

        return (
          <TouchableOpacity
            key={d.toISOString()}
            style={[ws.cell, isSelected && { backgroundColor: theme.colors.primary }]}
            onPress={() => onSelect(d)}
            activeOpacity={0.8}
          >
            <Text style={[ws.weekday, { color: isSelected ? '#fff' : theme.colors.textMuted }]}>
              {d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3)}
            </Text>
            <Text style={[ws.day, { color: isSelected ? '#fff' : isToday ? theme.colors.primary : theme.colors.textPrimary }]}>
              {d.getDate()}
            </Text>
            {hasEvents && (
              <View style={[ws.dot, { backgroundColor: isSelected ? '#fff' : theme.colors.primary }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const ws = StyleSheet.create({
  row:     { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, gap: 6 },
  cell:    { width: 44, alignItems: 'center', paddingVertical: 8, borderRadius: borderRadius.md },
  weekday: { fontSize: 10, fontWeight: fontWeight.medium },
  day:     { fontSize: fontSize.base, fontWeight: fontWeight.bold, marginTop: 2 },
  dot:     { width: 5, height: 5, borderRadius: 2.5, marginTop: 4 },
});

// ── Event Card ───────────────────────────────────────────────────
const EventCard = ({ event, onPress, theme }) => {
  const color = TYPE_COLORS[event.type] || TYPE_COLORS.event;
  const isMeet = event.meetLink?.includes('meet.google.com') || event.hangoutLink;

  return (
    <TouchableOpacity
      style={[ec.card, { backgroundColor: theme.colors.surface }, shadows.card]}
      onPress={() => onPress(event)}
      activeOpacity={0.8}
    >
      <View style={[ec.accent, { backgroundColor: color }]} />
      <View style={ec.body}>
        <View style={ec.top}>
          <Text style={[ec.title, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {event.title || event.summary}
          </Text>
          {isMeet && <Icon name="video" size={16} color="#1a73e8" />}
        </View>
        <Text style={[ec.time, { color: color }]}>
          {formatTime(event.start)}
          {event.end ? ` → ${formatTime(event.end)}` : ''}
        </Text>
        {event.description ? (
          <Text style={[ec.desc, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {event.description}
          </Text>
        ) : null}
        {event.attendees?.length ? (
          <View style={ec.attendeesRow}>
            <Icon name="account-group-outline" size={13} color={theme.colors.textMuted} />
            <Text style={[ec.attendees, { color: theme.colors.textMuted }]}>
              {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const ec = StyleSheet.create({
  card:         { flexDirection: 'row', borderRadius: borderRadius.lg, overflow: 'hidden', marginBottom: spacing.sm },
  accent:       { width: 4 },
  body:         { flex: 1, padding: spacing.base },
  top:          { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  title:        { flex: 1, fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  time:         { fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginBottom: 4 },
  desc:         { fontSize: fontSize.sm, lineHeight: 18 },
  attendeesRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  attendees:    { fontSize: fontSize.xs },
});

// ── Main Screen ──────────────────────────────────────────────────
const CalendarScreen = ({ navigation }) => {
  const { theme }  = useTheme();
  const detailRef  = useRef(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents]             = useState([]);
  const [isLoading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const loadEvents = useCallback(async () => {
    try {
      const start = new Date();
      start.setDate(start.getDate() - 3);
      const end = new Date();
      end.setDate(end.getDate() + DAYS_IN_STRIP);

      const data = await calendarService.getEvents({
        startDate: start.toISOString(),
        endDate:   end.toISOString(),
      });
      setEvents(data?.data || data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadEvents(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const dayEvents = events.filter((e) => isSameDay(e.start, selectedDate))
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  const handleEventPress = (event) => {
    setSelectedEvent(event);
    detailRef.current?.expand();
  };

  const dateLabel = selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  if (isLoading) {
    return (
      <View style={[s.root, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Calendar" navigation={navigation} />
        <SkeletonList />
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Calendar" navigation={navigation} />

      {/* Week Strip */}
      <View style={[s.stripWrap, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.borderLight }]}>
        <WeekStrip selectedDate={selectedDate} onSelect={setSelectedDate} events={events} theme={theme} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        contentContainerStyle={{ padding: spacing.base, paddingBottom: 80 }}
      >
        <Animatable.View key={selectedDate.toDateString()} animation="fadeIn" duration={250}>
          <Text style={[s.dateLabel, { color: theme.colors.textPrimary }]}>{dateLabel}</Text>

          {dayEvents.length === 0 ? (
            <EmptyState
              icon="calendar-blank"
              title="No events"
              subtitle="Nothing scheduled for this day"
            />
          ) : (
            dayEvents.map((event, i) => (
              <Animatable.View key={event.id || i} animation="fadeInUp" delay={i * 50} duration={300}>
                <EventCard event={event} onPress={handleEventPress} theme={theme} />
              </Animatable.View>
            ))
          )}
        </Animatable.View>
      </ScrollView>

      <EventDetailSheet ref={detailRef} event={selectedEvent} />
    </View>
  );
};

const s = StyleSheet.create({
  root:      { flex: 1 },
  stripWrap: { borderBottomWidth: 1 },
  dateLabel: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.base },
});

export default CalendarScreen;
