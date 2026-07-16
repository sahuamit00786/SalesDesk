import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AppText from '../../../design-system/components/AppText';
import Card from '../../../design-system/components/Card';
import Button from '../../../design-system/components/Button';
import { useTheme } from '../../../design-system/ThemeProvider';
import { Sparkles, ListChecks } from '../../../design-system/icons';
import { post } from '../../../api/client';
import { keys } from '../../../api/queryKeys';
import { useWorkspaceId } from '../../../hooks/useListQuery';
import { showApiError } from '../../../utils/errorMessage';

/**
 * AI meeting actions — lets a user GENERATE a summary and action items for a
 * completed meeting (server: POST /ai-meetings/:id/summarize → {summary},
 * POST /ai-meetings/:id/actions → {actions:[{owner,task,dueDate}]}).
 *
 * Render in MeetingDetailScreen when the meeting is completed and has a
 * transcript but no summary yet (or always, to allow re-generation):
 *   <MeetingAiPanel meeting={meeting} />
 */

export default function MeetingAiPanel({ meeting }) {
  const theme = useTheme();
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  const [actions, setActions] = useState(null);

  const refreshMeeting = () => qc.invalidateQueries({ queryKey: keys.meetings.detail(ws, meeting.id) });

  const summarize = useMutation({
    mutationFn: () => post(`/ai-meetings/${meeting.id}/summarize`),
    onSuccess: () => { Toast.show({ type: 'success', text1: 'Summary generated' }); refreshMeeting(); },
    onError: (err) => showApiError(err, 'Could not generate summary'),
  });

  const genActions = useMutation({
    mutationFn: () => post(`/ai-meetings/${meeting.id}/actions`),
    onSuccess: (res) => {
      const items = res?.data?.actions || [];
      setActions(Array.isArray(items) ? items : []);
      Toast.show({ type: 'success', text1: 'Action items ready' });
      refreshMeeting();
    },
    onError: (err) => showApiError(err, 'Could not generate action items'),
  });

  const canRun = meeting?.status === 'completed' || Boolean(meeting?.transcriptText);

  if (!canRun) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Sparkles size={16} color={theme.brand} strokeWidth={2.2} />
        <AppText variant="captionStrong" color="inkFaint">AI ASSIST</AppText>
      </View>

      <View style={styles.actions}>
        <Button
          title={summarize.isPending ? 'Summarizing…' : (meeting.summaryText ? 'Regenerate summary' : 'Generate summary')}
          onPress={() => summarize.mutate()}
          disabled={summarize.isPending}
          icon={Sparkles}
        />
        <Button
          title={genActions.isPending ? 'Working…' : 'Action items'}
          variant="ghost"
          onPress={() => genActions.mutate()}
          disabled={genActions.isPending}
          icon={ListChecks}
        />
      </View>

      {Array.isArray(actions) && actions.length ? (
        <View style={styles.list}>
          <AppText variant="label" color="muted">Action items</AppText>
          {actions.map((a, i) => (
            <View key={i} style={styles.item}>
              <ListChecks size={14} color={theme.colors.success} />
              <AppText variant="body" style={styles.flex}>
                {typeof a === 'string' ? a : (a.task || a.text || a.title || a.description)}
                {a?.owner ? ` — ${a.owner}` : ''}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 10, marginHorizontal: 12, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  list: { gap: 6, marginTop: 4 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4 },
  flex: { flex: 1 },
});
