import api from './api';

export async function getDeals(params = {}) {
  const response = await api.get('/deals', { params });
  return response.data;
}

export async function createDeal(payload) {
  const response = await api.post('/deals', payload);
  return response.data;
}

export async function getKanban() {
  const response = await api.get('/deals/kanban/board');
  return response.data;
}

export async function getDealById(dealId) {
  const response = await api.get(`/deals/${dealId}`);
  return response.data;
}

export async function updateDealStage(dealId, stage) {
  const response = await api.patch(`/deals/${dealId}/stage`, { stage });
  return response.data;
}

export async function deleteDeal(id) {
  const response = await api.delete(`/deals/${id}`);
  return response.data;
}

export async function closeDealWon(id) {
  const response = await api.patch(`/deals/${id}/close-won`);
  return response.data;
}

export async function closeDealLost(id, reason = '') {
  const response = await api.patch(`/deals/${id}/close-lost`, reason ? { reason } : {});
  return response.data;
}