import { get } from '../../api/client';

export const campaignsApi = {
  list: (params) => get('/campaigns', params),
  detail: (id) => get(`/campaigns/${id}`),
  leads: (id, params) => get(`/campaigns/${id}/leads`, params),
};
