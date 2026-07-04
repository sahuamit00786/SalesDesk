import React, { useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Avatar from '../../../design-system/components/Avatar';
import Badge from '../../../design-system/components/Badge';
import Card from '../../../design-system/components/Card';
import ListRow from '../../../design-system/components/ListRow';
import { Divider, KeyValueRow } from '../../../design-system/components/SectionHeader';
import ConfirmSheet from '../../../design-system/components/ConfirmSheet';
import { Pencil, Palette, Fingerprint, LogOut, Building2 } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useAuthStore } from '../../../stores/authStore';
import { useIsAdmin } from '../../../hooks/permissions';
import { ROUTES } from '../../../navigation/routes';

export default function ProfileScreen({ navigation }) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useIsAdmin();
  const confirmRef = useRef(null);

  return (
    <ScreenScaffold>
      <AppHeader title="My profile" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Avatar name={user?.name} uri={user?.profilePhotoUrl || user?.avatar} size={76} />
          <AppText variant="heading" style={styles.heroName}>
            {user?.name || '—'}
          </AppText>
          <AppText variant="body" color="inkMuted">
            {user?.email}
          </AppText>
          <View style={styles.badges}>
            <Badge label={user?.isCompanyAdmin ? 'Company admin' : user?.companyRole?.name || 'Member'} tone="brand" />
            {user?.companyName ? (
              <Badge label={user.companyName} tone="neutral" />
            ) : null}
          </View>
        </View>

        <Card padded={false} style={styles.card}>
          <View style={styles.kvPad}>
            <KeyValueRow label="Job title" value={user?.jobTitle || '—'} />
            <Divider />
            <KeyValueRow label="Department" value={user?.department || '—'} />
            <Divider />
            <KeyValueRow label="Phone" value={user?.businessPhone || '—'} />
            <Divider />
            <KeyValueRow label="WhatsApp" value={user?.whatsappNumber || '—'} />
            <Divider />
            <KeyValueRow label="Location" value={[user?.city, user?.country].filter(Boolean).join(', ') || '—'} />
          </View>
        </Card>

        <Card padded={false} style={styles.card}>
          {isAdmin ? (
            <>
              <ListRow icon={Pencil} title="Edit profile" subtitle="Update your details" onPress={() => navigation.navigate(ROUTES.EDIT_PROFILE)} />
              <Divider inset={64} />
            </>
          ) : (
            <>
              <ListRow icon={Building2} title="Profile managed by admin" subtitle="Ask a company admin to update your details" chevron={false} />
              <Divider inset={64} />
            </>
          )}
          <ListRow icon={Palette} title="Appearance" subtitle="Light, dark or system" onPress={() => navigation.navigate(ROUTES.SETTINGS_APPEARANCE)} />
          <Divider inset={64} />
          <ListRow icon={Fingerprint} title="Security" subtitle="Biometric unlock & password" onPress={() => navigation.navigate(ROUTES.SETTINGS_SECURITY)} />
          <Divider inset={64} />
          <ListRow
            icon={LogOut}
            title="Sign out"
            destructive
            onPress={() =>
              confirmRef.current?.open({
                title: 'Sign out?',
                message: 'You can sign back in anytime.',
                confirmLabel: 'Sign out',
                destructive: true,
                onConfirm: logout,
              })
            }
          />
        </Card>
      </ScrollView>
      <ConfirmSheet ref={confirmRef} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  hero: { alignItems: 'center', paddingVertical: 10 },
  heroName: { marginTop: 12 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' },
  card: { marginTop: 14, paddingVertical: 4 },
  kvPad: { paddingHorizontal: 16, paddingVertical: 4 },
});
