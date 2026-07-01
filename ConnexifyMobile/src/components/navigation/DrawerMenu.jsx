import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, Animated, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useDrawer, DRAWER_WIDTH } from '../../context/DrawerContext';
import { fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import Avatar from '../misc/Avatar';
import ConfirmSheet from '../misc/ConfirmSheet';

const SECTIONS = [
  {
    title: 'Main',
    items: [
      { route: 'Home',       icon: 'home-outline',           iconActive: 'home',                label: 'Dashboard' },
      { route: 'Leads',      icon: 'account-group-outline',  iconActive: 'account-group',       label: 'Leads'     },
      { route: 'Deals',      icon: 'briefcase-outline',      iconActive: 'briefcase',           label: 'Deals'     },
      { route: 'Activity',   icon: 'lightning-bolt-outline', iconActive: 'lightning-bolt',      label: 'Activities'},
      { route: 'Attendance', icon: 'clock-outline',          iconActive: 'clock-check',         label: 'Attendance'},
    ],
  },
  {
    title: 'CRM',
    items: [
      { route: 'Campaigns',     icon: 'bullhorn-outline',          iconActive: 'bullhorn',             label: 'Campaigns'    },
      { route: 'Calendar',      icon: 'calendar-month-outline',    iconActive: 'calendar-month',       label: 'Calendar'     },
      { route: 'CallSync',      icon: 'phone-log-outline',         iconActive: 'phone-log',            label: 'Call History' },
    ],
  },
  {
    title: 'HR',
    items: [
      { route: 'Leave',         icon: 'calendar-heart-outline',    iconActive: 'calendar-heart',       label: 'Leave'        },
      { route: 'Notifications', icon: 'bell-outline',              iconActive: 'bell',                 label: 'Notifications'},
    ],
  },
  {
    title: 'Account',
    items: [
      { route: 'Profile',       icon: 'account-circle-outline',    iconActive: 'account-circle',       label: 'My Profile'   },
      { route: 'EditProfile',   icon: 'account-edit-outline',      iconActive: 'account-edit',         label: 'Edit Profile' },
      { route: 'ChangePassword',icon: 'lock-reset',                iconActive: 'lock-reset',           label: 'Change Password'},
    ],
  },
];

const MANAGER_ITEM = { route: 'TeamList', icon: 'account-multiple-outline', iconActive: 'account-multiple', label: 'Team Members' };

const DrawerNavItem = ({ item, currentRoute, onPress }) => {
  const { theme } = useTheme();
  const isActive = currentRoute === item.route;
  const s = navItemStyles(theme);

  return (
    <TouchableOpacity
      style={[s.row, isActive && s.rowActive]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="menuitem"
      accessibilityLabel={item.label}
    >
      <View style={[s.iconBox, isActive && s.iconBoxActive]}>
        <Icon
          name={isActive ? item.iconActive : item.icon}
          size={20}
          color={isActive ? theme.colors.primary : theme.colors.textSecondary}
        />
      </View>
      <Text style={[s.label, isActive && s.labelActive]} numberOfLines={1}>
        {item.label}
      </Text>
      {isActive && <View style={[s.activeBar, { backgroundColor: theme.colors.primary }]} />}
    </TouchableOpacity>
  );
};

const navItemStyles = (theme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.sm,
    marginVertical: 1,
    position: 'relative',
  },
  rowActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginRight: spacing.md,
  },
  iconBoxActive: {
    backgroundColor: theme.colors.primaryMid,
  },
  label: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  labelActive: {
    color: theme.colors.primary,
    fontWeight: fontWeight.semibold,
  },
  activeBar: {
    width: 3,
    height: 20,
    borderRadius: 2,
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -10,
  },
});

const DrawerMenu = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, logout, isManager } = useAuthStore();
  const { darkMode, toggleDarkMode } = useUIStore();
  const { isOpen, translateX, overlayOpacity, closeDrawer, drawerWidth } = useDrawer();
  const logoutRef = useRef(null);

  const ROLE_COLOR = {
    admin:   theme.colors.danger,
    manager: theme.colors.warning,
    rep:     theme.colors.success,
  };

  const currentRoute = navigation.getState?.()?.routes?.[navigation.getState?.()?.index]?.name;

  const navigate = (route) => {
    closeDrawer();
    setTimeout(() => navigation.navigate(route), 50);
  };

  const sections = SECTIONS.map((section) => {
    if (section.title === 'Account' && isManager()) {
      return {
        ...section,
        items: [...section.items.slice(0, 1), MANAGER_ITEM, ...section.items.slice(1)],
      };
    }
    return section;
  });

  const s = styles(theme, insets);

  return (
    <View style={[s.root, !isOpen && s.hidden]} pointerEvents={isOpen ? 'box-none' : 'none'}>
      {/* Backdrop — only intercepts touches when open */}
      {isOpen && (
        <Animated.View
          style={[s.backdrop, { opacity: overlayOpacity }]}
          pointerEvents="auto"
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeDrawer} activeOpacity={1} />
        </Animated.View>
      )}

      {/* Drawer Panel */}
      <Animated.View
        style={[s.panel, { width: drawerWidth, transform: [{ translateX }] }]}
        pointerEvents="auto"
      >
        {/* Brand Header */}
        <View style={[s.brand, { paddingTop: insets.top + spacing.base }]}>
          <View style={s.brandRow}>
            <View style={s.logoBox}>
              <Icon name="connection" size={22} color="#fff" />
            </View>
            <Text style={s.brandName}>Connexify</Text>
            <TouchableOpacity style={s.closeBtn} onPress={closeDrawer} accessibilityLabel="Close menu">
              <Icon name="close" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>

          {/* User Card */}
          <View style={s.userCard}>
            <Avatar name={user?.name} size={52} uri={user?.avatar} />
            <View style={s.userInfo}>
              <Text style={s.userName} numberOfLines={1}>{user?.name || 'User'}</Text>
              <Text style={s.userEmail} numberOfLines={1}>{user?.email}</Text>
              <View style={[s.roleBadge, { backgroundColor: (ROLE_COLOR[user?.role] || theme.colors.primary) + '25' }]}>
                <Text style={[s.roleText, { color: ROLE_COLOR[user?.role] || theme.colors.primary }]}>
                  {(user?.role || 'rep').toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Nav Items */}
        <ScrollView
          style={s.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
        >
          {sections.map((section) => (
            <View key={section.title} style={s.section}>
              <Text style={s.sectionTitle}>{section.title.toUpperCase()}</Text>
              {section.items.map((item) => (
                <DrawerNavItem
                  key={item.route}
                  item={item}
                  currentRoute={currentRoute}
                  onPress={() => navigate(item.route)}
                />
              ))}
            </View>
          ))}

          {/* Preferences */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>PREFERENCES</Text>
            <View style={s.prefRow}>
              <View style={s.prefIconBox}>
                <Icon name="weather-night" size={20} color={theme.colors.textSecondary} />
              </View>
              <Text style={s.prefLabel}>Dark Mode</Text>
              <Switch
                value={darkMode ?? false}
                onValueChange={toggleDarkMode}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
                thumbColor={darkMode ? theme.colors.primary : theme.colors.textMuted}
              />
            </View>
            <View style={s.prefRow}>
              <View style={s.prefIconBox}>
                <Icon name="information-outline" size={20} color={theme.colors.textSecondary} />
              </View>
              <Text style={s.prefLabel}>Version</Text>
              <Text style={s.prefValue}>1.0.0</Text>
            </View>
          </View>
        </ScrollView>

        {/* Sign Out */}
        <View style={[s.footer, { paddingBottom: insets.bottom + spacing.base }]}>
          <TouchableOpacity
            style={s.signOutBtn}
            onPress={() => { closeDrawer(); setTimeout(() => logoutRef.current?.expand(), 200); }}
            activeOpacity={0.8}
          >
            <Icon name="logout" size={20} color={theme.colors.danger} />
            <Text style={[s.signOutText, { color: theme.colors.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ConfirmSheet
        ref={logoutRef}
        title="Sign out?"
        subtitle="You will need to sign in again to access your account."
        confirmTitle="Sign Out"
        dangerous
        icon="logout"
        onConfirm={logout}
      />
    </View>
  );
};

const styles = (theme, insets) => StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 20,
  },
  hidden: {
    pointerEvents: 'none',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: theme.colors.surface,
    ...shadows.modal,
  },
  brand: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  brandName: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: '#fff',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: spacing.sm,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  userInfo: { flex: 1 },
  userName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: '#fff',
  },
  userEmail: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  roleText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.8,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
  section: { marginBottom: spacing.sm },
  sectionTitle: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: theme.colors.textMuted,
    letterSpacing: 1.2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.base,
    marginHorizontal: spacing.sm,
  },
  prefIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  prefLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  prefValue: {
    fontSize: fontSize.sm,
    color: theme.colors.textMuted,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  signOutText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});

export default DrawerMenu;
