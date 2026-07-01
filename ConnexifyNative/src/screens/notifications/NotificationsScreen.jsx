import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { useNotificationStore } from '../../store/notificationStore';
import { fontSize, fontWeight, spacing, borderRadius } from '../../theme';
import AppHeader from '../../components/navigation/AppHeader';
import EmptyState from '../../components/feedback/EmptyState';
import SkeletonList from '../../components/feedback/SkeletonList';
import ListFooter from '../../components/feedback/ListFooter';

const TYPE_ICONS = {
  lead_assigned:   { icon: 'account-plus',       color: '#4F46E5' },
  deal_stage:      { icon: 'briefcase-arrow-up',  color: '#10B981' },
  leave_approved:  { icon: 'calendar-check',      color: '#10B981' },
  leave_rejected:  { icon: 'calendar-remove',     color: '#EF4444' },
  leave_pending:   { icon: 'calendar-clock',      color: '#F59E0B' },
  task_assigned:   { icon: 'clipboard-account',   color: '#06B6D4' },
  meeting:         { icon: 'video',               color: '#8B5CF6' },
  reminder:        { icon: 'bell-ring',           color: '#F97316' },
  default:         { icon: 'bell',                color: '#94A3B8' },
};

const formatRelativeTime = (date) => {
  if (!date) return '';
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);

  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const isToday = (date) => {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

// ── Notification Row ─────────────────────────────────────────────
const NotifRow = ({ item, onPress, theme }) => {
  const typeConf = TYPE_ICONS[item.type] || TYPE_ICONS.default;

  return (
    <TouchableOpacity
      style={[
        nr.row,
        { backgroundColor: item.isRead ? theme.colors.surface : theme.colors.primaryLight + '60', borderBottomColor: theme.colors.borderLight },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      <View style={[nr.iconBox, { backgroundColor: typeConf.color + '18' }]}>
        <Icon name={typeConf.icon} size={20} color={typeConf.color} />
      </View>
      <View style={nr.body}>
        <Text style={[nr.title, { color: theme.colors.textPrimary, fontWeight: item.isRead ? fontWeight.normal : fontWeight.semibold }]} numberOfLines={1}>
          {item.title || 'Notification'}
        </Text>
        <Text style={[nr.message, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {item.body || item.message || ''}
        </Text>
        <Text style={[nr.time, { color: theme.colors.textMuted }]}>
          {formatRelativeTime(item.createdAt)}
        </Text>
      </View>
      {!item.isRead && <View style={[nr.dot, { backgroundColor: theme.colors.primary }]} />}
    </TouchableOpacity>
  );
};

const nr = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.base, borderBottomWidth: 1, gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  body:    { flex: 1 },
  title:   { fontSize: fontSize.base },
  message: { fontSize: fontSize.sm, marginTop: 2, lineHeight: 18 },
  time:    { fontSize: fontSize.xs, marginTop: 4 },
  dot:     { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
});

// ── Group Header ─────────────────────────────────────────────────
const GroupHeader = ({ title, theme }) => (
  <View style={[gh.wrap, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.borderLight }]}>
    <Text style={[gh.text, { color: theme.colors.textMuted }]}>{title}</Text>
  </View>
);

const gh = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.base, paddingVertical: 6, borderBottomWidth: 1 },
  text: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
});

// ── Main Screen ──────────────────────────────────────────────────
const NotificationsScreen = ({ navigation }) => {
  const { theme } = useTheme();

  const {
    notifications, unreadCount, isLoading, hasMore,
    fetchNotifications, markRead, markAllRead, refresh, fetchUnreadCount,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(true);
  }, []);

  const handlePress = useCallback(async (notif) => {
    if (!notif.isRead) await markRead(notif.id);
    // Navigate to linked entity
    if (notif.leadId) navigation.navigate('LeadDetail', { id: notif.leadId });
    else if (notif.dealId) navigation.navigate('DealDetail', { id: notif.dealId });
  }, [markRead, navigation]);

  // Group notifications: Today vs Earlier
  const today = [];
  const earlier = [];
  notifications.forEach((n) => {
    if (isToday(n.createdAt)) today.push(n);
    else earlier.push(n);
  });

  const listData = [
    ...(today.length    ? [{ type: 'header', id: 'h-today',   title: 'Today'   }, ...today.map((n) => ({ ...n, type: 'row' }))]   : []),
    ...(earlier.length  ? [{ type: 'header', id: 'h-earlier', title: 'Earlier' }, ...earlier.map((n) => ({ ...n, type: 'row' }))] : []),
  ];

  if (isLoading && notifications.length === 0) {
    return (
      <View style={[s.root, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Notifications" navigation={navigation} />
        <SkeletonList />
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
        navigation={navigation}
        rightActions={unreadCount > 0 ? [{
          icon: 'check-all',
          label: 'Mark all read',
          onPress: markAllRead,
        }] : []}
      />

      {listData.length === 0 ? (
        <EmptyState icon="bell-off-outline" title="No notifications" subtitle="You're all caught up!" />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) =>
            item.type === 'header' ? (
              <GroupHeader title={item.title} theme={theme} />
            ) : (
              <Animatable.View animation="fadeInUp" duration={250} delay={index * 20}>
                <NotifRow item={item} onPress={handlePress} theme={theme} />
              </Animatable.View>
            )
          }
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={theme.colors.primary} />}
          onEndReached={() => { if (hasMore) fetchNotifications(false); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={<ListFooter hasMore={hasMore} />}
          contentContainerStyle={{ paddingBottom: 60 }}
        />
      )}
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
});

export default NotificationsScreen;
