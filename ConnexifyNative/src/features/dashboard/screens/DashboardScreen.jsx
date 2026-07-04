import React, { useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppText from '../../../design-system/components/AppText';
import IconButton from '../../../design-system/components/IconButton';
import Card, { PressableCard } from '../../../design-system/components/Card';
import StatCard from '../../../design-system/components/StatCard';
import Badge from '../../../design-system/components/Badge';
import Avatar from '../../../design-system/components/Avatar';
import FAB from '../../../design-system/components/FAB';
import ProgressBar from '../../../design-system/components/ProgressBar';
import { SegmentedTabs } from '../../../design-system/components/SegmentedTabs';
import { Divider } from '../../../design-system/components/SectionHeader';
import SectionHeader from '../../../design-system/components/SectionHeader';
import { Skeleton } from '../../../design-system/components/Skeleton';
import BarChartCard from '../../../design-system/components/charts/BarChartCard';
import DonutChartCard from '../../../design-system/components/charts/DonutChartCard';
import LineChartCard from '../../../design-system/components/charts/LineChartCard';
import WorkspaceSwitcherSheet from '../../workspace/WorkspaceSwitcherSheet';
import SideDrawer from '../../../design-system/components/SideDrawer';
import HomeSidebarMenu from '../../more/HomeSidebarMenu';
import {
  Bell,
  Menu,
  Users,
  Briefcase,
  Phone,
  Video,
  Mail,
  ListTodo,
  ChevronDown,
  Clock,
  CalendarClock,
  StickyNote,
  CheckSquare,
  Activity as ActivityIcon,
  Award,
} from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useAuthStore } from '../../../stores/authStore';
import { useWorkspaceStore, resolveActiveWorkspace } from '../../../stores/workspaceStore';
import { useDashboard } from '../hooks';
import { useUnreadCount } from '../../notifications/hooks';
import { useCan } from '../../../hooks/permissions';
import { categorical, leadStatusChartColors } from '../../../design-system/tokens/chartPalette';
import { formatMoney, formatNumber, formatTime, relativeTime, formatDate } from '../../../utils/format';
import { ROUTES, ROUTE_PERMISSIONS } from '../../../navigation/routes';

const FEED_ICONS = { call: Phone, email: Mail, meeting: Video, note: StickyNote, task: CheckSquare };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const preferredId = useWorkspaceStore((s) => s.preferredId);
  const workspace = resolveActiveWorkspace(user, preferredId);
  const workspaceRef = useRef(null);
  const drawerRef = useRef(null);

  const [rangeDays, setRangeDays] = useState(30);
  const [scope, setScope] = useState('all');
  const { charts, upcomingMeetings, expiringTasks, feed, refetchAll, isRefreshing } = useDashboard(rangeDays, scope);
  const unread = useUnreadCount();
  const canLeads = useCan(ROUTE_PERMISSIONS[ROUTES.TAB_LEADS]);

  const kpis = charts.data?.kpis || {};
  const c = charts.data?.charts || {};
  const cat = categorical(theme.dark);
  const statusColors = leadStatusChartColors[theme.dark ? 'dark' : 'light'];

  const activityCount = (type) =>
    (c.activitiesByType || []).find((a) => String(a.name).toLowerCase() === type)?.value ?? 0;

  const loading = charts.isPending;
  const winRate =
    Number(kpis.pipelineValue) > 0 ? Math.min(1, Number(kpis.wonValue) / Number(kpis.pipelineValue)) : 0;

  const throughputSeries = useMemo(() => {
    const pts = c.tasksThroughput || [];
    const label = (d) => formatDate(d, { withYear: false });
    return [
      { label: 'Created', color: cat[0], points: pts.map((p) => ({ label: label(p.date), value: p.created })) },
      { label: 'Completed', color: cat[4], points: pts.map((p) => ({ label: label(p.date), value: p.completed })) },
    ];
  }, [c.tasksThroughput, cat]);

  const s = styles(theme);

  return (
    <ScreenScaffold>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refetchAll} tintColor={theme.brand} colors={[theme.brand]} />
        }
      >
        {/* Header */}
        <View style={s.headerRow}>
          <IconButton icon={Menu} accessibilityLabel="Open menu" onPress={() => drawerRef.current?.open()} />
          <View style={s.headerTexts}>
            <AppText variant="caption" color="inkMuted">
              {greeting()},
            </AppText>
            <AppText variant="title" numberOfLines={1}>
              {String(user?.name || '').split(' ')[0] || 'there'} 👋
            </AppText>
          </View>
          <IconButton
            icon={Bell}
            accessibilityLabel="Notifications"
            badge={unread.data || 0}
            onPress={() => navigation.navigate(ROUTES.NOTIFICATIONS)}
          />
        </View>

        {/* Workspace pill */}
        <Pressable
          onPress={() => workspaceRef.current?.open()}
          accessibilityRole="button"
          accessibilityLabel="Switch workspace"
          style={[s.workspacePill, { backgroundColor: theme.brandSoft, borderRadius: theme.radius.full }]}
        >
          <View style={[s.wsDot, { backgroundColor: theme.brand }]} />
          <AppText variant="captionStrong" color={theme.dark ? theme.colors.ink : theme.brand} numberOfLines={1}>
            {workspace?.name || 'Workspace'}
          </AppText>
          <ChevronDown size={14} color={theme.dark ? theme.colors.inkMuted : theme.brand} strokeWidth={2.4} />
        </Pressable>

        {/* Range + scope */}
        <Animated.View entering={FadeInDown.duration(350)} style={s.controls}>
          <SegmentedTabs
            tabs={[
              { key: 7, label: '7 days' },
              { key: 30, label: '30 days' },
              { key: 90, label: '90 days' },
            ]}
            value={rangeDays}
            onChange={setRangeDays}
            style={s.rangeTabs}
          />
          <SegmentedTabs
            tabs={[
              { key: 'all', label: 'Team' },
              { key: 'mine', label: 'Mine' },
            ]}
            value={scope}
            onChange={setScope}
            style={s.scopeTabs}
          />
        </Animated.View>

        {/* Stat grid */}
        <View style={s.statGrid}>
          <StatCard label="Total leads" value={formatNumber(kpis.totalLeads)} icon={Users} loading={loading} />
          <StatCard label="Opportunities" value={formatNumber(kpis.totalOpps)} icon={Briefcase} tint="#0284C7" loading={loading} />
        </View>
        <View style={s.statGrid}>
          <StatCard label="Calls" value={formatNumber(activityCount('call'))} icon={Phone} tint="#0D9488" loading={loading} />
          <StatCard label="Meetings" value={formatNumber(activityCount('meeting'))} icon={Video} tint="#B45309" loading={loading} />
          <StatCard label="Emails" value={formatNumber(activityCount('email'))} icon={Mail} tint="#BE185D" loading={loading} />
        </View>
        <View style={s.statGrid}>
          <StatCard label="Open tasks" value={formatNumber(kpis.openTasks)} icon={ListTodo} tint="#4338CA" loading={loading} />
          <StatCard
            label="Overdue tasks"
            value={formatNumber(kpis.overdueTasks)}
            icon={Clock}
            tint={Number(kpis.overdueTasks) > 0 ? theme.colors.danger : theme.colors.success}
            loading={loading}
          />
        </View>

        {/* Revenue forecast */}
        <Animated.View entering={FadeInDown.duration(350).delay(60)}>
          <Card style={s.forecastCard}>
            <SectionHeader title="Revenue forecast" />
            <View style={s.forecastRow}>
              <View style={s.forecastCol}>
                <AppText variant="caption" color="inkMuted">
                  Pipeline value
                </AppText>
                {loading ? (
                  <Skeleton width={90} height={20} style={s.kpiSkeleton} />
                ) : (
                  <AppText variant="heading">{formatMoney(kpis.pipelineValue, theme.currency, { compact: true })}</AppText>
                )}
              </View>
              <View style={s.forecastCol}>
                <AppText variant="caption" color="inkMuted">
                  Won value
                </AppText>
                {loading ? (
                  <Skeleton width={90} height={20} style={s.kpiSkeleton} />
                ) : (
                  <AppText variant="heading" color="success">
                    {formatMoney(kpis.wonValue, theme.currency, { compact: true })}
                  </AppText>
                )}
              </View>
            </View>
            <View style={s.winRateRow}>
              <AppText variant="caption" color="inkMuted">
                Win rate
              </AppText>
              <AppText variant="captionStrong">{Math.round(winRate * 100)}%</AppText>
            </View>
            <ProgressBar value={winRate} color={theme.colors.success} />
          </Card>
        </Animated.View>

        {/* Upcoming meetings */}
        <SectionHeader
          title="Upcoming meetings"
          action="Calendar"
          onAction={() => navigation.navigate(ROUTES.CALENDAR)}
          style={s.sectionHeader}
        />
        <Card padded={false} style={s.sectionCard}>
          {upcomingMeetings.isPending ? (
            <View style={s.innerPad}>
              <Skeleton height={44} />
              <Skeleton height={44} style={s.skelGap} />
            </View>
          ) : (upcomingMeetings.data || []).length === 0 ? (
            <View style={s.innerPad}>
              <AppText variant="body" color="inkFaint">
                Nothing scheduled in the next 48 hours
              </AppText>
            </View>
          ) : (
            upcomingMeetings.data.map((event, i) => (
              <View key={event.id || i}>
                {i > 0 ? <Divider inset={60} /> : null}
                <View style={s.meetingRow}>
                  <View style={[s.meetingIcon, { backgroundColor: theme.brandFaint, borderRadius: theme.radius.md }]}>
                    <CalendarClock size={18} color={theme.brand} strokeWidth={2.1} />
                  </View>
                  <View style={s.rowTexts}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {event.title || 'Meeting'}
                    </AppText>
                    <AppText variant="caption" color="inkMuted">
                      {formatDate(event.start || event.scheduledStart, { withYear: false })} ·{' '}
                      {formatTime(event.start || event.scheduledStart)}
                    </AppText>
                  </View>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* Tasks expiring soon */}
        <SectionHeader
          title="Tasks due soon"
          action="All tasks"
          onAction={() => navigation.navigate(ROUTES.TASKS, { title: 'Tasks' })}
          style={s.sectionHeader}
        />
        <Card padded={false} style={s.sectionCard}>
          {expiringTasks.isPending ? (
            <View style={s.innerPad}>
              <Skeleton height={44} />
              <Skeleton height={44} style={s.skelGap} />
            </View>
          ) : (expiringTasks.data || []).length === 0 ? (
            <View style={s.innerPad}>
              <AppText variant="body" color="inkFaint">
                No tasks due in the next 7 days
              </AppText>
            </View>
          ) : (
            expiringTasks.data.map((task, i) => {
              const overdue = task.dueAt && new Date(task.dueAt).getTime() < Date.now();
              return (
                <View key={task.id}>
                  {i > 0 ? <Divider inset={60} /> : null}
                  <View style={s.meetingRow}>
                    <View
                      style={[
                        s.meetingIcon,
                        { backgroundColor: overdue ? theme.colors.dangerSoft : theme.colors.warningSoft, borderRadius: theme.radius.md },
                      ]}
                    >
                      <ListTodo size={18} color={overdue ? theme.colors.danger : theme.colors.warning} strokeWidth={2.1} />
                    </View>
                    <View style={s.rowTexts}>
                      <AppText variant="bodyStrong" numberOfLines={1}>
                        {task.title}
                      </AppText>
                      <AppText variant="caption" color={overdue ? 'danger' : 'inkMuted'}>
                        {overdue ? 'Overdue · ' : 'Due '}
                        {formatDate(task.dueAt, { withYear: false })}
                        {task.lead?.contactName ? ` · ${task.lead.contactName}` : ''}
                      </AppText>
                    </View>
                    {task.priority ? (
                      <Badge
                        label={task.priority}
                        tone={task.priority === 'urgent' || task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'neutral'}
                        size="sm"
                      />
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* Charts */}
        <SectionHeader title="Trends & breakdowns" style={s.sectionHeader} />
        <BarChartCard
          title="Lead status"
          items={(c.leadStatusDist || []).map((r) => ({
            label: r.name,
            value: r.value,
            color: statusColors[String(r.name).toLowerCase()] || cat[0],
          }))}
        />
        <DonutChartCard
          title="Opportunity stages"
          items={(c.oppStatusDist || []).slice(0, 6).map((r, i) => ({ label: r.name, value: r.value, color: cat[i % cat.length] }))}
        />
        <BarChartCard
          title="Pipeline value by stage"
          items={(c.pipelineByStage || []).slice(0, 6).map((r, i) => ({ label: r.name, value: r.value, color: cat[i % cat.length] }))}
          formatValue={(v) => formatMoney(v, theme.currency, { compact: true })}
        />
        <DonutChartCard
          title="Activities by type"
          items={(c.activitiesByType || []).slice(0, 6).map((r, i) => ({ label: r.name, value: r.value, color: cat[i % cat.length] }))}
        />
        <LineChartCard title="Tasks throughput" series={throughputSeries} />

        {/* Top performers */}
        {(charts.data?.topMembers || []).length > 0 ? (
          <>
            <SectionHeader title="Top performers" style={s.sectionHeader} />
            <Card padded={false} style={s.sectionCard}>
              {charts.data.topMembers.map((m, i) => (
                <View key={m.name}>
                  {i > 0 ? <Divider inset={60} /> : null}
                  <View style={s.meetingRow}>
                    <View style={s.rankWrap}>
                      {i === 0 ? (
                        <Award size={18} color="#B45309" strokeWidth={2.2} />
                      ) : (
                        <AppText variant="captionStrong" color="inkFaint">
                          #{i + 1}
                        </AppText>
                      )}
                    </View>
                    <Avatar name={m.name} size={34} />
                    <View style={s.rowTexts}>
                      <AppText variant="bodyStrong" numberOfLines={1}>
                        {m.name}
                      </AppText>
                      <AppText variant="caption" color="inkMuted">
                        {m.leadsOwned} leads · {m.tasksCompleted} tasks done · {m.activities} activities
                      </AppText>
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {/* Recent activity */}
        <SectionHeader
          title="Recent activity"
          action="View all"
          onAction={() => navigation.navigate(ROUTES.TAB_ACTIVITIES)}
          style={s.sectionHeader}
        />
        <Card padded={false} style={[s.sectionCard, s.lastCard]}>
          {feed.isPending ? (
            <View style={s.innerPad}>
              <Skeleton height={44} />
              <Skeleton height={44} style={s.skelGap} />
            </View>
          ) : (feed.data || []).length === 0 ? (
            <View style={s.innerPad}>
              <AppText variant="body" color="inkFaint">
                No activity yet — log a call or note from a lead
              </AppText>
            </View>
          ) : (
            feed.data.map((activity, i) => {
              const Icon = FEED_ICONS[activity.type] || ActivityIcon;
              return (
                <View key={activity.id || i}>
                  {i > 0 ? <Divider inset={60} /> : null}
                  <View style={s.meetingRow}>
                    <View style={[s.meetingIcon, { backgroundColor: theme.brandFaint, borderRadius: theme.radius.full }]}>
                      <Icon size={16} color={theme.brand} strokeWidth={2.1} />
                    </View>
                    <View style={s.rowTexts}>
                      <AppText variant="body" numberOfLines={2}>
                        {activity.body || activity.type}
                      </AppText>
                      <AppText variant="micro" color="inkFaint" style={s.feedTime}>
                        {relativeTime(activity.createdAt)}
                      </AppText>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>

      {canLeads ? <FAB label="Add lead" onPress={() => navigation.navigate(ROUTES.ADD_LEAD)} bottomOffset={0} /> : null}
      <WorkspaceSwitcherSheet ref={workspaceRef} />
      <SideDrawer ref={drawerRef} title="Menu">
        <HomeSidebarMenu navigation={navigation} onNavigate={() => drawerRef.current?.close()} />
      </SideDrawer>
    </ScreenScaffold>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: 16, paddingBottom: 110 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerTexts: { flex: 1, marginLeft: 12, marginRight: 12 },
    workspacePill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 7,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginTop: 10,
    },
    wsDot: { width: 8, height: 8, borderRadius: 4 },
    controls: { marginTop: 14, gap: 8 },
    rangeTabs: {},
    scopeTabs: { alignSelf: 'stretch' },
    statGrid: { flexDirection: 'row', gap: 10, marginTop: 10 },
    forecastCard: { marginTop: 14 },
    forecastRow: { flexDirection: 'row', marginTop: 12, marginBottom: 14 },
    forecastCol: { flex: 1 },
    winRateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    kpiSkeleton: { marginTop: 4 },
    sectionHeader: { marginTop: 22, marginBottom: 10 },
    sectionCard: { paddingVertical: 4 },
    lastCard: { marginBottom: 8 },
    innerPad: { padding: 16 },
    skelGap: { marginTop: 10 },
    meetingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11 },
    meetingIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    rowTexts: { flex: 1 },
    rankWrap: { width: 24, alignItems: 'center' },
    feedTime: { marginTop: 3 },
  });
