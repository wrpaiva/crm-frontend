import api from './api';

export async function getAuthUrl() {
  const response = await api.get('/google/auth-url');
  return response.data;
}

export async function getConnectionStatus() {
  const response = await api.get('/google/status');
  return response.data;
}

export async function disconnectGoogle() {
  const response = await api.delete('/google/disconnect');
  return response.data;
}

export async function createCalendarEvent(data) {
  const response = await api.post('/google/calendar/event', data);
  return response.data;
}
