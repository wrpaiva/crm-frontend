import api from './api';

export async function getCadenceConfig() {
  const response = await api.get('/cadence/config');
  return response.data;
}

export async function updateCadenceConfig(data) {
  const response = await api.put('/cadence/config', data);
  return response.data;
}

export async function enrollLead(leadId) {
  const response = await api.post(`/cadence/leads/${leadId}/enroll`);
  return response.data;
}

export async function cancelEnrollment(leadId) {
  const response = await api.post(`/cadence/leads/${leadId}/cancel`);
  return response.data;
}

export async function pauseEnrollment(leadId) {
  const response = await api.post(`/cadence/leads/${leadId}/pause`);
  return response.data;
}

export async function resumeEnrollment(leadId) {
  const response = await api.post(`/cadence/leads/${leadId}/resume`);
  return response.data;
}

export async function getLeadEnrollment(leadId) {
  const response = await api.get(`/cadence/leads/${leadId}`);
  return response.data;
}
