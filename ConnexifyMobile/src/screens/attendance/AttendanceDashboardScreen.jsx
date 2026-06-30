import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { useAttendanceStore } from '../../store/attendanceStore';
import { useGeolocation } from '../../hooks/useGeolocation';
import { fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import { formatTime, formatHours } from '../../utils/formatters';
import AttendanceCard from '../../components/cards/AttendanceCard';
import TeamMemberCard from '../../components/cards/TeamMemberCard';
import SectionHeader from '../../components/misc/SectionHeader';
import StatCard from '../../components/cards/StatCard';

// ─── Real week strip using attendance data ────────────────────────────────
const WeekStrip = ({ records, theme }) => {
  const today = new Date();
  const dow   = today.getDay(); // 0 = Sun

  // Get Mon–Sun of current week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - dow + i);
    return d;
  });

  const STATUS_COLOR = {
    Present: theme.colors.success,
    Absent:  theme.colors.danger,
    Late:    theme.colors.warning,
    Leave:   theme.colors.accent,
  };

  // Map records by date string
  const recordMap = {};
  (records || []).forEach((r) => {
    const d = new Date(r.date || r.checkIn || r.createdAt);
    if (!isNaN(d)) {
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      recordMap[key] = r.status;
    }
  });

  const s = weekS(theme);

  return (
    <View style={s.row}>
      {weekDays.map((d, i) => {
        const key    = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const status = recordMap[key];
        const dotColor = STATUS_COLOR[status];
        const isToday  = d.toDateString() === today.toDateString();
        const isFuture = d > today;
        const dayLabel = ['S','M','T','W','T','F','S'][d.getDay()];

        return (
          <View key={i} style={[s.day, isToday && s.today]}>
            <Text style={[s.label, isToday && s.todayLabel]}>{dayLabel}</Text>
            <Text style={[s.date, isToday && s.todayLabel]}>{d.getDate()}</Text>
            <View style={[
              s.dot,
              dotColor ? { backgroundColor: dotColor } : s.emptyDot,
              isFuture && { opacity: 0 },
            ]} />
          </View>
        );
      })}
    </View>
  );
};

const weekS = (theme) => StyleSheet.create({
  row:       { flexDirection: 'row', justifyContent: 'space-between' },
  day:       { alignItems: 'center', flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  today:     { backgroundColor: theme.colors.primaryLight },
  label:     { fontSize: fontSize.xs, color: theme.colors.textMuted, fontWeight: fontWeight.medium },
  date:      { fontSize: fontSize.sm, color: theme.colors.textPrimary, fontWeight: fontWeight.semibold },
  todayLabel:{ color: theme.colors.primary, fontWeight: fontWeight.bold },
  dot:       { width: 6, height: 6, borderRadius: 3, marginTop: 3, backgroundColor: theme.colors.border },
  emptyDot:  { backgroundColor: theme.colors.border },
});

const AttendanceDashboardScreen = ({ navigation }) => {
  const { theme }  = useTheme();
  const insets     = useSafeAreaInsets();
  const { isManager, user } = useAuthStore();
  const {
    todayStatus, myAttendance, teamAttendance, teamStats,
    fetchTodayStatus, fetchMyAttendance, fetchTeamAttendance,
    checkIn, checkOut, isCheckingIn, isCheckingOut,
  } = useAttendanceStore();

  const { getCurrentLocation, address: gpsAddress, loading: gpsLoading } = useGeolocation();

  const [refreshing, setRefreshing] = useState(false);
  const pulse = useSharedValue(1);
  const checkedIn  = !!todayStatus?.checkIn && !todayStatus?.checkOut;
  const checkedOut = !!todayStatus?.checkIn && !!todayStatus?.checkOut;

  useEffect(() => {
    if (!checkedIn && !checkedOut) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.05, { duration: 900 }), withTiming(1, { duration: 900 })),
        -1, false,
      );
    } else {
      pulse.value = withTiming(1);
    }
  }, [checkedIn, checkedOut]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const load = async () => {
    await fetchTodayStatus();
    await fetchMyAttendance({ limit: 30 });
    if (isManager()) await fetchTeamAttendance();
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleCheckIn = async () => {
    const location = await getCurrentLocation();
    const result   = await checkIn(location);
    if (result.success) Toast.show({ type: 'success', text1: 'Checked in!', text2: gpsAddress || undefined });
    else Toast.show({ type: 'error', text1: result.message });
  };

  const handleCheckOut = async () => {
    const location = await getCurrentLocation();
    const result   = await checkOut(location);
    if (result.success) Toast.show({ type: 'success', text1: 'Checked out!' });
    else Toast.show({ type: 'error', text1: result.message });
  };

  const s = styles(theme, insets);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Attendance</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* ── Check In/Out Card ──────────────────────────────────── */}
        <View style={s.card}>
          {checkedOut ? (
            <View style={s.doneRow}>
              <Icon name="check-circle" size={40} color={theme.colors.success} />
              <View>
                <Text style={s.doneTitle}>Day complete</Text>
                <Text style={s.doneMeta}>
                  In: {formatTime(todayStatus.checkIn)} · Out: {formatTime(todayStatus.checkOut)}
                </Text>
                <Text style={s.doneHours}>{formatHours(todayStatus.checkIn, todayStatus.checkOut)} worked</Text>
              </View>
            </View>
          ) : checkedIn ? (
            <View>
              <Text style={s.checkedLabel}>Checked in at</Text>
              <Text style={s.checkedTime}>{formatTime(todayStatus.checkIn)}</Text>
              {todayStatus.location && (
                <View style={s.locationRow}>
                  <Icon name="map-marker-outline" size={13} color={theme.colors.textMuted} />
                  <Text style={s.locationText} numberOfLines={1}>{todayStatus.location}</Text>
                </View>
              )}
              <TouchableOpacity
                style={s.checkoutBtn}
                onPress={handleCheckOut}
                disabled={isCheckingOut || gpsLoading}
                accessibilityLabel="Check out"
              >
                <Icon name="logout" size={20} color="#fff" />
                <Text style={s.checkBtnText}>{isCheckingOut ? 'Checking out…' : 'Check Out'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Animated.View style={pulseStyle}>
                <TouchableOpacity
                  style={s.checkinBtn}
                  onPress={handleCheckIn}
                  disabled={isCheckingIn || gpsLoading}
                  accessibilityLabel="Check in"
                >
                  <Icon name="login" size={28} color="#fff" />
                  <Text style={s.checkBtnText}>
                    {isCheckingIn || gpsLoading ? 'Getting location…' : 'Check In Now'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
              {gpsAddress && (
                <View style={[s.locationRow, { marginTop: spacing.sm }]}>
                  <Icon name="map-marker-outline" size={13} color={theme.colors.textMuted} />
                  <Text style={s.locationText} numberOfLines={1}>{gpsAddress}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── This Week strip ────────────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>This Week</Text>
          <WeekStrip records={myAttendance} theme={theme} />
        </View>

        {/* ── Manager: team today ───────────────────────────────── */}
        {isManager() && teamStats && (
          <View style={s.card}>
            <SectionHeader title="Team Today" style={s.sh} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.teamStats}>
              <StatCard icon="account-check-outline"    label="Present"    value={teamStats.present   ?? 0} color={theme.colors.success}  style={s.statCard} />
              <StatCard icon="account-remove-outline"   label="Absent"     value={teamStats.absent    ?? 0} color={theme.colors.danger}   style={s.statCard} />
              <StatCard icon="account-clock-outline"    label="Late"       value={teamStats.late      ?? 0} color={theme.colors.warning}  style={s.statCard} />
              <StatCard icon="account-question-outline" label="Not Marked" value={teamStats.notMarked ?? 0} color={theme.colors.textMuted} style={s.statCard} />
            </ScrollView>
          </View>
        )}

        {isManager() && teamAttendance.length > 0 && (
          <>
            <SectionHeader title="Team Members" style={s.sh} />
            {teamAttendance.map((record) => (
              <TeamMemberCard
                key={record.userId || record.id}
                member={{ ...record.user, todayStatus: record.status }}
                onPress={() => navigation.navigate('AttendanceDetail', {
                  userId: record.userId || record.id,
                  name:   record.user?.name,
                })}
              />
            ))}
          </>
        )}

        {myAttendance.length > 0 && (
          <>
            <SectionHeader title="My Attendance (Last 30 Days)" style={[s.sh, { marginTop: spacing.md }]} />
            {myAttendance.map((record, i) => (
              <AttendanceCard key={record.id || i} record={{ ...record, name: user?.name }} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = (theme, insets) => StyleSheet.create({
  root:     { flex: 1, backgroundColor: theme.colors.background },
  header:   {
    backgroundColor:   theme.colors.surface,
    paddingTop:        insets.top + spacing.sm,
    paddingBottom:     spacing.base,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  title:        { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: theme.colors.textPrimary },
  content:      { padding: spacing.base, paddingBottom: 40 },
  card:         { backgroundColor: theme.colors.surface, borderRadius: borderRadius.lg, padding: spacing.base, marginBottom: spacing.md, ...shadows.card },
  sectionTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: theme.colors.textPrimary, marginBottom: spacing.sm },
  checkedLabel: { fontSize: fontSize.sm, color: theme.colors.textSecondary },
  checkedTime:  { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: theme.colors.success, marginBottom: spacing.sm },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.md },
  locationText: { fontSize: fontSize.xs, color: theme.colors.textMuted, flex: 1 },
  checkinBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.success, borderRadius: borderRadius.lg, paddingVertical: spacing.lg, gap: spacing.sm },
  checkoutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.danger, borderRadius: borderRadius.md, paddingVertical: spacing.md, gap: spacing.sm },
  checkBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
  doneRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  doneTitle:    { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: theme.colors.textPrimary },
  doneMeta:     { fontSize: fontSize.sm, color: theme.colors.textSecondary },
  doneHours:    { fontSize: fontSize.sm, color: theme.colors.success, fontWeight: fontWeight.medium },
  sh:           { marginTop: spacing.sm },
  teamStats:    { gap: spacing.sm },
  statCard:     { width: 120 },
});

export default AttendanceDashboardScreen;
