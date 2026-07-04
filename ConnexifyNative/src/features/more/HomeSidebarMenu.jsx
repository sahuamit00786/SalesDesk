import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AppText from '../../design-system/components/AppText';
import {
  ListTodo,
  Phone,
  Video,
  CalendarDays,
  // CalendarCheck, Umbrella, // Attendance/Leave — commented out for now, keep imports for quick re-enable
  FileStack,
  Bell,
  Users,
  UserPlus,
  ShieldCheck,
} from '../../design-system/icons';
import { useTheme } from '../../design-system/ThemeProvider';
import { useCan } from '../../hooks/permissions';
import { ROUTES, ROUTE_PERMISSIONS } from '../../navigation/routes';

function Row({ icon: Icon, label, onPress }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={{ color: theme.brandFaint }}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Icon size={20} color={theme.colors.inkMuted} strokeWidth={2} />
      <AppText variant="bodyStrong">{label}</AppText>
    </Pressable>
  );
}

function SectionLabel({ children }) {
  return (
    <AppText variant="captionStrong" color="inkFaint" style={styles.sectionLabel}>
      {children.toUpperCase()}
    </AppText>
  );
}

/** Sidebar content: Engage + Workspace + Admin menu items, opened via hamburger on Home. */
export default function HomeSidebarMenu({ navigation, onNavigate }) {
  const can = {
    documents: useCan(ROUTE_PERMISSIONS[ROUTES.DOCUMENTS]),
    // attendance: useCan(ROUTE_PERMISSIONS[ROUTES.ATTENDANCE]), // commented out with the Attendance row below
    // leave: useCan(ROUTE_PERMISSIONS[ROUTES.LEAVE]), // commented out with the Leave row below
    meetings: useCan(ROUTE_PERMISSIONS[ROUTES.MEETINGS]),
    calendar: useCan(ROUTE_PERMISSIONS[ROUTES.CALENDAR]),
    team: useCan(ROUTE_PERMISSIONS[ROUTES.TEAM_LIST]),
  };

  const go = (route, params) => {
    onNavigate?.();
    navigation.navigate(route, params);
  };

  const engageItems = [
    { label: 'Tasks', icon: ListTodo, onPress: () => go(ROUTES.TASKS, { title: 'Tasks' }) },
    { label: 'Calls', icon: Phone, visible: can.meetings, onPress: () => go(ROUTES.CALLS, { title: 'Calls' }) },
    { label: 'Meetings', icon: Video, visible: can.meetings, onPress: () => go(ROUTES.MEETINGS, { title: 'Meetings' }) },
    { label: 'Calendar', icon: CalendarDays, visible: can.calendar, onPress: () => go(ROUTES.CALENDAR) },
  ].filter((item) => item.visible !== false);

  const workspaceItems = [
    { label: 'Documents', icon: FileStack, visible: can.documents, onPress: () => go(ROUTES.DOCUMENTS, { title: 'Documents' }) },
    // Attendance and Leave — disabled for now (not removed, just hidden from the sidebar).
    // { label: 'Attendance', icon: CalendarCheck, visible: can.attendance, onPress: () => go(ROUTES.ATTENDANCE) },
    // { label: 'Leave', icon: Umbrella, visible: can.leave, onPress: () => go(ROUTES.LEAVE) },
  ].filter((item) => item.visible !== false);

  const adminItems = [
    { label: 'Notifications', icon: Bell, onPress: () => go(ROUTES.NOTIFICATIONS) },
    { label: 'Team', icon: Users, visible: can.team, onPress: () => go(ROUTES.TEAM_LIST) },
    { label: 'Invitations', icon: UserPlus, visible: can.team, onPress: () => go(ROUTES.INVITATIONS, { title: 'Invitations' }) },
    { label: 'Roles', icon: ShieldCheck, visible: can.team, onPress: () => go(ROUTES.ROLES, { title: 'Roles' }) },
  ].filter((item) => item.visible !== false);

  return (
    <View>
      {engageItems.length ? (
        <>
          <SectionLabel>Engage</SectionLabel>
          {engageItems.map((item) => (
            <Row key={item.label} icon={item.icon} label={item.label} onPress={item.onPress} />
          ))}
        </>
      ) : null}

      {workspaceItems.length ? (
        <>
          <SectionLabel>Workspace</SectionLabel>
          {workspaceItems.map((item) => (
            <Row key={item.label} icon={item.icon} label={item.label} onPress={item.onPress} />
          ))}
        </>
      ) : null}

      {adminItems.length ? (
        <>
          <SectionLabel>Admin</SectionLabel>
          {adminItems.map((item) => (
            <Row key={item.label} icon={item.icon} label={item.label} onPress={item.onPress} />
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 8, paddingVertical: 13 },
  sectionLabel: { marginTop: 14, marginBottom: 2, paddingHorizontal: 8, letterSpacing: 0.8 },
});
