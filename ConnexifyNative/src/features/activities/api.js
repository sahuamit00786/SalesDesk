import { get } from '../../api/client';

export const activitiesApi = {
  feed: (params) => get('/activities', params), // { from, to, types (csv), limit }
  types: () => get('/activities/types'),
};
