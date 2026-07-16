import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { keys } from '../../api/queryKeys';
import { useListQuery, useWorkspaceId } from '../../hooks/useListQuery';
import { leadsApi, opportunitiesApi } from './api';
import { documentsApi } from '../documents/api';
import { callsApi } from '../calls/api';
import { showApiError } from '../../utils/errorMessage';

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

/** Mutations invalidating the leads (and opportunities) cache. */
export function useLeadMutations() {
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: keys.leads.all(ws) });
    qc.invalidateQueries({ queryKey: keys.opportunities.all(ws) });
  };
  const opts = (fallback) => ({
    onSuccess: () => invalidateAll(),
    onError: (err) => showApiError(err, fallback),
  });

  return {
    create: useMutation({ mutationFn: (body) => leadsApi.create(body), ...opts('Could not create lead') }),
    update: useMutation({
      mutationFn: ({ id, body, updatedAt }) => leadsApi.update(id, body, updatedAt),
      onSuccess: () => invalidateAll(),
      onError: (err) => {
        if (err.code === 'STALE_WRITE') {
          Toast.show({
            type: 'error',
            text1: 'Someone else edited this lead',
            text2: 'Pull to refresh to get the latest, then re-apply your change.',
          });
        } else {
          showApiError(err, 'Could not update lead');
        }
      },
    }),
    patchStatus: useMutation({ mutationFn: ({ id, ...body }) => leadsApi.patchStatus(id, body), ...opts('Could not update lead status') }),
    remove: useMutation({ mutationFn: (id) => leadsApi.remove(id), ...opts('Could not delete lead') }),
    bulk: useMutation({ mutationFn: (body) => leadsApi.bulk(body), ...opts('Bulk action failed') }),
    convertToOpportunity: useMutation({
      mutationFn: ({ id, body }) => opportunitiesApi.update(id, body),
      ...opts('Could not convert to opportunity'),
    }),
    patchPipelineStatus: useMutation({
      mutationFn: ({ id, pipelineStatusId }) => opportunitiesApi.patchStatus(id, pipelineStatusId),
      ...opts('Could not update stage'),
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
  const opts = (kind, fallback) => ({
    onSuccess: () => invalidate(kind),
    onError: (err) => showApiError(err, fallback),
  });

  return {
    addActivity: useMutation({ mutationFn: (body) => leadsApi.addActivity(id, body), ...opts('activities', 'Could not add activity') }),
    addNote: useMutation({ mutationFn: (body) => leadsApi.addNote(id, body), ...opts('notes', 'Could not add note') }),
    updateNote: useMutation({ mutationFn: ({ noteId, body }) => leadsApi.updateNote(id, noteId, body), ...opts('notes', 'Could not update note') }),
    deleteNote: useMutation({ mutationFn: (noteId) => leadsApi.deleteNote(id, noteId), ...opts('notes', 'Could not delete note') }),
    addTask: useMutation({ mutationFn: (body) => leadsApi.addTask(id, body), ...opts('tasks', 'Could not add task') }),
    updateTask: useMutation({ mutationFn: ({ taskId, body }) => leadsApi.updateTask(id, taskId, body), ...opts('tasks', 'Could not update task') }),
    deleteTask: useMutation({ mutationFn: (taskId) => leadsApi.deleteTask(id, taskId), ...opts('tasks', 'Could not delete task') }),
    addFollowup: useMutation({ mutationFn: (body) => leadsApi.addFollowup(id, body), ...opts('followups', 'Could not add follow-up') }),
    updateFollowup: useMutation({
      mutationFn: ({ followupId, body }) => leadsApi.updateFollowup(id, followupId, body),
      ...opts('followups', 'Could not update follow-up'),
    }),
    deleteFollowup: useMutation({ mutationFn: (followupId) => leadsApi.deleteFollowup(id, followupId), ...opts('followups', 'Could not delete follow-up') }),
  };
}

// --- Files (Documents module, linked to this lead — same store the web "Documents" tab reads) ---

export function useLeadDocuments(id) {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: keys.documents.list(ws, { leadId: id }),
    queryFn: () => documentsApi.list({ leadId: id }),
    enabled: Boolean(ws && id),
    select: (r) => (Array.isArray(r.data) ? r.data : []),
  });
}

export function useLeadDocumentMutations(id) {
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: keys.documents.list(ws, { leadId: id }) });
    // Uploads/deletes also log a lead activity — refresh the timeline + detail too.
    qc.invalidateQueries({ queryKey: keys.leads.sub(ws, id, 'activities') });
    qc.invalidateQueries({ queryKey: keys.leads.detail(ws, id) });
  };

  const upload = useMutation({
    mutationFn: ({ file, name, fileType }) =>
      documentsApi.upload({ file, name, fileType, links: [{ entityType: 'lead', entityId: id }] }),
    onSuccess: invalidate,
    onError: (err) => showApiError(err, 'Upload failed'),
  });
  const remove = useMutation({
    mutationFn: (documentId) => documentsApi.remove(documentId),
    onSuccess: invalidate,
    onError: (err) => showApiError(err, 'Could not delete file'),
  });

  return { upload, remove };
}

// --- Calls (manual "Log call" from the lead detail Calls tab) --------------

export function useLogLeadCall(id) {
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  return useMutation({
    mutationFn: (body) => callsApi.create({ ...body, leadId: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.calls.all(ws) });
      qc.invalidateQueries({ queryKey: keys.leads.detail(ws, id) });
    },
    onError: (err) => showApiError(err, 'Could not log call'),
  });
}

// --- Saved views -----------------------------------------------------------

export function useSavedViews() {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: keys.leads.savedViews(ws),
    queryFn: () => leadsApi.savedViews(),
    enabled: Boolean(ws),
    select: (r) => (Array.isArray(r.data) ? r.data : []),
  });
}

export function useSavedViewMutations() {
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.leads.savedViews(ws) });

  const create = useMutation({
    mutationFn: (body) => leadsApi.createSavedView(body),
    onSuccess: () => { invalidate(); Toast.show({ type: 'success', text1: 'View saved' }); },
    onError: (err) => showApiError(err, 'Could not save view'),
  });
  const remove = useMutation({
    mutationFn: (id) => leadsApi.deleteSavedView(id),
    onSuccess: invalidate,
    onError: (err) => showApiError(err, 'Could not delete view'),
  });
  return { create, remove };
}

// --- Duplicates (elevated roles) ------------------------------------------

export function useDuplicates(params) {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: keys.leads.duplicates(ws, params),
    queryFn: () => leadsApi.duplicates(params),
    enabled: Boolean(ws),
    select: (r) => (Array.isArray(r.data) ? r.data : []),
  });
}

export function useDuplicateMutations() {
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: keys.leads.all(ws) });
  };
  const merge = useMutation({
    mutationFn: ({ dupId, body }) => leadsApi.mergeDuplicate(dupId, body),
    onSuccess: () => { invalidate(); Toast.show({ type: 'success', text1: 'Leads merged' }); },
    onError: (err) => showApiError(err, 'Merge failed'),
  });
  const dismiss = useMutation({
    mutationFn: (dupId) => leadsApi.dismissDuplicate(dupId),
    onSuccess: invalidate,
    onError: (err) => showApiError(err, 'Could not dismiss'),
  });
  return { merge, dismiss };
}

// --- Archived + restore ----------------------------------------------------

export function useArchivedLeads(params) {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: keys.leads.archived(ws, params),
    queryFn: () => leadsApi.archived(params),
    enabled: Boolean(ws),
    select: (r) => ({ rows: Array.isArray(r.data) ? r.data : [], meta: r.meta }),
  });
}

export function useRestoreLead() {
  const qc = useQueryClient();
  const ws = useWorkspaceId();
  return useMutation({
    mutationFn: (id) => leadsApi.restore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.leads.all(ws) });
      Toast.show({ type: 'success', text1: 'Lead restored' });
    },
    onError: (err) => showApiError(err, 'Could not restore lead'),
  });
}
