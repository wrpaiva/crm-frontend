import api from './api';

export async function getGoals(params = {}) {
  const response = await api.get('/goals', { params });
  return response.data;
}

export async function getGoalById(id) {
  const response = await api.get(`/goals/${id}`);
  return response.data;
}

export async function getGoalsSummary(params = {}) {
  const response = await api.get('/goals/summary', { params });
  return response.data;
}

export async function createGoal(payload) {
  const response = await api.post('/goals', payload);
  return response.data;
}

export async function updateGoal(id, payload) {
  const response = await api.put(`/goals/${id}`, payload);
  return response.data;
}

export async function updateProgress(id, currentValue) {
  const response = await api.patch(`/goals/${id}/progress`, { currentValue });
  return response.data;
}

export async function deleteGoal(id) {
  const response = await api.delete(`/goals/${id}`);
  return response.data;
}
