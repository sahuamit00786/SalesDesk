import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { PressableCard } from '../../../design-system/components/Card';
import SwipeRow from '../../../design-system/components/SwipeRow';
import AppText from '../../../design-system/components/AppText';
import Avatar from '../../../design-system/components/Avatar';
import Badge from '../../../design-system/components/Badge';
import { Phone, MessageCircle, Check } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { STATUS_LABELS } from '../constants';
import { formatMoney, relativeTime } from '../../../utils/format';

function waNumber(lead) {
  return lead?.profileMeta?.whatsappNumber || lead?.phone || '';
}

export default function LeadCard({ lead, onPress, onLongPress, selected = false, selectionMode = false }) {
  const theme = useTheme();
  const name = lead.contactName || lead.title || 'Untitled lead';
  const phone = lead.phone ? `${lead.phoneCountryCode || ''}${lead.phone}` : '';

  const actions = [];
  if (phone) {
    actions.push({
      key: 'call',
      label: 'Call',
      icon: Phone,
      color: '#0D9488',
      onPress: () => Linking.openURL(`tel:${phone}`).catch(() => {}),
    });
    actions.push({
      key: 'whatsapp',
      label: 'Chat',
      icon: MessageCircle,
      color: '#15803D',
      onPress: () => Linking.openURL(`https://wa.me/${waNumber(lead).replace(/[^\d]/g, '')}`).catch(() => {}),
    });
  }

  return (
    <SwipeRow actions={selectionMode ? [] : actions} style={styles.row}>
      <PressableCard
        onPress={onPress}
        onLongPress={onLongPress}
        style={[
          styles.card,
          selected && { borderColor: theme.brand, borderWidth: 1.6, backgroundColor: theme.brandFaint },
        ]}
      >
        <View style={styles.main}>
          {selectionMode ? (
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: selected ? theme.brand : theme.colors.borderStrong,
                  backgroundColor: selected ? theme.brand : 'transparent',
                  borderRadius: theme.radius.xs,
                },
              ]}
            >
              {selected ? <Check size={13} color={theme.onBrand} strokeWidth={3} /> : null}
            </View>
          ) : (
            <Avatar name={name} size={44} />
          )}
          <View style={styles.texts}>
            <View style={styles.titleRow}>
              <AppText variant="bodyStrong" numberOfLines={1} style={styles.name}>
                {name}
              </AppText>
              {Number(lead.score) > 0 ? (
                <View style={[styles.scorePill, { backgroundColor: theme.brandFaint, borderRadius: theme.radius.full }]}>
                  <AppText variant="micro" color={theme.dark ? theme.colors.inkMuted : theme.brand}>
                    {lead.score}
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText variant="caption" color="inkMuted" numberOfLines={1}>
              {[lead.company, lead.email || phone].filter(Boolean).join(' · ') || '—'}
            </AppText>
            <View style={styles.metaRow}>
              <Badge label={STATUS_LABELS[lead.status] || lead.status || '—'} status={lead.status} size="sm" />
              {Number(lead.value) > 0 ? (
                <AppText variant="captionStrong" color="ink">
                  {formatMoney(lead.value, lead.valueCurrency || theme.currency, { compact: true })}
                </AppText>
              ) : null}
              <AppText variant="micro" color="inkFaint" style={styles.updated}>
                {relativeTime(lead.updatedAt || lead.createdAt)}
              </AppText>
            </View>
          </View>
        </View>
      </PressableCard>
    </SwipeRow>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 10 },
  card: { padding: 14 },
  main: { flexDirection: 'row', gap: 12 },
  checkbox: { width: 22, height: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  texts: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1 },
  scorePill: { paddingHorizontal: 7, paddingVertical: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 7 },
  updated: { marginLeft: 'auto' },
});
