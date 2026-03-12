import api from './api';

export async function getPendingActivities(params = {}) {
  const response = await api.get('/activities/pending/me', { params });
  return response.data;
}

export async function getActivitiesByRelated(relatedType, relatedId, params = {}) {
  const response = await api.get(`/activities/${relatedType}/${relatedId}`, {
    params
  });
  return response.data;
}

export async function completeActivity(activityId) {
  const response = await api.patch(`/activities/${activityId}/complete`);
  return response.data;
}