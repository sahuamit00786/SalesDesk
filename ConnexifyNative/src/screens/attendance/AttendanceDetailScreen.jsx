import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { attendanceService } from '../../services/attendanceService';
import { fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import { formatTime, formatHours } from '../../utils/formatters';
import AppHeader from '../../components/navigation/AppHeader';
import AttendanceCard from '../../components/cards/AttendanceCard';
import StatCard from '../../components/cards/StatCard';
import AttendanceCalendar from '../../components/misc/AttendanceCalendar';

const VIEW = { CALENDAR: 'calendar', LIST: 'list' };

const AttendanceDetailScreen = ({ route, navigation }) => {
  const { userId, name } = route.params;
  const { theme }    = useTheme();
  const insets       = useSafeAreaInsets();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState(VIEW.CALENDAR);

  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear]   = useState(new Date().getFullYear());

  useEffect(() => { load(); }, [userId, calMonth, calYear]);

  const load = async () => {
    setLoading(true);
    try {
      const startDate = new Date(calYear, calMonth, 1).toISOString().split('T')[0];
      const endDate   = new Date(calYear, calMonth + 1, 0).toISOString().split('T')[0];
      const data = await attendanceService.getMemberAttendance(userId, {
        startDate, endDate, limit: 31,
      });
      const rows = data?.data?.rows || data?.rows || [];
      setRecords(rows);

      const present = rows.filter((r) => r.status === 'Present').length;
      const absent  = rows.filter((r) => r.status === 'Absent').length;
      const late    = rows.filter((r) => r.status === 'Late').length;
      const totalH  = rows.reduce((acc, r) => {
        if (r.checkIn && r.checkOut) {
          return acc + (new Date(r.checkOut) - new Date(r.checkIn)) / 3600000;
        }
        return acc;
      }, 0);
      setSummary({ total: rows.length, present, absent, late, avgHours: rows.length ? (totalH / rows.length).toFixed(1) : '0' });
    } catch (_) {}
    setLoading(false);
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    const now = new Date();
    if (calYear > now.getFullYear() || (calYear === now.getFullYear() && calMonth >= now.getMonth())) return;
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  };

  const s = styles(theme, insets);

  return (
    <View style={s.root}>
      <AppHeader title={name || 'Attendance'} navigation={navigation} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Summary stats */}
        {summary && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsRow}>
            <StatCard icon="calendar-month"   label="Days Tracked"  value={summary.total}     color={theme.colors.primary} style={s.stat} />
            <StatCard icon="account-check"    label="Present"       value={summary.present}   color={theme.colors.success} style={s.stat} />
            <StatCard icon="account-remove"   label="Absent"        value={summary.absent}    color={theme.colors.danger}  style={s.stat} />
            <StatCard icon="account-clock"    label="Late"          value={summary.late}      color={theme.colors.warning} style={s.stat} />
            <StatCard icon="clock-outline"    label="Avg Hours/Day" value={`${summary.avgHours}h`} color={theme.colors.accent} style={s.stat} />
          </ScrollView>
        )}

        {/* View toggle */}
        <View style={s.toggleRow}>
          <TouchableOpacity
            style={[s.toggleBtn, view === VIEW.CALENDAR && s.toggleActive]}
            onPress={() => setView(VIEW.CALENDAR)}
          >
            <Icon name="calendar-month" size={16} color={view === VIEW.CALENDAR ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[s.toggleLabel, view === VIEW.CALENDAR && { color: theme.colors.primary }]}>Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, view === VIEW.LIST && s.toggleActive]}
            onPress={() => setView(VIEW.LIST)}
          >
            <Icon name="format-list-bulleted" size={16} color={view === VIEW.LIST ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[s.toggleLabel, view === VIEW.LIST && { color: theme.colors.primary }]}>List</Text>
          </TouchableOpacity>
        </View>

        {view === VIEW.CALENDAR ? (
          <View style={s.card}>
            <View style={s.monthNav}>
              <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
                <Icon name="chevron-left" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <Text style={s.monthNavLabel}>
                {new Date(calYear, calMonth).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
                <Icon name="chevron-right" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <AttendanceCalendar records={records} year={calYear} month={calMonth} />
          </View>
        ) : (
          records.map((r, i) => (
            <AttendanceCard key={r.id || i} record={{ ...r, name }} />
          ))
        )}

        {records.length === 0 && !loading && (
          <Text style={s.empty}>No records for this month.</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = (theme, insets) => StyleSheet.create({
  root:       { flex: 1, backgroundColor: theme.colors.background },
  content:    { padding: spacing.base, paddingBottom: 40 },
  statsRow:   { gap: spacing.sm, marginBottom: spacing.base },
  stat:       { width: 130 },
  toggleRow:  { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base },
  toggleBtn:  {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  toggleActive:{ borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  toggleLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: theme.colors.textSecondary },
  card:        { backgroundColor: theme.colors.surface, borderRadius: borderRadius.lg, padding: spacing.base, ...shadows.card, marginBottom: spacing.base },
  monthNav:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  navBtn:      { padding: spacing.xs },
  monthNavLabel:{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: theme.colors.textPrimary },
  empty:       { textAlign: 'center', color: theme.colors.textMuted, fontStyle: 'italic', marginTop: spacing['2xl'] },
});

export default AttendanceDetailScreen;
