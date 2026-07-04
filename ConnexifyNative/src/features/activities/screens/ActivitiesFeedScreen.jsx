import React, { useMemo, useRef, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppText from '../../../design-system/components/AppText';
import Chip from '../../../design-system/components/Chip';
import Card from '../../../design-system/components/Card';
import Badge from '../../../design-system/components/Badge';
import FAB from '../../../design-system/components/FAB';
import EmptyState from '../../../design-system/components/EmptyState';
import ErrorState from '../../../design-system/components/ErrorState';
import SelectSheet from '../../../design-system/components/SelectSheet';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import { SegmentedTabs } from '../../../design-system/components/SegmentedTabs';
import {
  Activity as ActivityIcon,
  Phone,
  Mail,
  Video,
  StickyNote,
  CheckSquare,
  User,
} from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useActivitiesFeed } from '../hooks';
import { useTeamUsers } from '../../team/hooks';
import LogActivitySheet from '../components/LogActivitySheet';
import { formatDate, formatTime } from '../../../utils/format';

const TYPE_META = {
  call: { icon: Phone, label: 'Call' },
  email: { icon: Mail, label: 'Email' },
  meeting: { icon: Video, label: 'Meeting' },
  note: { icon: StickyNote, label: 'Note' },
  task: { icon: CheckSquare, label: 'Task' },
};
const FILTER_TYPES = ['call', 'email', 'meeting', 'note', 'task'];

function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOfDay(today) - startOfDay(d)) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return formatDate(d, { withYear: d.getFullYear() !== today.getFullYear() });
}

export default function ActivitiesFeedScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [rangeDays, setRangeDays] = useState(30);
  const [activeTypes, setActiveTypes] = useState([]);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState(null);
  const sheetRef = useRef(null);
  const userSheetRef = useRef(null);

  const teamUsers = useTeamUsers();

  const feed = useActivitiesFeed({
    rangeDays,
    types: activeTypes.length ? activeTypes.join(',') : undefined,
    userId: userId || undefined,
  });

  const openUserFilter = () =>
    userSheetRef.current?.open({
      title: 'Performed by',
      searchable: true,
      value: userId,
      options: (teamUsers.data || []).map((u) => ({ value: u.id, label: u.name || u.email, description: u.email })),
      onChange: (value, option) => {
        setUserId(value);
        setUserName(option?.label || null);
      },
    });

  const rows = useMemo(() => {
    const out = [];
    let lastDay = null;
    for (const item of feed.data || []) {
      const day = dayLabel(item.createdAt);
      if (day !== lastDay) {
        out.push({ __header: true, id: `h-${day}`, label: day });
        lastDay = day;
      }
      out.push(item);
    }
    return out;
  }, [feed.data]);

  const toggleType = (type) =>
    setActiveTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));

  return (
    <ScreenScaffold>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <AppText variant="title">Activities</AppText>
        <SegmentedTabs
          tabs={[
            { key: 7, label: '7 days' },
            { key: 30, label: '30 days' },
            { key: 90, label: '90 days' },
          ]}
          value={rangeDays}
          onChange={setRangeDays}
          style={styles.range}
        />
        <View style={styles.typeRow}>
          {FILTER_TYPES.map((type) => (
            <Chip
              key={type}
              label={TYPE_META[type].label}
              icon={TYPE_META[type].icon}
              selected={activeTypes.includes(type)}
              onPress={() => toggleType(type)}
            />
          ))}
          <Chip
            label={userName ? `By ${userName}` : 'Performed by'}
            icon={User}
            selected={Boolean(userId)}
            onPress={openUserFilter}
            onRemove={
              userId
                ? () => {
                    setUserId(null);
                    setUserName(null);
                  }
                : undefined
            }
          />
        </View>
      </View>

      {feed.isPending ? (
        <SkeletonList count={7} cardHeight={80} />
      ) : feed.isError ? (
        <ErrorState error={feed.error} onRetry={feed.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title="No activity in this range"
          message="Calls, emails, meetings and notes you log will show up here."
          actionLabel="Log activity"
          onAction={() => sheetRef.current?.open()}
        />
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(item) => String(item.id)}
          estimatedItemSize={86}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={feed.isRefetching} onRefresh={feed.refetch} tintColor={theme.brand} colors={[theme.brand]} />
          }
          renderItem={({ item, index }) => {
            if (item.__header) {
              return (
                <AppText variant="captionStrong" color="inkFaint" style={styles.dayHeader}>
                  {item.label.toUpperCase()}
                </AppText>
              );
            }
            const meta = TYPE_META[item.type] || { icon: ActivityIcon, label: item.type };
            const Icon = meta.icon;
            return (
              <Animated.View entering={index < 10 ? FadeInDown.duration(260).delay(Math.min(index, 8) * 30) : undefined}>
                <Card style={styles.card}>
                  <View style={styles.row}>
                    <View style={[styles.iconWrap, { backgroundColor: theme.brandFaint, borderRadius: theme.radius.full }]}>
                      <Icon size={16} color={theme.brand} strokeWidth={2.1} />
                    </View>
                    <View style={styles.texts}>
                      <View style={styles.topRow}>
                        <Badge label={meta.label} tone="brand" size="sm" />
                        <AppText variant="micro" color="inkFaint">
                          {formatTime(item.createdAt)}
                        </AppText>
                      </View>
                      <AppText variant="body" numberOfLines={3} style={styles.body}>
                        {item.body || '—'}
                      </AppText>
                      <AppText variant="micro" color="inkFaint" style={styles.byLine}>
                        by {item.user?.name || item.user?.email || 'System'}
                      </AppText>
                    </View>
                  </View>
                </Card>
              </Animated.View>
            );
          }}
        />
      )}

      <FAB label="Log" accessibilityLabel="Log activity" onPress={() => sheetRef.current?.open()} />
      <LogActivitySheet ref={sheetRef} onLogged={feed.refetch} />
      <SelectSheet ref={userSheetRef} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 10, gap: 10 },
  range: { marginTop: 2 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 110, paddingTop: 4 },
  dayHeader: { marginTop: 14, marginBottom: 8, marginLeft: 4, letterSpacing: 0.8 },
  card: { marginBottom: 8, padding: 13 },
  row: { flexDirection: 'row', gap: 12 },
  iconWrap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  body: { marginTop: 6 },
  byLine: { marginTop: 6 },
});
