import React, { useRef } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Avatar from '../../../design-system/components/Avatar';
import Badge from '../../../design-system/components/Badge';
import Card from '../../../design-system/components/Card';
import Button from '../../../design-system/components/Button';
import { Divider, KeyValueRow } from '../../../design-system/components/SectionHeader';
import { SkeletonDetail } from '../../../design-system/components/Skeleton';
import ErrorState from '../../../design-system/components/ErrorState';
import SelectSheet from '../../../design-system/components/SelectSheet';
import ConfirmSheet from '../../../design-system/components/ConfirmSheet';
import { ShieldCheck, UserX, UserCheck } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useTeamUser, useTeamRoles, useTeamMutations } from '../hooks';
import { useIsAdmin } from '../../../hooks/permissions';
import { useAuthStore } from '../../../stores/authStore';
import { formatDateTime } from '../../../utils/format';

export default function TeamMemberDetailScreen({ navigation, route }) {
  const theme = useTheme();
  const userId = route.params?.userId || route.params?.id;
  const detail = useTeamUser(userId);
  const roles = useTeamRoles();
  const { setRole, deactivate, reactivate } = useTeamMutations();
  const isAdmin = useIsAdmin();
  const me = useAuthStore((s) => s.user);

  const roleRef = useRef(null);
  const confirmRef = useRef(null);

  const member = detail.data;
  const isSelf = String(userId) === String(me?.id);

  if (detail.isPending) {
    return (
      <ScreenScaffold>
        <AppHeader title="Member" />
        <SkeletonDetail />
      </ScreenScaffold>
    );
  }

  if (detail.isError || !member) {
    return (
      <ScreenScaffold>
        <AppHeader title="Member" />
        <ErrorState error={detail.error} onRetry={detail.refetch} />
      </ScreenScaffold>
    );
  }

  const openRoleSheet = () =>
    roleRef.current?.open({
      title: 'Change role',
      value: member.companyRoleId || member.companyRole?.id,
      options: (roles.data || []).map((r) => ({ value: r.id, label: r.name, description: r.description })),
      onChange: (companyRoleId, option) =>
        setRole.mutate(
          { id: userId, companyRoleId },
          { onSuccess: () => Toast.show({ type: 'success', text1: `Role set to ${option?.label}` }) },
        ),
    });

  const toggleActive = () => {
    if (member.isActive === false) {
      confirmRef.current?.open({
        title: `Reactivate ${member.name}?`,
        confirmLabel: 'Reactivate',
        onConfirm: async () => {
          await reactivate.mutateAsync(userId);
          Toast.show({ type: 'success', text1: 'Member reactivated' });
        },
      });
    } else {
      confirmRef.current?.open({
        title: `Deactivate ${member.name}?`,
        message: 'They will lose access immediately. Their records stay in the workspace.',
        destructive: true,
        confirmLabel: 'Deactivate',
        onConfirm: async () => {
          await deactivate.mutateAsync({ id: userId });
          Toast.show({ type: 'success', text1: 'Member deactivated' });
        },
      });
    }
  };

  return (
    <ScreenScaffold>
      <AppHeader title={member.name || 'Member'} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={detail.isRefetching} onRefresh={detail.refetch} tintColor={theme.brand} colors={[theme.brand]} />
        }
      >
        <View style={styles.hero}>
          <Avatar name={member.name} uri={member.profilePhotoUrl || member.avatar} size={72} />
          <AppText variant="heading" style={styles.heroName}>
            {member.name}
          </AppText>
          <AppText variant="body" color="inkMuted">
            {member.email}
          </AppText>
          <View style={styles.badges}>
            <Badge
              label={member.isCompanyAdmin ? 'Company admin' : member.companyRole?.name || 'Member'}
              tone={member.isCompanyAdmin ? 'brand' : 'neutral'}
            />
            {member.isActive === false ? <Badge label="Deactivated" tone="danger" /> : <Badge label="Active" tone="success" />}
          </View>
        </View>

        <Card padded={false} style={styles.card}>
          <View style={styles.kvPad}>
            <KeyValueRow label="Job title" value={member.jobTitle || '—'} />
            <Divider />
            <KeyValueRow label="Department" value={member.department || '—'} />
            <Divider />
            <KeyValueRow label="Phone" value={member.businessPhone || '—'} />
            <Divider />
            <KeyValueRow label="WhatsApp" value={member.whatsappNumber || '—'} />
            <Divider />
            <KeyValueRow label="Location" value={[member.city, member.country].filter(Boolean).join(', ') || '—'} />
            <Divider />
            <KeyValueRow label="Last sign-in" value={member.lastLoginAt ? formatDateTime(member.lastLoginAt) : '—'} />
          </View>
        </Card>

        {isAdmin && !isSelf && !member.isCompanyAdmin ? (
          <Card style={styles.card}>
            <AppText variant="captionStrong" color="inkFaint" style={styles.blockTitle}>
              ADMIN ACTIONS
            </AppText>
            <Button title="Change role" variant="secondary" icon={ShieldCheck} fullWidth onPress={openRoleSheet} style={styles.actionGap} />
            <Button
              title={member.isActive === false ? 'Reactivate member' : 'Deactivate member'}
              variant={member.isActive === false ? 'primary' : 'dangerSoft'}
              icon={member.isActive === false ? UserCheck : UserX}
              fullWidth
              onPress={toggleActive}
            />
          </Card>
        ) : null}
      </ScrollView>

      <SelectSheet ref={roleRef} />
      <ConfirmSheet ref={confirmRef} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  hero: { alignItems: 'center', paddingVertical: 10 },
  heroName: { marginTop: 12 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 10 },
  card: { marginTop: 14 },
  kvPad: { paddingHorizontal: 16, paddingVertical: 4 },
  blockTitle: { letterSpacing: 0.8, marginBottom: 12 },
  actionGap: { marginBottom: 10 },
});
