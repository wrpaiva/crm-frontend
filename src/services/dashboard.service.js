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