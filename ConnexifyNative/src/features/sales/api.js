import { get } from '../../api/client';

export const salesApi = {
  quotations: (params) => get('/quotations', params),
  quotation: (id) => get(`/quotations/${id}`),
  invoices: (params) => get('/invoices', params),
  invoice: (id) => get(`/invoices/${id}`),
};
// NOTE: there is no server PDF endpoint — the web renders print pages from JSON.
// For "Share" on mobile we build a shareable summary from the JSON.
