import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { keys } from '../../api/queryKeys';
import { useListQuery, useWorkspaceId } from '../../hooks/useListQuery';
import { tasksApi } from './api';

export function useTasksList(params) {
  return useListQuery({
    keyFn: (ws, p) => keys.tasks.list(ws, p),
    fetcher: (p) => tasksApi.list(p),
    params,
    limit: 25,
  });
}

export function useTaskMutations() {
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  return {
    update: useMutation({
      mutationFn: ({ taskId, body }) => tasksApi.update(taskId, body),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: keys.tasks.all(ws) });
        qc.invalidateQueries({ queryKey: [ws, 'dashboard'] });
      },
      onError: (err) => Toast.show({ type: 'error', text1: 'Update failed', text2: err?.message }),
    }),
  };
}
