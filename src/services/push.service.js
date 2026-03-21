// src/services/push.service.js
import api from './api';

export function getVapidPublicKey() {
  return api.get('/push/vapid-public-key');
}

export function subscribe(data) {
  return api.post('/push/subscribe', data);
}

export function unsubscribe(endpoint) {
  return api.delete('/push/subscribe', { data: { endpoint } });
}
