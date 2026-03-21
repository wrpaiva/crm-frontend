import api from './api';

export async function globalSearch(q, limit = 5) {
  const response = await api.get('/search', { params: { q, limit } });
  return response.data;
}
