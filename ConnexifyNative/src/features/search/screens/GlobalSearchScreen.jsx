import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import SearchBar from '../../../design-system/components/SearchBar';
import SectionHeader from '../../../design-system/components/SectionHeader';
import EmptyState from '../../../design-system/components/EmptyState';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import { Search, Users, CheckSquare, Briefcase, Calendar } from '../../../design-system/icons';
import { keys } from '../../../api/queryKeys';
import { useWorkspaceId } from '../../../hooks/useListQuery';
import { searchApi } from '../api';
import { ROUTES } from '../../../navigation/routes';
import { formatMoney, formatDate } from '../../../utils/format';

/**
 * Global search — one box across leads, tasks, deals, meetings. Server scopes
 * results to what the user may see (elevated = all, others = own). Debounced;
 * min 2 chars.
 *
 * Register: <Stack.Screen name={ROUTES.SEARCH} component={GlobalSearchScreen} />
 * Add a search icon to AppHeader that navigates here.
 */

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const GROUPS = [
  { key: 'leads', label: 'Leads', icon: Users, route: ROUTES.LEAD_DETAIL, idParam: 'leadId',
    title: (r) => r.title || r.contactName, sub: (r) => r.company || r.phone || r.status },
  { key: 'deals', label: 'Deals', icon: Briefcase, route: ROUTES.DEAL_DETAIL, idParam: 'dealId',
    title: (r) => r.name, sub: (r) => `${r.stage || ''} · ${formatMoney(r.value, r.valueCurrency)}` },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare, route: ROUTES.TASKS, idParam: null,
    title: (r) => r.title, sub: (r) => r.status },
  { key: 'meetings', label: 'Meetings', icon: Calendar, route: ROUTES.MEETING_DETAIL, idParam: 'meetingId',
    title: (r) => r.title, sub: (r) => formatDate(r.scheduledStart) },
];

export default function GlobalSearchScreen({ navigation }) {
  const ws = useWorkspaceId();
  const [term, setTerm] = useState('');
  const q = useDebounced(term, 300);

  const query = useQuery({
    queryKey: keys.search(ws, q),
    queryFn: () => searchApi.global(q, 6),
    enabled: Boolean(ws && q.trim().length >= 2),
    select: (r) => r.data || {},
  });

  const data = query.data || {};
  const hasAny = GROUPS.some((g) => (data[g.key] || []).length);

  return (
    <ScreenScaffold>
      <AppHeader title="Search" />
      <View style={styles.searchWrap}>
        <SearchBar value={term} onChangeText={setTerm} placeholder="Search leads, deals, tasks, meetings" autoFocus />
      </View>

      {q.trim().length < 2 ? (
        <EmptyState icon={Search} title="Search everything" message="Type at least 2 characters to search across your leads, deals, tasks, and meetings." />
      ) : query.isPending ? (
        <SkeletonList count={6} />
      ) : !hasAny ? (
        <EmptyState icon={Search} title="No results" message={`Nothing matched "${q}".`} />
      ) : (
        <ScrollView contentContainerStyle={styles.results}>
          {GROUPS.map((g) => {
            const rows = data[g.key] || [];
            if (!rows.length) return null;
            const Icon = g.icon;
            return (
              <View key={g.key} style={styles.group}>
                <SectionHeader title={g.label} count={rows.length} />
                {rows.map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => {
                      if (!g.route) { navigation.navigate(ROUTES.TASKS); return; }
                      navigation.navigate(g.route, g.idParam ? { [g.idParam]: r.id } : undefined);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${g.label} ${g.title(r)}`}
                  >
                    <Card style={styles.resultCard}>
                      <Icon size={16} />
                      <View style={styles.flex}>
                        <AppText variant="body" weight="600" numberOfLines={1}>{g.title(r)}</AppText>
                        <AppText variant="caption" color="muted" numberOfLines={1}>{g.sub(r)}</AppText>
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: 16, paddingVertical: 8 },
  results: { padding: 12, gap: 16 },
  group: { gap: 6 },
  resultCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 6 },
  flex: { flex: 1 },
});
