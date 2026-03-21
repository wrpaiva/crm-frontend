import api from './api';

export async function getAiResponderConfig() {
  const response = await api.get('/ai-responder/config');
  return response.data;
}

export async function updateAiResponderConfig(data) {
  const response = await api.put('/ai-responder/config', data);
  return response.data;
}

export async function getAiConversation(conversationId) {
  const response = await api.get(`/ai-responder/conversations/${conversationId}`);
  return response.data;
}

export async function transferToHuman(conversationId) {
  const response = await api.post(`/ai-responder/conversations/${conversationId}/transfer`);
  return response.data;
}

export async function stopAi(conversationId) {
  const response = await api.post(`/ai-responder/conversations/${conversationId}/stop`);
  return response.data;
}
