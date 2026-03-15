import api from './api';

export async function getProfile() {
  const response = await api.get('/users/profile');
  return response.data;
}

export async function updateProfile(data) {
  const response = await api.put('/users/profile', data);
  return response.data;
}

export async function changePassword(data) {
  const response = await api.put('/users/profile/password', data);
  return response.data;
}

export async function getUsers(params = {}) {
  const response = await api.get('/users', { params });
  return response.data;
}

export async function createUser(data) {
  const response = await api.post('/users', data);
  return response.data;
}

export async function updateUser(id, data) {
  const response = await api.put(`/users/${id}`, data);
  return response.data;
}
