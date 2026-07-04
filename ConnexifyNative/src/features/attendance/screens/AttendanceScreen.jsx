import React, { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import Toast from 'react-native-toast-message';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import Badge from '../../../design-system/components/Badge';
import Button from '../../../design-system/components/Button';
import Avatar from '../../../design-system/components/Avatar';
import IconButton from '../../../design-system/components/IconButton';
import { SegmentedTabs } from '../../../design-system/components/SegmentedTabs';
import { Divider } from '../../../design-system/components/SectionHeader';
import { Skeleton } from '../../../design-system/components/Skeleton';
import ErrorState from '../../../design-system/components/ErrorState';
import EmptyState from '../../../design-system/components/EmptyState';
import { MapPin, LogIn, LogOut, ChevronLeft, ChevronRight, CalendarCheck, Clock } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useAttendanceToday, useMyAttendance, useTeamAttendance, useAttendanceMutations } from '../hooks';
import { useIsHrManagerOrAdmin } from '../../../hooks/permissions';
import { formatDate, formatTime } from '../../../utils/format';

const STATUS_TONES = { present: 'success', late: 'warning', absent: 'danger', half_day: 'info', leave: 'brand' };

async function getCoords() {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
      title: 'Location for attendance',
      message: 'LeadNest records your location at check-in and check-out.',
      buttonPositive: 'Allow',
    });
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Location permission denied');
  }
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(new Error(err.message || 'Could not get location')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  });
}

function ElapsedTimer({ since }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  const mins = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 60000));
  return (
    <AppText variant="display">
      {Math.floor(mins / 60)}h {mins % 60}m
    </AppText>
  );
}

export default function AttendanceScreen() {
  const theme = useTheme();
  const isManager = useIsHrManagerOrAdmin();
  const [segment, setSegment] = useState('me');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const today = useAttendanceToday();
  const mine = useMyAttendance(year, month);
  const team = useTeamAttendance(isManager && segment === 'team');
  const { checkIn, checkOut } = useAttendanceMutations();
  const [locating, setLocating] = useState(false);

  const doPunch = async (mutation, successMsg) => {
    try {
      setLocating(true);
      const coords = await getCoords();
      await mutation.mutateAsync(coords);
      Toast.show({ type: 'success', text1: successMsg });
    } catch (err) {
      if (err?.message && !err.code) Toast.show({ type: 'error', text1: err.message });
    } finally {
      setLocating(false);
    }
  };

  const shiftMonth = (delta) => {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };

  const t = today.data || {};
  const open = t.hasOpenSession;
  const stats = mine.data?.stats || {};
  const logs = mine.data?.logs || [];
  const teamRows = Array.isArray(team.data) ? team.data : team.data?.members || team.data?.rows || [];

  return (
    <ScreenScaffold>
      <AppHeader title="Attendance" />
      {isManager ? (
        <View style={styles.segmentWrap}>
          <SegmentedTabs
            tabs={[
              { key: 'me', label: 'My attendance' },
              { key: 'team', label: 'Team today' },
            ]}
            value={segment}
            onChange={setSegment}
          />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={today.isRefetching || mine.isRefetching}
            onRefresh={() => {
              today.refetch();
              mine.refetch();
              if (isManager) team.refetch();
            }}
            tintColor={theme.brand}
            colors={[theme.brand]}
          />
        }
      >
        {segment === 'me' ? (
          <>
            {/* Today card */}
            <Animated.View entering={FadeInDown.duration(300)}>
              <Card style={styles.todayCard}>
                {today.isPending ? (
                  <Skeleton height={120} />
                ) : (
                  <View style={styles.todayCenter}>
                    <AppText variant="caption" color="inkMuted">
                      {formatDate(new Date())}
                    </AppText>
                    {open && t.openSession?.checkInTime ? (
                      <>
                        <ElapsedTimer since={t.openSession.checkInTime} />
                        <AppText variant="caption" color="inkMuted">
                          Checked in at {formatTime(t.openSession.checkInTime)}
                        </AppText>
                      </>
                    ) : (
                      <>
                        <AppText variant="display">
                          {t.totalHours != null ? `${Number(t.totalHours).toFixed(1)}h` : '—'}
                        </AppText>
                        <AppText variant="caption" color="inkMuted">
                          {t.sessions?.length ? `${t.sessions.length} session${t.sessions.length > 1 ? 's' : ''} today` : 'Not checked in yet'}
                        </AppText>
                      </>
                    )}
                    {t.status ? <Badge label={t.status.replace('_', ' ')} tone={STATUS_TONES[t.status] || 'neutral'} style={styles.todayBadge} /> : null}
                    <Button
                      title={open ? 'Check out' : 'Check in'}
                      icon={open ? LogOut : LogIn}
                      variant={open ? 'dangerSoft' : 'primary'}
                      size="lg"
                      fullWidth
                      loading={locating || checkIn.isPending || checkOut.isPending}
                      onPress={() => (open ? doPunch(checkOut, 'Checked out') : doPunch(checkIn, 'Checked in'))}
                      style={styles.punchBtn}
                    />
                    <View style={styles.gpsRow}>
                      <MapPin size={12} color={theme.colors.inkFaint} strokeWidth={2} />
                      <AppText variant="micro" color="inkFaint">
                        Location is recorded at check-in/out
                      </AppText>
                    </View>
                  </View>
                )}
              </Card>
            </Animated.View>

            {/* Month summary */}
            <View style={styles.monthHeader}>
              <IconButton icon={ChevronLeft} size={34} accessibilityLabel="Previous month" onPress={() => shiftMonth(-1)} />
              <AppText variant="subheading">
                {new Date(year, month - 1).toLocaleString('en', { month: 'long' })} {year}
              </AppText>
              <IconButton icon={ChevronRight} size={34} accessibilityLabel="Next month" onPress={() => shiftMonth(1)} />
            </View>

            <View style={styles.statsRow}>
              {[
                { key: 'present', label: 'Present', tone: 'success' },
                { key: 'late', label: 'Late', tone: 'warning' },
                { key: 'half_day', label: 'Half day', tone: 'info' },
                { key: 'absent', label: 'Absent', tone: 'danger' },
              ].map((s) => (
                <Card key={s.key} style={styles.statCell}>
                  <AppText variant="heading">{stats[s.key] ?? 0}</AppText>
                  <Badge label={s.label} tone={s.tone} size="sm" />
                </Card>
              ))}
            </View>
            <Card style={styles.hoursCard}>
              <View style={styles.hoursRow}>
                <Clock size={16} color={theme.brand} strokeWidth={2.1} />
                <AppText variant="bodyStrong">{Number(stats.totalHours || 0).toFixed(1)} hours</AppText>
                <AppText variant="caption" color="inkMuted">
                  worked this month
                </AppText>
              </View>
            </Card>

            {mine.isPending ? (
              <Skeleton height={160} style={styles.logsSkeleton} />
            ) : mine.isError ? (
              <ErrorState error={mine.error} onRetry={mine.refetch} compact />
            ) : logs.length === 0 ? (
              <EmptyState compact icon={CalendarCheck} title="No records this month" />
            ) : (
              <Card padded={false} style={styles.logsCard}>
                {logs.map((log, i) => (
                  <View key={log.id || log.date}>
                    {i > 0 ? <Divider inset={16} /> : null}
                    <View style={styles.logRow}>
                      <AppText variant="bodyStrong" style={styles.logDate}>
                        {formatDate(log.date, { withYear: false })}
                      </AppText>
                      <AppText variant="caption" color="inkMuted" style={styles.logTimes}>
                        {log.checkInTime ? formatTime(log.checkInTime) : '—'}
                        {' → '}
                        {log.checkOutTime ? formatTime(log.checkOutTime) : '—'}
                      </AppText>
                      <Badge label={(log.status || '—').replace('_', ' ')} tone={STATUS_TONES[log.status] || 'neutral'} size="sm" />
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </>
        ) : (
          /* Team today (manager) */
          <>
            {team.isPending ? (
              <Skeleton height={220} />
            ) : team.isError ? (
              <ErrorState error={team.error} onRetry={team.refetch} compact />
            ) : teamRows.length === 0 ? (
              <EmptyState compact icon={CalendarCheck} title="No team data" message="Team members' attendance appears here." />
            ) : (
              <Card padded={false} style={styles.logsCard}>
                {teamRows.map((row, i) => {
                  const member = row.user || row.member || row;
                  const log = row.log || row.attendance || row;
                  return (
                    <View key={member.id || i}>
                      {i > 0 ? <Divider inset={62} /> : null}
                      <View style={styles.teamRow}>
                        <Avatar name={member.name} size={38} />
                        <View style={styles.flex}>
                          <AppText variant="bodyStrong" numberOfLines={1}>
                            {member.name || '—'}
                          </AppText>
                          <AppText variant="micro" color="inkFaint">
                            {log?.checkInTime ? `In ${formatTime(log.checkInTime)}` : 'Not checked in'}
                            {log?.checkOutTime ? ` · Out ${formatTime(log.checkOutTime)}` : ''}
                          </AppText>
                        </View>
                        <Badge
                          label={(log?.status || 'absent').replace('_', ' ')}
                          tone={STATUS_TONES[log?.status] || 'danger'}
                          size="sm"
                        />
                      </View>
                    </View>
                  );
                })}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  segmentWrap: { paddingHorizontal: 16, marginBottom: 10 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  todayCard: { marginBottom: 16 },
  todayCenter: { alignItems: 'center' },
  todayBadge: { marginTop: 10 },
  punchBtn: { marginTop: 16 },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statCell: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12 },
  hoursCard: { marginBottom: 12 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logsCard: { paddingVertical: 4, marginBottom: 8 },
  logsSkeleton: { marginTop: 4 },
  logRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, gap: 10 },
  logDate: { width: 64 },
  logTimes: { flex: 1 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  flex: { flex: 1 },
});
