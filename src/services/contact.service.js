import api from './api';

export async function getContacts(params = {}) {
  const response = await api.get('/contacts', { params });
  return response.data;
}

export async function getContactById(id) {
  const response = await api.get(`/contacts/${id}`);
  return response.data;
}

export async function createContact(payload) {
  const response = await api.post('/contacts', payload);
  return response.data;
}