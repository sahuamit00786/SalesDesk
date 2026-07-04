import React, { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ScreenScaffold from '../../components/ScreenScaffold';
import AppText from '../../design-system/components/AppText';
import Card from '../../design-system/components/Card';
import Avatar from '../../design-system/components/Avatar';
import Badge from '../../design-system/components/Badge';
import ListRow from '../../design-system/components/ListRow';
import { Divider } from '../../design-system/components/SectionHeader';
import ConfirmSheet from '../../design-system/components/ConfirmSheet';
import WorkspaceSwitcherSheet from '../workspace/WorkspaceSwitcherSheet';
import {
  ListTodo,
  Phone,
  Video,
  CalendarDays,
  User,
  Palette,
  Fingerprint,
  LogOut,
  ChevronDown,
  Building2,
} from '../../design-system/icons';
import { useTheme } from '../../design-system/ThemeProvider';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore, resolveActiveWorkspace } from '../../stores/workspaceStore';
import { useCan } from '../../hooks/permissions';
import { ROUTES, ROUTE_PERMISSIONS } from '../../navigation/routes';

function Section({ title, items, navigation, delay }) {
  const visible = items.filter((item) => item.visible !== false);
  if (!visible.length) return null;
  return (
    <Animated.View entering={FadeInDown.duration(350).delay(delay)}>
      <AppText variant="captionStrong" color="inkFaint" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </AppText>
      <Card padded={false} style={styles.sectionCard}>
        {visible.map((item, i) => (
          <View key={item.label}>
            {i > 0 ? <Divider inset={64} /> : null}
            <ListRow
              icon={item.icon}
              title={item.label}
              subtitle={item.subtitle}
              onPress={item.onPress || (() => navigation.navigate(item.route, item.params))}
              destructive={item.destructive}
              trailing={item.trailing}
              chevron={!item.trailing}
            />
          </View>
        ))}
      </Card>
    </Animated.View>
  );
}

export default function MoreHubScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const preferredId = useWorkspaceStore((s) => s.preferredId);
  const workspace = resolveActiveWorkspace(user, preferredId);

  const confirmRef = useRef(null);
  const workspaceRef = useRef(null);

  const can = {
    tasks: useCan(ROUTE_PERMISSIONS[ROUTES.TASKS]),
    meetings: useCan(ROUTE_PERMISSIONS[ROUTES.MEETINGS]),
    calendar: useCan(ROUTE_PERMISSIONS[ROUTES.CALENDAR]),
  };

  const roleName = user?.isCompanyAdmin ? 'Company admin' : user?.companyRole?.name || 'Member';

  return (
    <ScreenScaffold>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="title" style={styles.pageTitle}>
          More
        </AppText>

        {/* Profile card */}
        <Animated.View entering={FadeInDown.duration(350)}>
          <Card style={styles.profileCard}>
            <Pressable
              style={styles.profileRow}
              onPress={() => navigation.navigate(ROUTES.PROFILE)}
              accessibilityRole="button"
            >
              <Avatar name={user?.name} uri={user?.profilePhotoUrl || user?.avatar} size={52} />
              <View style={styles.profileTexts}>
                <AppText variant="subheading" numberOfLines={1}>
                  {user?.name || '—'}
                </AppText>
                <AppText variant="caption" color="inkMuted" numberOfLines={1}>
                  {user?.email}
                </AppText>
                <Badge label={roleName} tone="brand" size="sm" style={styles.roleBadge} />
              </View>
            </Pressable>
            <Divider style={styles.profileDivider} />
            <Pressable
              style={styles.workspaceRow}
              onPress={() => workspaceRef.current?.open()}
              accessibilityRole="button"
              accessibilityLabel="Switch workspace"
            >
              <View style={[styles.wsSwatch, { backgroundColor: theme.brand, borderRadius: theme.radius.sm }]}>
                <Building2 size={14} color={theme.onBrand} strokeWidth={2.2} />
              </View>
              <View style={styles.profileTexts}>
                <AppText variant="captionStrong" color="inkFaint">
                  WORKSPACE
                </AppText>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {workspace?.name || 'Default'}
                </AppText>
              </View>
              <ChevronDown size={18} color={theme.colors.inkFaint} strokeWidth={2.2} />
            </Pressable>
          </Card>
        </Animated.View>

        <Section
          navigation={navigation}
          delay={110}
          title="Engage"
          items={[
            { label: 'Tasks', subtitle: 'To-dos across your leads', icon: ListTodo, route: ROUTES.TASKS, params: { title: 'Tasks' }, visible: can.tasks },
            { label: 'Calls', subtitle: 'Logged call history', icon: Phone, route: ROUTES.CALLS, params: { title: 'Calls' }, visible: can.meetings },
            { label: 'Meetings', subtitle: 'Schedule & join meetings', icon: Video, route: ROUTES.MEETINGS, params: { title: 'Meetings' }, visible: can.meetings },
            { label: 'Calendar', subtitle: 'Events & reminders', icon: CalendarDays, route: ROUTES.CALENDAR, visible: can.calendar },
          ]}
        />

        <Section
          navigation={navigation}
          delay={160}
          title="Account"
          items={[
            { label: 'My profile', icon: User, route: ROUTES.PROFILE },
            { label: 'Appearance', subtitle: 'Light, dark or system', icon: Palette, route: ROUTES.SETTINGS_APPEARANCE, params: { title: 'Appearance' } },
            { label: 'Security', subtitle: 'Biometric unlock & password', icon: Fingerprint, route: ROUTES.SETTINGS_SECURITY, params: { title: 'Security' } },
            {
              label: 'Sign out',
              icon: LogOut,
              destructive: true,
              onPress: () =>
                confirmRef.current?.open({
                  title: 'Sign out?',
                  message: 'You can sign back in anytime.',
                  confirmLabel: 'Sign out',
                  destructive: true,
                  onConfirm: logout,
                }),
            },
          ]}
        />

        <AppText variant="caption" color="inkFaint" style={styles.version}>
          LeadNest · v2.0.0
        </AppText>
      </ScrollView>

      <ConfirmSheet ref={confirmRef} />
      <WorkspaceSwitcherSheet ref={workspaceRef} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  pageTitle: { marginBottom: 14 },
  profileCard: { marginBottom: 8 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileTexts: { flex: 1 },
  roleBadge: { marginTop: 5 },
  profileDivider: { marginVertical: 12 },
  workspaceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wsSwatch: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { marginTop: 18, marginBottom: 8, marginLeft: 4, letterSpacing: 0.8 },
  sectionCard: { paddingVertical: 4 },
  version: { textAlign: 'center', marginTop: 24 },
});
