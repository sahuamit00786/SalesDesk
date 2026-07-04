import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import Badge from '../../../design-system/components/Badge';
import IconButton from '../../../design-system/components/IconButton';
import Sheet from '../../../design-system/components/Sheet';
import TextField from '../../../design-system/components/TextField';
import SelectField from '../../../design-system/components/SelectField';
import Button from '../../../design-system/components/Button';
import FAB from '../../../design-system/components/FAB';
import EmptyState from '../../../design-system/components/EmptyState';
import ErrorState from '../../../design-system/components/ErrorState';
import ConfirmSheet from '../../../design-system/components/ConfirmSheet';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import { Mail, UserPlus, Trash2 } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useInvitations, useTeamRoles, useTeamMutations } from '../hooks';
import { useAuthStore } from '../../../stores/authStore';
import { useWorkspaceStore, workspacesFromUser, resolveWorkspaceId } from '../../../stores/workspaceStore';
import { relativeTime } from '../../../utils/format';

const InviteSheet = forwardRef(function InviteSheet({ roles, onDone }, ref) {
  const sheetRef = useRef(null);
  const user = useAuthStore((s) => s.user);
  const preferredId = useWorkspaceStore((s) => s.preferredId);
  const { invite } = useTeamMutations();

  const workspaces = workspacesFromUser(user);
  const activeId = resolveWorkspaceId(user, preferredId);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState(null);
  const [workspaceIds, setWorkspaceIds] = useState([]);
  const [errors, setErrors] = useState({});

  useImperativeHandle(ref, () => ({
    open: () => {
      setEmail('');
      setName('');
      setRoleId(null);
      setWorkspaceIds(activeId ? [activeId] : []);
      setErrors({});
      requestAnimationFrame(() => sheetRef.current?.present());
    },
  }));

  const submit = async () => {
    const next = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email';
    if (!roleId) next.roleId = 'Pick a role';
    if (!workspaceIds.length) next.workspaceIds = 'Pick at least one workspace';
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await invite.mutateAsync({
        email: email.trim().toLowerCase(),
        name: name.trim() || undefined,
        companyRoleId: roleId,
        workspaceIds,
      });
      Toast.show({ type: 'success', text1: 'Invitation sent', text2: email.trim() });
      sheetRef.current?.dismiss();
      onDone?.();
    } catch {
      // hook toasts
    }
  };

  return (
    <Sheet ref={sheetRef} title="Invite teammate" scrollable snapPoints={['70%']}>
      <TextField label="Email *" value={email} onChangeText={setEmail} placeholder="teammate@company.com" keyboardType="email-address" autoCapitalize="none" icon={Mail} error={errors.email} style={styles.field} />
      <TextField label="Name" value={name} onChangeText={setName} placeholder="Optional" style={styles.field} />
      <SelectField
        label="Role *"
        value={roleId}
        onChange={setRoleId}
        options={(roles || []).map((r) => ({ value: r.id, label: r.name, description: r.description }))}
        error={errors.roleId}
        style={styles.field}
      />
      <SelectField
        label="Workspaces *"
        value={workspaceIds}
        onChange={setWorkspaceIds}
        options={workspaces.map((w) => ({ value: w.id, label: w.name }))}
        multi
        error={errors.workspaceIds}
        style={styles.field}
      />
      <Button title="Send invitation" fullWidth loading={invite.isPending} onPress={submit} />
    </Sheet>
  );
});

export default function InvitationsScreen() {
  const theme = useTheme();
  const invitations = useInvitations();
  const roles = useTeamRoles();
  const { revokeInvitation } = useTeamMutations();
  const inviteRef = useRef(null);
  const confirmRef = useRef(null);

  return (
    <ScreenScaffold>
      <AppHeader title="Invitations" />
      {invitations.isPending ? (
        <SkeletonList count={5} cardHeight={76} />
      ) : invitations.isError ? (
        <ErrorState error={invitations.error} onRetry={invitations.refetch} />
      ) : (invitations.data || []).length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No pending invitations"
          message="Invite teammates and track their pending invites here."
          actionLabel="Invite teammate"
          onAction={() => inviteRef.current?.open()}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={invitations.isRefetching} onRefresh={invitations.refetch} tintColor={theme.brand} colors={[theme.brand]} />
          }
        >
          {invitations.data.map((inv) => (
            <Card key={inv.id} style={styles.card}>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: theme.brandFaint, borderRadius: theme.radius.full }]}>
                  <Mail size={17} color={theme.brand} strokeWidth={2.1} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {inv.email}
                  </AppText>
                  <View style={styles.metaRow}>
                    <Badge label={inv.status || 'pending'} tone={inv.status === 'accepted' ? 'success' : 'warning'} size="sm" />
                    {inv.companyRole?.name ? <Badge label={inv.companyRole.name} tone="neutral" size="sm" /> : null}
                    <AppText variant="micro" color="inkFaint">
                      {relativeTime(inv.createdAt)}
                    </AppText>
                  </View>
                </View>
                <IconButton
                  icon={Trash2}
                  size={34}
                  color={theme.colors.danger}
                  accessibilityLabel="Revoke invitation"
                  onPress={() =>
                    confirmRef.current?.open({
                      title: 'Revoke invitation?',
                      message: inv.email,
                      destructive: true,
                      confirmLabel: 'Revoke',
                      onConfirm: () => revokeInvitation.mutateAsync(inv.id),
                    })
                  }
                />
              </View>
            </Card>
          ))}
        </ScrollView>
      )}

      <FAB icon={UserPlus} label="Invite" onPress={() => inviteRef.current?.open()} />
      <InviteSheet ref={inviteRef} roles={roles.data} />
      <ConfirmSheet ref={confirmRef} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingBottom: 110 },
  card: { marginBottom: 10, padding: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' },
  field: { marginBottom: 14 },
});
