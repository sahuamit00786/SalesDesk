import { get } from '../../api/client';

export const searchApi = {
  global: (q, limit = 5) => get('/search', { q, limit }),
};
