import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import Badge from '../../../design-system/components/Badge';
import Chip from '../../../design-system/components/Chip';
import SearchBar from '../../../design-system/components/SearchBar';
import EmptyState from '../../../design-system/components/EmptyState';
import ErrorState from '../../../design-system/components/ErrorState';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import { useTheme } from '../../../design-system/ThemeProvider';
import { Briefcase } from '../../../design-system/icons';
import { useDealsList } from '../hooks';
import { ROUTES } from '../../../navigation/routes';
import { formatMoney } from '../../../utils/format';

/**
 * Deals list — parity with web DealsPage. Stage chips filter client-side over
 * the loaded page; server visibility already scopes rows per role.
 *
 * Server serializes deals via `serializeDealForClient` (dealsController.js),
 * which uses dealName/dealValue/dealCurrency/currentStage — NOT the generic
 * name/value/valueCurrency/stage field names.
 */

const STAGE_TONES = {
  won: 'success',
  lost: 'danger',
  negotiation: 'warning',
  proposal: 'info',
};

function DealRow({ deal, currency, onPress }) {
  const tone = STAGE_TONES[String(deal.currentStage || '').toLowerCase()] || 'neutral';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Open deal ${deal.dealName}`}>
      <Card style={styles.card}>
        <View style={styles.rowTop}>
          <AppText variant="body" weight="600" numberOfLines={1} style={styles.flex}>{deal.dealName}</AppText>
          <AppText variant="body" weight="700">{formatMoney(deal.dealValue, deal.dealCurrency || currency)}</AppText>
        </View>
        <AppText variant="caption" color="muted" numberOfLines={1}>{deal.fullName || deal.companyName}</AppText>
        <View style={styles.rowBottom}>
          {deal.currentStage ? <Badge label={deal.currentStage} tone={tone} /> : null}
          {deal.owner?.name ? <AppText variant="caption" color="muted">{deal.owner.name}</AppText> : null}
        </View>
      </Card>
    </Pressable>
  );
}

export default function DealsListScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState(null);

  const params = useMemo(() => {
    const p = {};
    if (search.trim()) p.search = search.trim();
    if (stage) p.stage = stage;
    return p;
  }, [search, stage]);

  const query = useDealsList(params);
  const rows = query.items || [];

  const stages = useMemo(() => {
    const set = new Set(rows.map((d) => d.currentStage).filter(Boolean));
    return [...set];
  }, [rows]);

  return (
    <ScreenScaffold>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <AppText variant="heading">Deals</AppText>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search deals" />
        {stages.length ? (
          <View style={styles.chips}>
            <Chip label="All" selected={!stage} onPress={() => setStage(null)} />
            {stages.map((s) => (
              <Chip key={s} label={s} selected={stage === s} onPress={() => setStage(stage === s ? null : s)} />
            ))}
          </View>
        ) : null}
      </View>

      {query.isPending ? (
        <SkeletonList count={6} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : !rows.length ? (
        <EmptyState icon={Briefcase} title="No deals yet" message="Deals you own or are assigned to will show here." />
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(d) => d.id}
          estimatedItemSize={84}
          onEndReached={query.fetchNextPage}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <DealRow
              deal={item}
              currency={theme.currency}
              onPress={() => navigation.navigate(ROUTES.DEAL_DETAIL, { dealId: item.id })}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, gap: 10, paddingBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  list: { padding: 12 },
  card: { padding: 12, marginBottom: 10, gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex: { flex: 1 },
});
