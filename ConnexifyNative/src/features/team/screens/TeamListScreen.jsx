import React, { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import { PressableCard } from '../../../design-system/components/Card';
import Avatar from '../../../design-system/components/Avatar';
import Badge from '../../../design-system/components/Badge';
import SearchBar from '../../../design-system/components/SearchBar';
import IconButton from '../../../design-system/components/IconButton';
import { SegmentedTabs } from '../../../design-system/components/SegmentedTabs';
import EmptyState from '../../../design-system/components/EmptyState';
import ErrorState from '../../../design-system/components/ErrorState';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import { UsersRound, UserPlus } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useTeamUsers } from '../hooks';
import { relativeTime } from '../../../utils/format';
import { ROUTES } from '../../../navigation/routes';

export default function TeamListScreen({ navigation }) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState('active');
  const team = useTeamUsers();

  const items = useMemo(() => {
    const all = team.data || [];
    const bySegment = all.filter((u) => (segment === 'active' ? u.isActive !== false : u.isActive === false));
    const q = query.trim().toLowerCase();
    if (!q) return bySegment;
    return bySegment.filter(
      (u) => String(u.name).toLowerCase().includes(q) || String(u.email).toLowerCase().includes(q),
    );
  }, [team.data, query, segment]);

  return (
    <ScreenScaffold>
      <AppHeader
        title="Team"
        subtitle={team.data ? `${team.data.length} members` : undefined}
        right={
          <IconButton
            icon={UserPlus}
            variant="brand"
            accessibilityLabel="Invite member"
            onPress={() => navigation.navigate(ROUTES.INVITATIONS)}
          />
        }
      />
      <View style={styles.controls}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search members…" />
        <SegmentedTabs
          tabs={[
            { key: 'active', label: 'Active' },
            { key: 'inactive', label: 'Deactivated' },
          ]}
          value={segment}
          onChange={setSegment}
        />
      </View>

      {team.isPending ? (
        <SkeletonList count={7} cardHeight={80} />
      ) : team.isError ? (
        <ErrorState error={team.error} onRetry={team.refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon={UsersRound} title="No members here" message={segment === 'inactive' ? 'No deactivated members.' : 'Invite teammates to collaborate.'} />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => String(item.id)}
          estimatedItemSize={84}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={team.isRefetching} onRefresh={team.refetch} tintColor={theme.brand} colors={[theme.brand]} />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={index < 8 ? FadeInDown.duration(260).delay(index * 35) : undefined}>
              <PressableCard
                onPress={() => navigation.navigate(ROUTES.TEAM_MEMBER_DETAIL, { userId: item.id, id: item.id })}
                style={styles.card}
              >
                <View style={styles.row}>
                  <Avatar name={item.name} uri={item.profilePhotoUrl || item.avatar} size={44} />
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {item.name}
                    </AppText>
                    <AppText variant="caption" color="inkMuted" numberOfLines={1}>
                      {item.email}
                    </AppText>
                    <View style={styles.metaRow}>
                      <Badge
                        label={item.isCompanyAdmin ? 'Company admin' : item.companyRole?.name || 'Member'}
                        tone={item.isCompanyAdmin ? 'brand' : 'neutral'}
                        size="sm"
                      />
                      {item.isActive === false ? <Badge label="Deactivated" tone="danger" size="sm" /> : null}
                      {item.lastLoginAt ? (
                        <AppText variant="micro" color="inkFaint">
                          Seen {relativeTime(item.lastLoginAt)}
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                </View>
              </PressableCard>
            </Animated.View>
          )}
        />
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, marginBottom: 10, gap: 10 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 4 },
  card: { padding: 13, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  flex: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' },
});
