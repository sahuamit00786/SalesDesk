import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Share } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import Badge from '../../../design-system/components/Badge';
import Button from '../../../design-system/components/Button';
import { SegmentedTabs } from '../../../design-system/components/SegmentedTabs';
import EmptyState from '../../../design-system/components/EmptyState';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import { FileText } from '../../../design-system/icons';
import { keys } from '../../../api/queryKeys';
import { useWorkspaceId } from '../../../hooks/useListQuery';
import { salesApi } from '../api';
import { formatMoney, formatDate } from '../../../utils/format';

/**
 * Sales docs — Quotations & Invoices, read + share. There is no server PDF
 * endpoint (web renders print pages from JSON), so "Share" composes a clean
 * text summary from the document JSON via the native share sheet.
 *
 * Server field names (Quotation/Invoice models + serializers):
 *   list row: quotationNumber|invoiceNumber, grandTotal, currency, status,
 *             clientName (computed by enrichSalesDocListRow), createdAt
 *   detail:   same + items[] (name, quantity, unitPrice, lineTotal), subtotal,
 *             customerSnapshot {contactName, companyName} (no clientName here),
 *             taxBreakdown (quotations) / taxFinancial (invoices) → { tax }
 *
 * Register both:
 *   <Stack.Screen name={ROUTES.SALES_DOCS} component={SalesDocsListScreen} />
 *   <Stack.Screen name="SalesDocDetail" component={SalesDocDetailScreen} />
 */

function docNumber(doc) {
  return doc?.quotationNumber || doc?.invoiceNumber || '';
}

function docCustomerName(doc) {
  return (
    doc?.clientName ||
    doc?.customerSnapshot?.contactName ||
    doc?.customerSnapshot?.companyName ||
    ''
  );
}

function docTax(doc) {
  const t = doc?.taxBreakdown || doc?.taxFinancial;
  return t?.tax != null ? Number(t.tax) : null;
}

export function SalesDocsListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const ws = useWorkspaceId();
  const [kind, setKind] = useState('quotations');

  const query = useQuery({
    queryKey: kind === 'quotations' ? keys.sales.quotations(ws, {}) : keys.sales.invoices(ws, {}),
    queryFn: () => (kind === 'quotations' ? salesApi.quotations() : salesApi.invoices()),
    enabled: Boolean(ws),
    select: (r) => (Array.isArray(r.data?.items) ? r.data.items : []),
  });

  const rows = query.data || [];

  return (
    <ScreenScaffold>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <AppText variant="heading">Sales documents</AppText>
        <SegmentedTabs
          tabs={[
            { key: 'quotations', label: 'Quotations' },
            { key: 'invoices', label: 'Invoices' },
          ]}
          value={kind}
          onChange={setKind}
        />
      </View>

      {query.isPending ? (
        <SkeletonList count={6} />
      ) : !rows.length ? (
        <EmptyState icon={FileText} title={`No ${kind}`} message={`${kind === 'quotations' ? 'Quotations' : 'Invoices'} will appear here.`} />
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(d) => d.id}
          estimatedItemSize={72}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate('SalesDocDetail', { kind, id: item.id })}
              accessibilityRole="button"
              accessibilityLabel={`Open ${docNumber(item) || item.id}`}
            >
              <Card style={styles.card}>
                <View style={styles.rowTop}>
                  <AppText variant="body" weight="600">{docNumber(item) || 'Document'}</AppText>
                  <AppText variant="body" weight="700">{formatMoney(item.grandTotal, item.currency)}</AppText>
                </View>
                <View style={styles.rowBottom}>
                  {item.status ? <Badge label={item.status} tone="info" /> : null}
                  <AppText variant="caption" color="muted">{docCustomerName(item)} · {formatDate(item.createdAt)}</AppText>
                </View>
              </Card>
            </Pressable>
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </ScreenScaffold>
  );
}

function buildShareText(doc, kind) {
  const lines = [];
  lines.push(`${kind === 'quotations' ? 'Quotation' : 'Invoice'} ${docNumber(doc)}`.trim());
  const customer = docCustomerName(doc);
  if (customer) lines.push(`For: ${customer}`);
  lines.push('');
  for (const item of doc.items || []) {
    lines.push(`• ${item.name} × ${item.quantity || 1} — ${formatMoney(item.lineTotal, doc.currency)}`);
  }
  lines.push('');
  if (doc.subtotal != null) lines.push(`Subtotal: ${formatMoney(doc.subtotal, doc.currency)}`);
  const tax = docTax(doc);
  if (tax != null) lines.push(`Tax: ${formatMoney(tax, doc.currency)}`);
  lines.push(`Total: ${formatMoney(doc.grandTotal, doc.currency)}`);
  return lines.join('\n');
}

export function SalesDocDetailScreen({ route }) {
  const { kind, id } = route.params || {};
  const ws = useWorkspaceId();

  const query = useQuery({
    queryKey: kind === 'quotations' ? keys.sales.quotation(ws, id) : keys.sales.invoice(ws, id),
    queryFn: () => (kind === 'quotations' ? salesApi.quotation(id) : salesApi.invoice(id)),
    enabled: Boolean(ws && id),
    select: (r) => r.data,
  });

  const doc = query.data;

  const share = async () => {
    if (!doc) return;
    try {
      await Share.share({ message: buildShareText(doc, kind) });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <ScreenScaffold>
      <AppHeader title={docNumber(doc) || 'Document'} />
      {query.isPending ? (
        <SkeletonList count={5} />
      ) : !doc ? (
        <EmptyState icon={FileText} title="Not found" message="This document is unavailable." />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Card style={styles.card}>
            <AppText variant="caption" color="muted">{docCustomerName(doc)}</AppText>
            <AppText variant="heading">{formatMoney(doc.grandTotal, doc.currency)}</AppText>
            {doc.status ? <Badge label={doc.status} tone="info" /> : null}
          </Card>
          <Card style={styles.card}>
            <AppText variant="label" color="muted">Items</AppText>
            {(doc.items || []).map((item, i) => (
              <View key={item.id || i} style={styles.itemRow}>
                <AppText variant="body" style={styles.flex} numberOfLines={1}>
                  {item.name} × {item.quantity || 1}
                </AppText>
                <AppText variant="body" weight="600">{formatMoney(item.lineTotal, doc.currency)}</AppText>
              </View>
            ))}
          </Card>
          <Button title="Share" onPress={share} />
        </ScrollView>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, gap: 10, paddingBottom: 8 },
  list: { padding: 12 },
  body: { padding: 12, gap: 12 },
  card: { padding: 14, gap: 8, marginBottom: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  flex: { flex: 1 },
});
