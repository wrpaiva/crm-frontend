import api from './api';

export async function getConversations(params = {}) {
  const response = await api.get('/whatsapp/conversations', { params });
  return response.data;
}

export async function getMessages(conversationId, params = {}) {
  const response = await api.get(`/whatsapp/conversations/${conversationId}/messages`, { params });
  return response.data;
}

export async function sendMessage(conversationId, text) {
  const response = await api.post('/whatsapp/messages', { conversationId, text });
  return response.data;
}

export async function sendMedia(conversationId, type, mediaUrl, caption, filename) {
  const response = await api.post('/whatsapp/media', {
    conversationId,
    type,
    mediaUrl,
    caption: caption || '',
    filename: filename || ''
  });
  return response.data;
}

export async function getTemplates() {
  const response = await api.get('/whatsapp/templates');
  return response.data;
}

export async function sendTemplate(phoneNumber, templateName, languageCode, components) {
  const response = await api.post('/whatsapp/templates/send', {
    phoneNumber,
    templateName,
    languageCode: languageCode || 'pt_BR',
    components
  });
  return response.data;
}

export async function getMediaUrl(mediaId) {
  const response = await api.get(`/whatsapp/media/${mediaId}`);
  return response.data;
}

export async function markAsRead(conversationId) {
  const response = await api.patch(`/whatsapp/conversations/${conversationId}/read`);
  return response.data;
}

export async function assignConversation(conversationId, assignedTo) {
  const response = await api.patch(`/whatsapp/conversations/${conversationId}/assign`, { assignedTo });
  return response.data;
}

export async function linkToEntity(conversationId, data) {
  const response = await api.patch(`/whatsapp/conversations/${conversationId}/link`, data);
  return response.data;
}
