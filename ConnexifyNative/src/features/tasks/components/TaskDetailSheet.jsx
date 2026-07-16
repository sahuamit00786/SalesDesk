import React, { useRef, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppText from '../../../design-system/components/AppText';
import Sheet from '../../../design-system/components/Sheet';
import Card from '../../../design-system/components/Card';
import Button from '../../../design-system/components/Button';
import TextField from '../../../design-system/components/TextField';
import { CheckSquare, Square, MessageSquare } from '../../../design-system/icons';
import { useTheme } from '../../../design-system/ThemeProvider';
import { leadsApi } from '../../leads/api';
import { keys } from '../../../api/queryKeys';
import { useWorkspaceId } from '../../../hooks/useListQuery';
import { showApiError } from '../../../utils/errorMessage';
import { formatDateTime } from '../../../utils/format';

/**
 * TaskDetailSheet — subtasks checklist + comments, closing the task parity gap.
 *
 * Subtasks: tasks already return a `subtasks` array; toggling one PATCHes the
 * task with the updated subtasks array (server replaceLeadTaskSubtasks).
 * Comments: POST /leads/:id/tasks/:taskId/comments; timeline GET returns the
 * merged comment/activity stream.
 *
 * Usage from TasksListScreen: on row press, open with the task object:
 *   <TaskDetailSheet ref={sheetRef} />
 *   sheetRef.current?.open(activeTask)
 */

const TaskDetailSheet = React.forwardRef(function TaskDetailSheet(_props, ref) {
  const theme = useTheme();
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  const sheetRef = useRef(null);
  const [task, setTask] = useState(null);
  const [comment, setComment] = useState('');

  React.useImperativeHandle(ref, () => ({
    open: (t) => {
      setTask(t);
      setComment('');
      requestAnimationFrame(() => sheetRef.current?.present());
    },
    close: () => sheetRef.current?.dismiss(),
  }));

  const leadId = task?.leadId;
  const taskId = task?.id;

  const timeline = useQuery({
    queryKey: [ws, 'task-timeline', leadId, taskId],
    queryFn: () => leadsApi.taskTimeline(leadId, taskId),
    enabled: Boolean(task && ws && leadId && taskId),
    select: (r) => (Array.isArray(r.data) ? r.data : []),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: keys.tasks.all(ws) });
    qc.invalidateQueries({ queryKey: [ws, 'task-timeline', leadId, taskId] });
    if (leadId) qc.invalidateQueries({ queryKey: keys.leads.sub(ws, leadId, 'tasks') });
  };

  const toggleSubtask = useMutation({
    mutationFn: ({ subtasks }) => leadsApi.updateTask(leadId, taskId, { subtasks }),
    onSuccess: invalidate,
    onError: (err) => showApiError(err, 'Could not update subtask'),
  });

  const addComment = useMutation({
    mutationFn: (body) => leadsApi.addTaskComment(leadId, taskId, body),
    onSuccess: () => { setComment(''); invalidate(); },
    onError: (err) => showApiError(err, 'Could not add comment'),
  });

  const onToggle = (sub) => {
    const next = (task.subtasks || []).map((s) =>
      s.id === sub.id ? { ...s, isDone: !s.isDone } : s,
    );
    setTask((t) => ({ ...t, subtasks: next }));
    toggleSubtask.mutate({ subtasks: next });
  };

  return (
    <Sheet ref={sheetRef} title={task?.title || 'Task'} scrollable>
      {task ? (
        <View style={styles.body}>
          {task.subtasks?.length ? (
            <Card style={styles.card}>
              <AppText variant="label" color="muted">Subtasks</AppText>
              {task.subtasks.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => onToggle(s)}
                  style={styles.subRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: Boolean(s.isDone) }}
                  accessibilityLabel={s.title}
                >
                  {s.isDone ? <CheckSquare size={18} color={theme.colors.success} /> : <Square size={18} color={theme.colors.inkMuted} />}
                  <AppText variant="body" style={[styles.flex, s.isDone && styles.done]}>{s.title}</AppText>
                </Pressable>
              ))}
            </Card>
          ) : null}

          <Card style={styles.card}>
            <View style={styles.commentsHead}>
              <MessageSquare size={16} color={theme.colors.inkMuted} />
              <AppText variant="label" color="muted">Comments</AppText>
            </View>
            {timeline.isPending ? (
              <AppText variant="caption" color="muted">Loading…</AppText>
            ) : (timeline.data || []).length ? (
              (timeline.data || []).map((c) => (
                <View key={c.id} style={styles.commentRow}>
                  <AppText variant="body">{c.body || c.comment}</AppText>
                  <AppText variant="caption" color="muted">
                    {c.author?.name || c.userName || 'Someone'} · {formatDateTime(c.createdAt)}
                  </AppText>
                </View>
              ))
            ) : (
              <AppText variant="caption" color="muted">No comments yet.</AppText>
            )}

            <View style={styles.addRow}>
              <TextField
                placeholder="Add a comment…"
                value={comment}
                onChangeText={setComment}
                style={styles.flex}
              />
              <Button
                title="Post"
                onPress={() => comment.trim() && addComment.mutate({ body: comment.trim() })}
                disabled={!comment.trim() || addComment.isPending}
              />
            </View>
          </Card>
        </View>
      ) : null}
    </Sheet>
  );
});

export default TaskDetailSheet;

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 8 },
  card: { padding: 12, gap: 8 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  done: { textDecorationLine: 'line-through', opacity: 0.6 },
  commentsHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentRow: { paddingVertical: 6, gap: 2 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 },
  flex: { flex: 1 },
});
