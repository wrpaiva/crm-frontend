import api from './api';

export async function getConfig() {
  const response = await api.get('/distribution/config');
  return response.data;
}

export async function updateConfig(payload) {
  const response = await api.put('/distribution/config', payload);
  return response.data;
}

export async function addToPool(userId) {
  const response = await api.post(`/distribution/pool/${userId}`);
  return response.data;
}

export async function removeFromPool(userId) {
  const response = await api.delete(`/distribution/pool/${userId}`);
  return response.data;
}
