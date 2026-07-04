import React, { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import { PressableCard } from '../../../design-system/components/Card';
import Badge from '../../../design-system/components/Badge';
import SearchBar from '../../../design-system/components/SearchBar';
import FAB from '../../../design-system/components/FAB';
import { SegmentedTabs } from '../../../design-system/components/SegmentedTabs';
import EmptyState from '../../../design-system/components/EmptyState';
import ErrorState from '../../../design-system/components/ErrorState';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import { Video, CalendarClock } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useMeetingsList } from '../hooks';
import { MEETING_TYPES, MEETING_STATUS_TONES } from '../api';
import { formatDate, formatTime } from '../../../utils/format';
import { ROUTES } from '../../../navigation/routes';

const SEGMENTS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
];

export default function MeetingsListScreen({ navigation }) {
  const theme = useTheme();
  const [segment, setSegment] = useState('upcoming');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const params = useMemo(() => {
    const now = new Date().toISOString();
    const p = {};
    if (search.trim()) p.search = search.trim();
    if (segment === 'upcoming') {
      p.dateFrom = now;
      p.sortField = 'scheduledStart';
      p.sortOrder = 'asc';
    } else if (segment === 'past') {
      p.dateTo = now;
      p.sortField = 'scheduledStart';
      p.sortOrder = 'desc';
    } else {
      p.sortField = 'scheduledStart';
      p.sortOrder = 'desc';
    }
    return p;
  }, [segment, search]);

  const list = useMeetingsList(params);

  return (
    <ScreenScaffold>
      <AppHeader title="Meetings" />
      <View style={styles.controls}>
        <SearchBar value={searchInput} onChangeText={setSearchInput} onDebounced={setSearch} placeholder="Search meetings…" />
        <SegmentedTabs tabs={SEGMENTS} value={segment} onChange={setSegment} />
      </View>

      {list.isPending ? (
        <SkeletonList count={6} cardHeight={96} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : list.isEmpty ? (
        <EmptyState
          icon={Video}
          title={segment === 'upcoming' ? 'Nothing scheduled' : 'No meetings'}
          message="Schedule a meeting and the Google Meet link lands here."
          actionLabel="New meeting"
          onAction={() => navigation.navigate(ROUTES.MEETING_FORM)}
        />
      ) : (
        <FlashList
          data={list.items}
          keyExtractor={(item) => String(item.id)}
          estimatedItemSize={104}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.4}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
          refreshControl={
            <RefreshControl refreshing={list.isRefetching && !list.isFetchingNextPage} onRefresh={list.refetch} tintColor={theme.brand} colors={[theme.brand]} />
          }
          renderItem={({ item, index }) => {
            const typeMeta = MEETING_TYPES.find((t) => t.value === item.meetingType);
            return (
              <Animated.View entering={index < 8 ? FadeInDown.duration(280).delay(index * 40) : undefined}>
                <PressableCard
                  onPress={() => navigation.navigate(ROUTES.MEETING_DETAIL, { meetingId: item.id })}
                  style={styles.card}
                >
                  <View style={styles.row}>
                    <View style={[styles.timeBox, { backgroundColor: theme.brandFaint, borderRadius: theme.radius.md }]}>
                      <AppText variant="captionStrong" color={theme.dark ? theme.colors.ink : theme.brand}>
                        {formatDate(item.scheduledStart, { withYear: false })}
                      </AppText>
                      <AppText variant="micro" color="inkMuted">
                        {formatTime(item.scheduledStart)}
                      </AppText>
                    </View>
                    <View style={styles.texts}>
                      <AppText variant="bodyStrong" numberOfLines={1}>
                        {item.title || 'Meeting'}
                      </AppText>
                      <View style={styles.metaRow}>
                        <Badge label={item.status || 'scheduled'} tone={MEETING_STATUS_TONES[item.status] || 'neutral'} size="sm" />
                        {typeMeta ? <Badge label={typeMeta.label} tone="neutral" size="sm" /> : null}
                        {(item.participants || []).length ? (
                          <AppText variant="micro" color="inkFaint">
                            {item.participants.length} attendee{item.participants.length > 1 ? 's' : ''}
                          </AppText>
                        ) : null}
                      </View>
                      {item.googleMeetLink ? (
                        <View style={styles.meetRow}>
                          <Video size={13} color={theme.colors.success} strokeWidth={2.2} />
                          <AppText variant="micro" color="success">
                            Google Meet attached
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </PressableCard>
              </Animated.View>
            );
          }}
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <AppText variant="caption" color="inkFaint" style={styles.footer}>
                Loading more…
              </AppText>
            ) : null
          }
        />
      )}

      <FAB icon={CalendarClock} label="Schedule" onPress={() => navigation.navigate(ROUTES.MEETING_FORM)} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, marginBottom: 10, gap: 10 },
  listContent: { paddingHorizontal: 16, paddingBottom: 110, paddingTop: 4 },
  footer: { textAlign: 'center', paddingVertical: 14 },
  card: { padding: 13, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 12 },
  timeBox: { width: 74, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  texts: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6, flexWrap: 'wrap' },
  meetRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
});
