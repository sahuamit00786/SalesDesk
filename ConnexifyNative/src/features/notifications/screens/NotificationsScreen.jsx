import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import IconButton from '../../../design-system/components/IconButton';
import { SegmentedTabs } from '../../../design-system/components/SegmentedTabs';
import EmptyState from '../../../design-system/components/EmptyState';
import ErrorState from '../../../design-system/components/ErrorState';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import {
  Bell,
  CheckCheck,
  Users,
  CircleDollarSign,
  CalendarDays,
  Umbrella,
  Info,
  AlertTriangle,
  CheckCircle2,
} from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useNotificationsList, useNotificationMutations } from '../hooks';
import { relativeTime } from '../../../utils/format';
import { ROUTES } from '../../../navigation/routes';

const TYPE_ICONS = {
  lead: Users,
  deal: CircleDollarSign,
  meeting: CalendarDays,
  leave: Umbrella,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
};

function dayGroup(iso) {
  const d = new Date(iso);
  const today = new Date();
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOfDay(today) - startOfDay(d)) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return 'Earlier';
}

function NotificationRow({ item, onPress, index }) {
  const theme = useTheme();
  const Icon = TYPE_ICONS[item.resourceType] || TYPE_ICONS[item.type] || Info;
  const unread = !item.isRead;

  return (
    <Animated.View entering={index < 12 ? FadeInDown.duration(280).delay(Math.min(index, 8) * 35) : undefined}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={[
          styles.row,
          {
            backgroundColor: unread ? theme.brandFaint : theme.colors.card,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: unread ? theme.brandSoft : theme.colors.skeleton, borderRadius: theme.radius.full }]}>
          <Icon size={17} color={unread ? theme.brand : theme.colors.inkMuted} strokeWidth={2.1} />
        </View>
        <View style={styles.texts}>
          <AppText variant={unread ? 'bodyStrong' : 'body'} numberOfLines={2}>
            {item.title || item.message}
          </AppText>
          {item.title && item.message && item.message !== item.title ? (
            <AppText variant="caption" color="inkMuted" numberOfLines={2} style={styles.message}>
              {item.message}
            </AppText>
          ) : null}
          <AppText variant="micro" color="inkFaint" style={styles.time}>
            {relativeTime(item.createdAt)}
          </AppText>
        </View>
        {unread ? <View style={[styles.dot, { backgroundColor: theme.brand }]} /> : null}
      </Pressable>
    </Animated.View>
  );
}

export default function NotificationsScreen({ navigation }) {
  const theme = useTheme();
  const [filter, setFilter] = useState('all');
  const list = useNotificationsList(filter === 'unread');
  const { markRead, markAllRead } = useNotificationMutations();

  const sections = useMemo(() => {
    const out = [];
    let lastGroup = null;
    for (const item of list.items) {
      const group = dayGroup(item.createdAt);
      if (group !== lastGroup) {
        out.push({ __header: true, id: `h-${group}`, label: group });
        lastGroup = group;
      }
      out.push(item);
    }
    return out;
  }, [list.items]);

  const openItem = (item) => {
    if (!item.isRead) markRead.mutate(item.id);
    const type = String(item.resourceType || '').toLowerCase();
    if (type === 'lead' && item.resourceId) navigation.navigate(ROUTES.LEAD_DETAIL, { leadId: item.resourceId, id: item.resourceId });
    else if (type === 'leave') navigation.navigate(ROUTES.LEAVE);
    else if (type === 'meeting') navigation.navigate(ROUTES.MEETINGS, { title: 'Meetings' });
  };

  return (
    <ScreenScaffold>
      <AppHeader
        title="Notifications"
        right={
          <IconButton
            icon={CheckCheck}
            accessibilityLabel="Mark all as read"
            onPress={() => markAllRead.mutate()}
            variant="brand"
          />
        }
      />
      <View style={styles.filterWrap}>
        <SegmentedTabs
          tabs={[
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      {list.isPending ? (
        <SkeletonList count={7} cardHeight={76} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : list.isEmpty ? (
        <EmptyState
          icon={Bell}
          title={filter === 'unread' ? 'All caught up' : 'No notifications'}
          message={filter === 'unread' ? 'You have no unread notifications.' : 'Updates about your leads, deals and team will appear here.'}
        />
      ) : (
        <FlashList
          data={sections}
          keyExtractor={(item) => String(item.id)}
          estimatedItemSize={84}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.4}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
          refreshControl={
            <RefreshControl refreshing={list.isRefetching && !list.isFetchingNextPage} onRefresh={list.refetch} tintColor={theme.brand} colors={[theme.brand]} />
          }
          renderItem={({ item, index }) =>
            item.__header ? (
              <AppText variant="captionStrong" color="inkFaint" style={styles.groupHeader}>
                {item.label.toUpperCase()}
              </AppText>
            ) : (
              <NotificationRow item={item} index={index} onPress={() => openItem(item)} />
            )
          }
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <AppText variant="caption" color="inkFaint" style={styles.footer}>
                Loading more…
              </AppText>
            ) : null
          }
        />
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  filterWrap: { paddingHorizontal: 16, marginBottom: 10 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  groupHeader: { marginTop: 14, marginBottom: 8, marginLeft: 4, letterSpacing: 0.8 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  iconWrap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1 },
  message: { marginTop: 2 },
  time: { marginTop: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  footer: { textAlign: 'center', paddingVertical: 14 },
});
