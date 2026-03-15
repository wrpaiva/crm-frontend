import api from './api';

export async function getRules() {
  const response = await api.get('/scoring/rules');
  return response.data;
}

export async function createRule(payload) {
  const response = await api.post('/scoring/rules', payload);
  return response.data;
}

export async function updateRule(id, payload) {
  const response = await api.put(`/scoring/rules/${id}`, payload);
  return response.data;
}

export async function deleteRule(id) {
  const response = await api.delete(`/scoring/rules/${id}`);
  return response.data;
}

export async function recalculateAll() {
  const response = await api.post('/scoring/recalculate');
  return response.data;
}

export async function previewScore(leadId) {
  const response = await api.get(`/scoring/preview/${leadId}`);
  return response.data;
}
