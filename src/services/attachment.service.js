import api from './api';

export async function uploadAttachment(entityType, entityId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(`/attachments/${entityType}/${entityId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

export async function getAttachments(entityType, entityId) {
  const response = await api.get(`/attachments/${entityType}/${entityId}`);
  return response.data;
}

export async function downloadAttachment(id) {
  const baseURL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem('crm_token');
  window.open(`${baseURL}/attachments/${id}/download?token=${token}`, '_blank');
}

export async function deleteAttachment(id) {
  const response = await api.delete(`/attachments/${id}`);
  return response.data;
}
