import api from './api';

export async function getLeads(params = {}) {
  const response = await api.get('/leads', { params });
  return response.data;
}

export async function getLeadById(id) {
  const response = await api.get(`/leads/${id}`);
  return response.data;
}

export async function createLead(payload) {
  const response = await api.post('/leads', payload);
  return response.data;
}

export async function updateLeadStatus(id, status) {
  const response = await api.patch(`/leads/${id}/status`, { status });
  return response.data;
}

export async function convertLead(id, payload) {
  const response = await api.post(`/leads/${id}/convert`, payload);
  return response.data;
}