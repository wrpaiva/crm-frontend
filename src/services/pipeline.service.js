import api from './api';

// Pipeline
export async function getPipelines() {
  const response = await api.get('/pipelines');
  return response.data;
}

export async function createPipeline(payload) {
  const response = await api.post('/pipelines', payload);
  return response.data;
}

export async function updatePipeline(id, payload) {
  const response = await api.put(`/pipelines/${id}`, payload);
  return response.data;
}

export async function removePipeline(id) {
  const response = await api.delete(`/pipelines/${id}`);
  return response.data;
}

// Stages
export async function getStages(pipelineId) {
  const response = await api.get(`/pipelines/${pipelineId}/stages`);
  return response.data;
}

export async function createStage(pipelineId, payload) {
  const response = await api.post(`/pipelines/${pipelineId}/stages`, payload);
  return response.data;
}

export async function updateStage(pipelineId, stageId, payload) {
  const response = await api.put(`/pipelines/${pipelineId}/stages/${stageId}`, payload);
  return response.data;
}

export async function removeStage(pipelineId, stageId) {
  const response = await api.delete(`/pipelines/${pipelineId}/stages/${stageId}`);
  return response.data;
}
