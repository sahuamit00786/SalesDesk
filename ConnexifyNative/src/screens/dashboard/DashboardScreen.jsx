import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Geolocation from 'react-native-geolocation-service';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { useAttendanceStore } from '../../store/attendanceStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useDrawer } from '../../context/DrawerContext';
import { userService } from '../../services/userService';
import { activityService } from '../../services/activityService';
import { fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import StatCard from '../../components/cards/StatCard';
import ActivityCard from '../../components/cards/ActivityCard';
import LeadCard from '../../components/cards/LeadCard';
import SectionHeader from '../../components/misc/SectionHeader';
import FAB from '../../components/buttons/FAB';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence,
} from 'react-native-reanimated';

// ── Check-in / Check-out button ──────────────────────────────────────────────
const CheckInButton = ({ onCheckIn, onCheckOut, todayStatus, isLoading }) => {
  const { theme } = useTheme();
  const checkedIn  = !!todayStatus?.checkIn && !todayStatus?.checkOut;
  const checkedOut = !!todayStatus?.checkIn && !!todayStatus?.checkOut;
  const pulse      = useSharedValue(1);

  useEffect(() => {
    if (!checkedIn && !checkedOut) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.05, { duration: 850 }), withTiming(1, { duration: 850 })),
        -1, false,
      );
    } else {
      pulse.value = withTiming(1);
    }
  }, [checkedIn, checkedOut]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const fmt = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
  const s = ciStyles(theme);

  if (checkedOut) {
    return (
      <View style={s.summaryCard}>
        <View style={[s.summaryIcon, { backgroundColor: theme.colors.successBg }]}>
          <Icon name="check-circle" size={26} color={theme.colors.success} />
        </View>
        <View style={s.summaryBody}>
          <Text style={s.summaryTitle}>Day Complete</Text>
          <Text style={s.summaryMeta}>In: {fmt(todayStatus.checkIn)} · Out: {fmt(todayStatus.checkOut)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.card}>
      {checkedIn ? (
        <View style={s.checkedInRow}>
          <View>
            <Text style={s.checkedInLabel}>Checked in at</Text>
            <Text style={s.checkedInTime}>{fmt(todayStatus.checkIn)}</Text>
          </View>
          <TouchableOpacity
            style={s.checkoutBtn}
            onPress={onCheckOut}
            disabled={isLoading}
            accessibilityLabel="Check out"
          >
            <Icon name="logout" size={18} color="#fff" />
            <Text style={s.checkBtnText}>Check Out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={pulseStyle}>
          <TouchableOpacity
            style={s.checkinBtn}
            onPress={onCheckIn}
            disabled={isLoading}
            accessibilityLabel="Check in"
          >
            <Icon name="login" size={22} color="#fff" />
            <Text style={s.checkBtnText}>Check In Now</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const ciStyles = (theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    ...shadows.card,
    marginBottom: spacing.base,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    ...shadows.card,
    marginBottom: spacing.base,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBody: {},
  summaryTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: theme.colors.textPrimary },
  summaryMeta:  { fontSize: fontSize.sm, color: theme.colors.textSecondary, marginTop: 2 },
  checkedInRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkedInLabel: { fontSize: fontSize.sm, color: theme.colors.textSecondary },
  checkedInTime:  { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: theme.colors.success },
  checkinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.danger,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    gap: 6,
  },
  checkBtnText: { color: '#fff', fontWeight: fontWeight.bold, fontSize: fontSize.base },
});

// ── Main Screen ──────────────────────────────────────────────────────────────
const DashboardScreen = ({ navigation }) => {
  const { theme }   = useTheme();
  const insets      = useSafeAreaInsets();
  const { user, isManager } = useAuthStore();
  const { todayStatus, checkIn, checkOut, fetchTodayStatus, isCheckingIn, isCheckingOut } = useAttendanceStore();
  const { unreadCount, startPolling, stopPolling } = useNotificationStore();
  const { openDrawer } = useDrawer();

  const [stats, setStats]         = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [activities, setActivities] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const load = useCallback(async () => {
    try {
      const [s, f, a] = await Promise.allSettled([
        userService.getDashboardStats(),
        userService.getMyFollowUps(),
        activityService.getMyActivitiesToday(),
      ]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (f.status === 'fulfilled') setFollowUps(f.value?.data?.rows || f.value?.rows || []);
      if (a.status === 'fulfilled') setActivities(a.value?.data?.rows || a.value?.rows || []);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchTodayStatus();
    load();
    startPolling();
    return () => stopPolling();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTodayStatus(), load()]);
    setRefreshing(false);
  };

  const getLocation = () =>
    new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        ()    => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });

  const handleCheckIn = async () => {
    const coords = await getLocation();
    const result = await checkIn(coords);
    if (result.success) Toast.show({ type: 'success', text1: 'Checked in successfully' });
    else Toast.show({ type: 'error', text1: 'Check-in failed', text2: result.message });
  };

  const handleCheckOut = async () => {
    const coords = await getLocation();
    const result = await checkOut(coords);
    if (result.success) Toast.show({ type: 'success', text1: 'Checked out successfully' });
    else Toast.show({ type: 'error', text1: 'Check-out failed', text2: result.message });
  };

  const s = styles(theme, insets);
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Animatable.View animation="fadeInDown" duration={400} style={s.headerRow}>
          {/* Hamburger */}
          <TouchableOpacity style={s.menuBtn} onPress={openDrawer} accessibilityLabel="Open menu">
            <Icon name="menu" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          {/* Greeting */}
          <View style={s.greetingBlock}>
            <Text style={s.greeting} numberOfLines={1}>
              {greeting()}, {user?.name?.split(' ')[0]} 👋
            </Text>
            <Text style={s.date}>{today}</Text>
          </View>

          {/* Notification bell */}
          <TouchableOpacity
            style={s.bellBtn}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityLabel="Notifications"
          >
            <Icon name="bell-outline" size={22} color={theme.colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={[s.bellBadge, { backgroundColor: theme.colors.danger }]}>
                <Text style={s.bellCount}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animatable.View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        <CheckInButton
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          todayStatus={todayStatus}
          isLoading={isCheckingIn || isCheckingOut}
        />

        {/* KPI row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statRow}>
          <StatCard icon="account-plus-outline"   label="My Leads Today"    value={stats?.myLeadsToday ?? 0}         color={theme.colors.primary}  style={s.stat} onPress={() => navigation.navigate('Leads')} />
          <StatCard icon="briefcase-outline"       label="Open Deals"        value={stats?.openDeals ?? 0}            color="#8B5CF6"               style={s.stat} onPress={() => navigation.navigate('Deals')} />
          <StatCard icon="clock-alert-outline"    label="Follow-ups Due"    value={stats?.followUpsPending ?? 0}     color={theme.colors.warning}  style={s.stat} />
          <StatCard icon="lightning-bolt"          label="Activities Today"  value={stats?.activitiesToday ?? 0}      color={theme.colors.success}  style={s.stat} onPress={() => navigation.navigate('Activity')} />
          <StatCard icon="calendar-check-outline" label="Meetings"          value={stats?.meetingsToday ?? 0}        color={theme.colors.accent}   style={s.stat} onPress={() => navigation.navigate('Calendar')} />
          {isManager() && (
            <StatCard icon="calendar-account"     label="Leave Approvals"   value={stats?.pendingLeaveApprovals ?? 0} color={theme.colors.danger}  style={s.stat} onPress={() => navigation.navigate('Leave')} />
          )}
        </ScrollView>

        {followUps.length > 0 && (
          <Animatable.View animation="fadeInUp" duration={400} delay={100}>
            <SectionHeader
              title="Pending Follow-ups"
              actionTitle="See all"
              onAction={() => navigation.navigate('Leads')}
              style={s.sectionHeader}
            />
            {followUps.slice(0, 5).map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onPress={() => navigation.navigate('LeadDetail', { id: lead.id })}
              />
            ))}
          </Animatable.View>
        )}

        {activities.length > 0 && (
          <Animatable.View animation="fadeInUp" duration={400} delay={200}>
            <SectionHeader
              title="Today's Activity"
              actionTitle="See all"
              onAction={() => navigation.navigate('Activity')}
              style={s.sectionHeader}
            />
            {activities.slice(0, 8).map((act) => (
              <ActivityCard key={act.id} activity={act} />
            ))}
          </Animatable.View>
        )}
      </ScrollView>

      <FAB icon="plus" onPress={() => navigation.navigate('AddLead')} />
    </View>
  );
};

const styles = (theme, insets) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: theme.colors.background },
  header: {
    backgroundColor: theme.colors.surface,
    paddingTop:      insets.top + spacing.xs,
    paddingBottom:   spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  menuBtn:       { padding: spacing.sm, borderRadius: borderRadius.md },
  greetingBlock: { flex: 1, paddingLeft: spacing.xs },
  greeting:      { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: theme.colors.textPrimary },
  date:          { fontSize: fontSize.xs, color: theme.colors.textSecondary, marginTop: 1 },
  bellBtn:       { padding: spacing.sm, position: 'relative' },
  bellBadge:     {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  bellCount:     { color: '#fff', fontSize: 9, fontWeight: fontWeight.bold },
  scroll:        { flex: 1 },
  content:       { padding: spacing.base, paddingBottom: 110 },
  statRow:       { paddingBottom: spacing.base, gap: spacing.sm },
  stat:          { width: 148 },
  sectionHeader: { marginTop: spacing.lg },
});

export default DashboardScreen;
