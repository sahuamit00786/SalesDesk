import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { fontSize, fontWeight, spacing, borderRadius, shadows } from '../../theme';
import Avatar from '../../components/misc/Avatar';
import StatusBadge from '../../components/misc/StatusBadge';
import Divider from '../../components/misc/Divider';
import ConfirmSheet from '../../components/misc/ConfirmSheet';
import DangerButton from '../../components/buttons/DangerButton';

const SettingRow = ({ icon, title, value, onPress, rightEl, theme }) => {
  const s = settingStyles(theme);
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} accessibilityRole="button" accessibilityLabel={title}>
      <View style={[s.icon, { backgroundColor: theme.colors.primaryLight }]}>
        <Icon name={icon} size={18} color={theme.colors.primary} />
      </View>
      <Text style={s.title}>{title}</Text>
      <View style={s.right}>
        {value && <Text style={s.value}>{value}</Text>}
        {rightEl}
        {onPress && !rightEl && <Icon name="chevron-right" size={20} color={theme.colors.textMuted} />}
      </View>
    </TouchableOpacity>
  );
};

const settingStyles = (theme) => StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  icon:  { width: 36, height: 36, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: fontSize.base, color: theme.colors.textPrimary, fontWeight: fontWeight.medium },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  value: { fontSize: fontSize.sm, color: theme.colors.textSecondary },
});

const ProfileScreen = ({ navigation }) => {
  const { theme }  = useTheme();
  const insets     = useSafeAreaInsets();
  const { user, logout, isManager } = useAuthStore();
  const { darkMode, toggleDarkMode } = useUIStore();
  const logoutRef  = useRef(null);

  const s = styles(theme, insets);

  const ROLE_COLOR = { admin: theme.colors.danger, manager: theme.colors.warning, rep: theme.colors.success };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.pageTitle}>Profile</Text>
      </View>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={s.profileCard}>
          <Avatar name={user?.name} size={72} uri={user?.avatar} />
          <View style={s.profileBody}>
            <Text style={s.name}>{user?.name || 'User'}</Text>
            <Text style={s.email}>{user?.email}</Text>
            <StatusBadge
              label={user?.role || 'rep'}
              color={ROLE_COLOR[user?.role] || theme.colors.primary}
              style={s.roleBadge}
            />
          </View>
        </View>

        {/* Settings Sections */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Preferences</Text>
          <SettingRow
            icon="weather-night"
            title="Dark Mode"
            theme={theme}
            rightEl={
              <Switch
                value={darkMode ?? false}
                onValueChange={toggleDarkMode}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
                thumbColor={darkMode ? theme.colors.primary : theme.colors.textMuted}
              />
            }
          />
          <Divider />
          <SettingRow icon="bell-outline" title="Notifications" onPress={() => {}} theme={theme} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Account</Text>
          <SettingRow icon="account-edit-outline" title="Edit Profile"    onPress={() => navigation.navigate('EditProfile')} theme={theme} />
          <Divider />
          <SettingRow icon="lock-reset"            title="Change Password" onPress={() => navigation.navigate('ChangePassword')} theme={theme} />
          {isManager() && (
            <>
              <Divider />
              <SettingRow icon="account-group-outline" title="Team Members" onPress={() => navigation.navigate('TeamList')} theme={theme} />
            </>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Tools</Text>
          <SettingRow icon="phone-log" title="Call Logs" onPress={() => navigation.navigate('CallSync')} theme={theme} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>About</Text>
          <SettingRow icon="information-outline" title="App Version" value="1.0.0" theme={theme} />
        </View>

        <DangerButton title="Sign Out" onPress={() => logoutRef.current?.expand()} style={s.logoutBtn} />
      </ScrollView>

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
  root:    { flex: 1, backgroundColor: theme.colors.background },
  header:  {
    backgroundColor:   theme.colors.surface,
    paddingTop:        insets.top + spacing.sm,
    paddingBottom:     spacing.base,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  pageTitle:   { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: theme.colors.textPrimary },
  content:     { padding: spacing.base, paddingBottom: 60 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.base,
    gap: spacing.base,
    ...shadows.card,
  },
  profileBody: { flex: 1 },
  name:        { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: theme.colors.textPrimary },
  email:       { fontSize: fontSize.sm, color: theme.colors.textSecondary, marginVertical: 4 },
  roleBadge:   { alignSelf: 'flex-start' },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius:    borderRadius.lg,
    padding:         spacing.base,
    marginBottom:    spacing.md,
    ...shadows.card,
  },
  sectionTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm },
  logoutBtn: { marginTop: spacing.lg },
});

export default ProfileScreen;
