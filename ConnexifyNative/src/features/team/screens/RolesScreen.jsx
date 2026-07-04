import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import Badge from '../../../design-system/components/Badge';
import EmptyState from '../../../design-system/components/EmptyState';
import ErrorState from '../../../design-system/components/ErrorState';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import { ShieldCheck } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useTeamRoles } from '../hooks';

const KIND_LABELS = {
  workspace_admin: 'Workspace admin',
  manager: 'Manager',
  sales: 'Sales',
};

export default function RolesScreen() {
  const theme = useTheme();
  const roles = useTeamRoles();

  return (
    <ScreenScaffold>
      <AppHeader title="Roles" subtitle="Permission matrix is managed on the web app" />
      {roles.isPending ? (
        <SkeletonList count={5} cardHeight={84} />
      ) : roles.isError ? (
        <ErrorState error={roles.error} onRetry={roles.refetch} />
      ) : (roles.data || []).length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No roles defined" message="Create roles from the web app's Team & roles page." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={roles.isRefetching} onRefresh={roles.refetch} tintColor={theme.brand} colors={[theme.brand]} />
          }
        >
          {roles.data.map((role) => (
            <Card key={role.id} style={styles.card}>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: theme.brandFaint, borderRadius: theme.radius.md }]}>
                  <ShieldCheck size={19} color={theme.brand} strokeWidth={2} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{role.name}</AppText>
                  {role.description ? (
                    <AppText variant="caption" color="inkMuted" numberOfLines={2}>
                      {role.description}
                    </AppText>
                  ) : null}
                  {role.userRoleKind ? (
                    <Badge label={KIND_LABELS[role.userRoleKind] || role.userRoleKind} tone="neutral" size="sm" style={styles.kind} />
                  ) : null}
                </View>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', gap: 12 },
  iconWrap: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  kind: { marginTop: 6 },
});
