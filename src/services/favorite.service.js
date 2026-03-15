import api from './api';

export async function getFavorites() {
  const response = await api.get('/favorites');
  return response.data;
}

export async function addFavorite(entityType, entityId) {
  const response = await api.post('/favorites', { entityType, entityId });
  return response.data;
}

export async function removeFavorite(favoriteId) {
  const response = await api.delete(`/favorites/${favoriteId}`);
  return response.data;
}

export async function checkFavorite(entityType, entityId) {
  const response = await api.get(`/favorites/check/${entityType}/${entityId}`);
  return response.data;
}
