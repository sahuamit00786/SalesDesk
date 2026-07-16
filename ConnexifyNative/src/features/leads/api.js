import { get, post, put, patch, del } from '../../api/client';

// Endpoint parity: client/src/features/leads/leadsApi.js · leads use sort+order params.
export const leadsApi = {
  list: (params) => get('/leads', params),
  detail: (id) => get(`/leads/${id}`),
  formMeta: () => get('/leads/form-meta'),
  create: (body) => post('/leads', body),
  update: (id, body, updatedAt) =>
    put(`/leads/${id}`, body, updatedAt ? { headers: { 'If-Unmodified-Since': new Date(updatedAt).toUTCString() } } : undefined),
  patchStatus: (id, body) => patch(`/leads/${id}/status`, body), // { status, lostReason?, notes? }
  remove: (id) => del(`/leads/${id}`),
  bulk: (body) => post('/leads/bulk', body), // { ids, action: assign|update|delete|export, payload }

  // Sub-resources
  activities: (id, params) => get(`/leads/${id}/activities`, params),
  addActivity: (id, body) => post(`/leads/${id}/activities`, body),
  notes: (id) => get(`/leads/${id}/notes`),
  addNote: (id, body) => post(`/leads/${id}/notes`, body),
  updateNote: (id, noteId, body) => patch(`/leads/${id}/notes/${noteId}`, body),
  deleteNote: (id, noteId) => del(`/leads/${id}/notes/${noteId}`),
  tasks: (id) => get(`/leads/${id}/tasks`),
  addTask: (id, body) => post(`/leads/${id}/tasks`, body),
  updateTask: (id, taskId, body) => patch(`/leads/${id}/tasks/${taskId}`, body),
  deleteTask: (id, taskId) => del(`/leads/${id}/tasks/${taskId}`),
  addTaskComment: (id, taskId, body) => post(`/leads/${id}/tasks/${taskId}/comments`, body),
  taskTimeline: (id, taskId) => get(`/leads/${id}/tasks/${taskId}/timeline`),
  // subtasks are updated via the existing task patch: updateTask(id, taskId, { subtasks: [...] })
  followups: (id) => get(`/leads/${id}/followups`),
  addFollowup: (id, body) => post(`/leads/${id}/followups`, body),
  updateFollowup: (id, followupId, body) => patch(`/leads/${id}/followups/${followupId}`, body),
  deleteFollowup: (id, followupId) => del(`/leads/${id}/followups/${followupId}`),
  files: (id) => get(`/leads/${id}/files`),

  // Saved views
  savedViews: () => get('/leads/saved-views'),
  createSavedView: (body) => post('/leads/saved-views', body),
  deleteSavedView: (viewId) => del(`/leads/saved-views/${viewId}`),

  // Duplicates
  duplicates: (params) => get('/leads/duplicates', params),
  mergeDuplicate: (dupId, body) => post(`/leads/duplicates/${dupId}/merge`, body),
  dismissDuplicate: (dupId) => del(`/leads/duplicates/${dupId}`),

  // Archived + restore
  archived: (params) => get('/leads/archived', params),
  restore: (id) => post(`/leads/${id}/restore`),
};

export const opportunitiesApi = {
  // List = leads with isOpportunity=true (web parity)
  list: (params) => get('/leads', { ...params, isOpportunity: true }),
  create: (body) => post('/opportunities', body),
  update: (id, body) => put(`/opportunities/${id}`, body),
  patchStatus: (id, pipelineStatusId) => patch(`/opportunities/${id}/status`, { pipelineStatusId }),
};
