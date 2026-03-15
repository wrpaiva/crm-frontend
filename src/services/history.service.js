import api from './api';

export async function getAllHistory(params = {}) {
  const response = await api.get('/history', { params });
  return response.data;
}

export async function getHistory(entityType, entityId) {
  const response = await api.get(`/history/${entityType}/${entityId}`);
  return response.data;
}

export async function getAudit(entityType, entityId) {
  const response = await api.get(`/audit/${entityType}/${entityId}`);
  return response.data;
}
