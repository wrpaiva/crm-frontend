import api from './api';

export async function loginRequest(payload) {
  const response = await api.post('/auth/login', payload);
  return response.data;
}

export async function registerRequest(payload) {
  const response = await api.post('/auth/register', payload);
  return response.data;
}

export async function meRequest() {
  const response = await api.get('/auth/me');
  return response.data;
}