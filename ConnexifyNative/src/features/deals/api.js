import { get, post, patch, del } from '../../api/client';

export const dealsApi = {
  list: (params) => get('/deals', params),
  detail: (id) => get(`/deals/${id}`),
  create: (body) => post('/deals', body),
  update: (id, body) => patch(`/deals/${id}`, body),
  patchStage: (id, stage) => patch(`/deals/${id}/stage`, { stage }),
  remove: (id) => del(`/deals/${id}`),
  activities: (id) => get(`/deals/${id}/activities`),
  addActivity: (id, body) => post(`/deals/${id}/activities`, body),
  payments: (id) => get(`/deals/${id}/payments`),
};
