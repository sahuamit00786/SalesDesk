import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ScreenScaffold from '../../../components/ScreenScaffold';
import AppHeader from '../../../components/AppHeader';
import AppText from '../../../design-system/components/AppText';
import TextField from '../../../design-system/components/TextField';
import IconButton from '../../../design-system/components/IconButton';
import { SkeletonList } from '../../../design-system/components/Skeleton';
import EmptyState from '../../../design-system/components/EmptyState';
import { useTheme } from '../../../design-system/ThemeProvider';
import { Send, Sparkles } from '../../../design-system/icons';
import { get, post } from '../../../api/client';
import { useWorkspaceId } from '../../../hooks/useListQuery';
import { showApiError } from '../../../utils/errorMessage';

/**
 * Copilot chat (mobile) — reuses the existing REST endpoints:
 *   POST /copilot/sessions            create session
 *   GET  /copilot/sessions/:id/messages
 *   POST /copilot/sessions/:id/messages   202 accepted, processed async
 *
 * Sending returns 202 immediately (server processes the reply async, same as
 * the web's streaming path minus the socket) — so after a send we poll the
 * messages query briefly until a new assistant message shows up, instead of a
 * single refetch that would usually race ahead of the reply.
 */

const POLL_MS = 1500;
const POLL_MAX_MS = 20000;

export default function CopilotScreen() {
  const theme = useTheme();
  const ws = useWorkspaceId();
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState(null);
  const [input, setInput] = useState('');
  const [waitingForReply, setWaitingForReply] = useState(false);
  const scrollRef = useRef(null);
  const waitStartRef = useRef(0);
  const lastCountRef = useRef(0);

  // Create a session on mount.
  useEffect(() => {
    let active = true;
    post('/copilot/sessions', {})
      .then((r) => { if (active) setSessionId(r.data?.id || r.data?.sessionId); })
      .catch((err) => showApiError(err, 'Could not start Copilot'));
    return () => { active = false; };
  }, []);

  const messagesQuery = useQuery({
    queryKey: [ws, 'copilot', sessionId, 'messages'],
    queryFn: () => get(`/copilot/sessions/${sessionId}/messages`),
    enabled: Boolean(ws && sessionId),
    select: (r) => (Array.isArray(r.data) ? r.data : []),
    refetchInterval: waitingForReply ? POLL_MS : false,
  });

  const messages = messagesQuery.data || [];

  useEffect(() => {
    if (!waitingForReply) return;
    const gotNew = messages.length > lastCountRef.current;
    const timedOut = Date.now() - waitStartRef.current > POLL_MAX_MS;
    if (gotNew || timedOut) {
      setWaitingForReply(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, waitingForReply]);

  const send = useMutation({
    mutationFn: (text) => post(`/copilot/sessions/${sessionId}/messages`, { content: text }),
    onSuccess: () => {
      lastCountRef.current = messages.length + 1; // +1 for the user's own message about to appear
      waitStartRef.current = Date.now();
      setWaitingForReply(true);
      qc.invalidateQueries({ queryKey: [ws, 'copilot', sessionId, 'messages'] });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    },
    onError: (err) => showApiError(err, 'Copilot could not reply'),
  });

  const submit = () => {
    const text = input.trim();
    if (!text || !sessionId) return;
    setInput('');
    send.mutate(text);
  };

  return (
    <ScreenScaffold>
      <AppHeader title="Copilot" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {!sessionId ? (
          <SkeletonList count={3} />
        ) : messagesQuery.isPending ? (
          <SkeletonList count={3} />
        ) : !messages.length ? (
          <EmptyState
            icon={Sparkles}
            title="Ask Copilot"
            message="Ask about your leads, deals, tasks, or pipeline — e.g. “How many leads did I win this month?”"
          />
        ) : (
          <ScrollView ref={scrollRef} contentContainerStyle={styles.messages}>
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <View
                  key={m.id}
                  style={[
                    styles.bubble,
                    { alignSelf: isUser ? 'flex-end' : 'flex-start', backgroundColor: isUser ? theme.colors.brandSoft : theme.colors.surfaceAlt },
                  ]}
                >
                  <AppText variant="body">{m.content}</AppText>
                </View>
              );
            })}
            {waitingForReply ? (
              <View style={[styles.bubble, { alignSelf: 'flex-start', backgroundColor: theme.colors.surfaceAlt }]}>
                <AppText variant="body" color="muted">Thinking…</AppText>
              </View>
            ) : null}
          </ScrollView>
        )}

        <View style={styles.inputRow}>
          <TextField
            placeholder="Ask Copilot…"
            value={input}
            onChangeText={setInput}
            style={styles.flex}
            onSubmitEditing={submit}
          />
          <IconButton icon={Send} accessibilityLabel="Send" onPress={submit} disabled={!input.trim() || send.isPending} />
        </View>
      </KeyboardAvoidingView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  messages: { padding: 12, gap: 10 },
  bubble: { maxWidth: '85%', borderRadius: 14, padding: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
});
