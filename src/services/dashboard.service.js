import api from './api';

export async function getExecutiveDashboard() {
  const response = await api.get('/dashboard/executive');
  return response.data;
}

export async function getPipelineDashboard() {
  const response = await api.get('/dashboard/pipeline');
  return response.data;
}

export async function getActivitiesDashboard() {
  const response = await api.get('/dashboard/activities');
  return response.data;
}

export async function getSellersPerformance(params) {
  const response = await api.get('/dashboard/performance/sellers', { params });
  return response.data;
}

export async function getSourcesPerformance(params) {
  const response = await api.get('/dashboard/performance/sources', { params });
  return response.data;
}

export async function getRisks(params) {
  const response = await api.get('/dashboard/risks', { params });
  return response.data;
}

export async function getTimeline(params) {
  const response = await api.get('/dashboard/timeline', { params });
  return response.data;
}