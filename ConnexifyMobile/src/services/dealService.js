import api from './api';

export const dealService = {
  getDeals: (params = {}) =>
    api.get('/deals', { params }).then((r) => r.data),

  getDeal: (id) =>
    api.get(`/deals/${id}`).then((r) => r.data),

  createDeal: (data) =>
    api.post('/deals', data).then((r) => r.data),

  updateDeal: (id, data) =>
    api.patch(`/deals/${id}`, data).then((r) => r.data),

  updateStage: (id, stage) =>
    api.patch(`/deals/${id}/stage`, { stage }).then((r) => r.data),

  deleteDeal: (id) =>
    api.delete(`/deals/${id}`).then((r) => r.data),

  getDealActivities: (id, params = {}) =>
    api.get(`/deals/${id}/activities`, { params }).then((r) => r.data),

  createDealActivity: (id, data) =>
    api.post(`/deals/${id}/activities`, data).then((r) => r.data),

  getDealPayments: (id) =>
    api.get(`/deals/${id}/payments`).then((r) => r.data),

  createPayment: (id, data) =>
    api.post(`/deals/${id}/payments`, data).then((r) => r.data),

  updatePayment: (dealId, paymentId, data) =>
    api.patch(`/deals/${dealId}/payments/${paymentId}`, data).then((r) => r.data),

  deletePayment: (dealId, paymentId) =>
    api.delete(`/deals/${dealId}/payments/${paymentId}`).then((r) => r.data),
};
