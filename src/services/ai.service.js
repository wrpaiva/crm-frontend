import api from './api';

export async function sendMessage(message, conversationId) {
  const payload = { message };
  if (conversationId) {
    payload.conversationId = conversationId;
  }
  const response = await api.post('/ai/chat', payload);
  return response.data;
}

export async function getConversations(params = {}) {
  const response = await api.get('/ai/conversations', { params });
  return response.data;
}

export async function getConversation(id) {
  const response = await api.get(`/ai/conversations/${id}`);
  return response.data;
}

export async function deleteConversation(id) {
  const response = await api.delete(`/ai/conversations/${id}`);
  return response.data;
}
