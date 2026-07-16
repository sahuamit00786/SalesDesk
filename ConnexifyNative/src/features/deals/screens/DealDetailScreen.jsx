import React, { useRef } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import Badge from '../../../design-system/components/Badge';
import Button from '../../../design-system/components/Button';
import SelectSheet from '../../../design-system/components/SelectSheet';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import ErrorState from '../../../design-system/components/ErrorState';
import { useTheme } from '../../../design-system/ThemeProvider';
import { useDealDetail, useDealPayments, useDealMutations } from '../hooks';
import { useLeadFormMeta } from '../../leads/hooks';
import { formatMoney, formatDate } from '../../../utils/format';

/**
 * Deal detail — summary, stage change, and payments (read).
 * Server enforces access; a non-elevated user opening someone else's deal by id
 * gets a clean 404/forbidden which ErrorState renders as a precise message.
 *
 * Field names come from `serializeDealForClient` (server dealsController.js):
 * dealName/dealValue/dealCurrency/currentStage/fullName/companyName/owner —
 * there is no nested `deal.lead` object.
 */

const DEFAULT_STAGES = ['qualification', 'proposal', 'negotiation', 'won', 'lost'];

export default function DealDetailScreen({ route }) {
  const theme = useTheme();
  const dealId = route.params?.dealId;
  const detail = useDealDetail(dealId);
  const payments = useDealPayments(dealId);
  const { patchStage } = useDealMutations();
  const formMeta = useLeadFormMeta();
  const stageRef = useRef(null);

  if (detail.isPending) {
    return (
      <ScreenScaffold>
        <AppHeader title="Deal" />
        <SkeletonList count={5} />
      </ScreenScaffold>
    );
  }
  if (detail.isError) {
    return (
      <ScreenScaffold>
        <AppHeader title="Deal" />
        <ErrorState error={detail.error} onRetry={detail.refetch} />
      </ScreenScaffold>
    );
  }

  const deal = detail.data || {};
  const stageNames = (formMeta.data?.dealStatuses || []).map((s) => s.name).filter(Boolean);
  const stages = stageNames.length ? stageNames : DEFAULT_STAGES;
  const paymentRows = payments.data || [];
  const paidTotal = paymentRows.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const openStageSheet = () =>
    stageRef.current?.open({
      title: 'Move to stage',
      value: deal.currentStage,
      options: stages.map((s) => ({ value: s, label: s })),
      onChange: (stage) => {
        if (stage && stage !== deal.currentStage) patchStage.mutate({ id: dealId, stage });
      },
    });

  return (
    <ScreenScaffold>
      <AppHeader title={deal.dealName || 'Deal'} />
      <ScrollView contentContainerStyle={styles.body}>
        <Card style={styles.card}>
          <AppText variant="caption" color="muted">Value</AppText>
          <AppText variant="heading">{formatMoney(deal.dealValue, deal.dealCurrency || theme.currency)}</AppText>
          <View style={styles.stageRow}>
            <Badge label={deal.currentStage || 'No stage'} tone="info" />
            <Button title="Change stage" variant="ghost" onPress={openStageSheet} />
          </View>
        </Card>

        {deal.fullName || deal.companyName ? (
          <Card style={styles.card}>
            <AppText variant="label" color="muted">Linked lead</AppText>
            <AppText variant="body" weight="600">{deal.fullName || deal.companyName}</AppText>
            {deal.fullName && deal.companyName ? (
              <AppText variant="caption" color="muted">{deal.companyName}</AppText>
            ) : null}
          </Card>
        ) : null}

        <Card style={styles.card}>
          <View style={styles.paymentsHead}>
            <AppText variant="label" color="muted">Payments</AppText>
            <AppText variant="body" weight="700">
              {formatMoney(paidTotal, deal.dealCurrency || theme.currency)}
            </AppText>
          </View>
          {payments.isPending ? (
            <AppText variant="caption" color="muted">Loading…</AppText>
          ) : paymentRows.length ? (
            paymentRows.map((p) => (
              <View key={p.id} style={styles.paymentRow}>
                <AppText variant="body">{formatMoney(p.amount, p.currency || deal.dealCurrency)}</AppText>
                <AppText variant="caption" color="muted">{p.mode || ''} · {formatDate(p.paymentDate || p.createdAt)}</AppText>
              </View>
            ))
          ) : (
            <AppText variant="caption" color="muted">No payments recorded.</AppText>
          )}
        </Card>
      </ScrollView>

      <SelectSheet ref={stageRef} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  body: { padding: 12, gap: 12 },
  card: { padding: 14, gap: 8 },
  stageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  paymentsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
});
