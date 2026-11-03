import api from './axios.js';

// Patient *registration* endpoints — deliberately separate from appointments.
const patientsApi = {
  create: (data) => api.post('/patients', data),
  getPending: (params) => api.get('/patients/pending', { params }),
  getRegistered: (params) => api.get('/patients/registered', { params }),
  getRejected: (params) => api.get('/patients/rejected', { params }),
  getOne: (id) => api.get(`/patients/${id}`),
  update: (id, data) => api.put(`/patients/${id}`, data),
  approve: (id) => api.put(`/patients/${id}/approve`),
  reject: (id, rejectionReason) => api.put(`/patients/${id}/reject`, { rejectionReason }),
  search: (q) => api.get('/patients/search', { params: { q } }),
};

export default patientsApi;
