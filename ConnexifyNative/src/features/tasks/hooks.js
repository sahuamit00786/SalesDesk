import { useMutation, useQueryClient } from '@tanstack/react-query';
import { keys } from '../../api/queryKeys';
import { useListQuery, useWorkspaceId } from '../../hooks/useListQuery';
import { tasksApi } from './api';
import { showApiError } from '../../utils/errorMessage';

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
      onError: (err) => showApiError(err, 'Could not update task'),
    }),
  };
}
