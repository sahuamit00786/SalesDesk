import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { keys } from '../../api/queryKeys';
import { useListQuery, useWorkspaceId } from '../../hooks/useListQuery';
import { leadsApi, opportunitiesApi } from './api';

export function useLeadsList(params) {
  return useListQuery({
    keyFn: (ws, p) => keys.leads.list(ws, p),
    fetcher: (p) => leadsApi.list(p),
    params,
    limit: 20,
  });
}

export function useOpportunitiesList(params) {
  return useListQuery({
    keyFn: (ws, p) => keys.opportunities.list(ws, p),
    fetcher: (p) => opportunitiesApi.list(p),
    params,
    limit: 20,
  });
}

export function useLeadDetail(id) {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: keys.leads.detail(ws, id),
    queryFn: () => leadsApi.detail(id),
    enabled: Boolean(ws && id),
    select: (r) => ({ lead: r.data, summary: r.meta?.summary }),
  });
}

export function useLeadFormMeta() {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: keys.leads.formMeta(ws),
    queryFn: () => leadsApi.formMeta(),
    enabled: Boolean(ws),
    staleTime: 5 * 60_000,
    select: (r) => r.data || {},
  });
}

export function useLeadSub(id, kind) {
  const ws = useWorkspaceId();
  const fetchers = {
    activities: () => leadsApi.activities(id, { limit: 50 }),
    notes: () => leadsApi.notes(id),
    tasks: () => leadsApi.tasks(id),
    followups: () => leadsApi.followups(id),
    files: () => leadsApi.files(id),
  };
  return useQuery({
    queryKey: keys.leads.sub(ws, id, kind),
    queryFn: fetchers[kind],
    enabled: Boolean(ws && id),
    select: (r) => (Array.isArray(r.data) ? r.data : []),
  });
}

const toastError = (err) => Toast.show({ type: 'error', text1: 'Something went wrong', text2: err?.message });

/** Mutations invalidating the leads (and opportunities) cache. */
export function useLeadMutations() {
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: keys.leads.all(ws) });
    qc.invalidateQueries({ queryKey: keys.opportunities.all(ws) });
  };
  const opts = (onDone) => ({
    onSuccess: (res) => {
      invalidateAll();
      onDone?.(res);
    },
    onError: toastError,
  });

  return {
    create: useMutation({ mutationFn: (body) => leadsApi.create(body), ...opts() }),
    update: useMutation({ mutationFn: ({ id, body }) => leadsApi.update(id, body), ...opts() }),
    patchStatus: useMutation({ mutationFn: ({ id, ...body }) => leadsApi.patchStatus(id, body), ...opts() }),
    remove: useMutation({ mutationFn: (id) => leadsApi.remove(id), ...opts() }),
    bulk: useMutation({ mutationFn: (body) => leadsApi.bulk(body), ...opts() }),
    convertToOpportunity: useMutation({
      mutationFn: ({ id, body }) => opportunitiesApi.update(id, body),
      ...opts(),
    }),
    patchOpportunityStatus: useMutation({
      mutationFn: ({ id, opportunityStatusId }) => opportunitiesApi.patchStatus(id, opportunityStatusId),
      ...opts(),
    }),
  };
}

/** Sub-resource mutations for one lead. */
export function useLeadSubMutations(id) {
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  const invalidate = (kind) => {
    qc.invalidateQueries({ queryKey: keys.leads.sub(ws, id, kind) });
    qc.invalidateQueries({ queryKey: keys.leads.detail(ws, id) });
  };
  const opts = (kind) => ({ onSuccess: () => invalidate(kind), onError: toastError });

  return {
    addActivity: useMutation({ mutationFn: (body) => leadsApi.addActivity(id, body), ...opts('activities') }),
    addNote: useMutation({ mutationFn: (body) => leadsApi.addNote(id, body), ...opts('notes') }),
    updateNote: useMutation({ mutationFn: ({ noteId, body }) => leadsApi.updateNote(id, noteId, body), ...opts('notes') }),
    deleteNote: useMutation({ mutationFn: (noteId) => leadsApi.deleteNote(id, noteId), ...opts('notes') }),
    addTask: useMutation({ mutationFn: (body) => leadsApi.addTask(id, body), ...opts('tasks') }),
    updateTask: useMutation({ mutationFn: ({ taskId, body }) => leadsApi.updateTask(id, taskId, body), ...opts('tasks') }),
    deleteTask: useMutation({ mutationFn: (taskId) => leadsApi.deleteTask(id, taskId), ...opts('tasks') }),
    addFollowup: useMutation({ mutationFn: (body) => leadsApi.addFollowup(id, body), ...opts('followups') }),
    updateFollowup: useMutation({
      mutationFn: ({ followupId, body }) => leadsApi.updateFollowup(id, followupId, body),
      ...opts('followups'),
    }),
    deleteFollowup: useMutation({ mutationFn: (followupId) => leadsApi.deleteFollowup(id, followupId), ...opts('followups') }),
  };
}
