import api from './client';

// Auth
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
};

// Users
export const usersApi = {
  list: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  getOne: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.patch(`/users/${id}`, data),
  deactivate: (id) => api.delete(`/users/${id}`),
  activate: (id) => api.patch(`/users/${id}/activate`),
};

// Areas
export const areasApi = {
  list: (params) => api.get('/areas', { params }),
  create: (data) => api.post('/areas', data),
  getOne: (id) => api.get(`/areas/${id}`),
  update: (id, data) => api.patch(`/areas/${id}`, data),
  remove: (id) => api.delete(`/areas/${id}`),
  listMembers: (id) => api.get(`/areas/${id}/members`),
  addMember: (id, data) => api.post(`/areas/${id}/members`, data),
  removeMember: (areaId, userId) => api.delete(`/areas/${areaId}/members/${userId}`),
};

// Documents
export const documentsApi = {
  list: (params) => api.get('/documents', { params }),
  create: (data) => api.post('/documents', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getOne: (id) => api.get(`/documents/${id}`),
  update: (id, data) => api.patch(`/documents/${id}`, data),
  addVersion: (id, data) => api.put(`/documents/${id}/version`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  remove: (id) => api.delete(`/documents/${id}`),
};

// Legislative
export const legislativeApi = {
  list: (params) => api.get('/legislative', { params }),
  create: (data) => api.post('/legislative', data),
  getOne: (id) => api.get(`/legislative/${id}`),
  update: (id, data) => api.patch(`/legislative/${id}`, data),
  remove: (id) => api.delete(`/legislative/${id}`),
  addAssignee: (id, userId) => api.post(`/legislative/${id}/assignees`, { user_id: userId }),
  removeAssignee: (id, userId) => api.delete(`/legislative/${id}/assignees/${userId}`),
  getMessages: (id) => api.get(`/legislative/${id}/messages`),
  sendMessage: (id, content) => api.post(`/legislative/${id}/messages`, { content }),
  getTimeline: (id) => api.get(`/legislative/${id}/timeline`),
  linkDocument: (id, documentId) => api.post(`/legislative/${id}/documents`, { document_id: documentId }),
};

// Chat
export const chatApi = {
  listChannels: () => api.get('/chat/channels'),
  createChannel: (data) => api.post('/chat/channels', data),
  getChannel: (id) => api.get(`/chat/channels/${id}`),
  joinChannel: (id) => api.post(`/chat/channels/${id}/join`),
  leaveChannel: (id) => api.post(`/chat/channels/${id}/leave`),
  getMessages: (id, params) => api.get(`/chat/channels/${id}/messages`, { params }),
  sendMessage: (id, data) => api.post(`/chat/channels/${id}/messages`, data),
  editMessage: (channelId, msgId, content) => api.patch(`/chat/channels/${channelId}/messages/${msgId}`, { content }),
  deleteMessage: (channelId, msgId) => api.delete(`/chat/channels/${channelId}/messages/${msgId}`),
};

// Surveys
export const surveysApi = {
  list: (params) => api.get('/surveys', { params }),
  create: (data) => api.post('/surveys', data),
  getOne: (id) => api.get(`/surveys/${id}`),
  update: (id, data) => api.patch(`/surveys/${id}`, data),
  updateStatus: (id, status) => api.patch(`/surveys/${id}/status`, { status }),
  remove: (id) => api.delete(`/surveys/${id}`),
  getResponses: (id) => api.get(`/surveys/${id}/responses`),
  getAnalytics: (id) => api.get(`/surveys/${id}/analytics`),
  getPublic: (token) => api.get(`/surveys/public/${token}`),
  submit: (token, data) => api.post(`/surveys/respond/${token}`, data),
};

// Territories
export const territoriesApi = {
  list: (params) => api.get('/territories', { params }),
  create: (data) => api.post('/territories', data),
  getOne: (id) => api.get(`/territories/${id}`),
  update: (id, data) => api.patch(`/territories/${id}`, data),
  remove: (id) => api.delete(`/territories/${id}`),
  listPins: (params) => api.get('/territories/pins/all', { params }),
  createPin: (data) => api.post('/territories/pins', data),
  getPin: (id) => api.get(`/territories/pins/${id}`),
  updatePin: (id, data) => api.patch(`/territories/pins/${id}`, data),
  deletePin: (id) => api.delete(`/territories/pins/${id}`),
  addPinNote: (id, content) => api.post(`/territories/pins/${id}/notes`, { content }),
};

// Dashboard
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
  activity: (limit) => api.get('/dashboard/activity', { params: { limit } }),
  alerts: () => api.get('/dashboard/alerts'),
};

// Intelligence
export const intelligenceApi = {
  overview: () => api.get('/intelligence/overview'),
  auditLogs: (params) => api.get('/intelligence/audit-logs', { params }),
  userActivity: (period) => api.get('/intelligence/user-activity', { params: { period } }),
  territorialInsights: () => api.get('/intelligence/territorial-insights'),
  engagement: () => api.get('/intelligence/engagement'),
  export: (type, params) => api.get(`/intelligence/export/${type}`, { params, responseType: 'blob' }),
};
