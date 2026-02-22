import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('agrovault_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error normaliser
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error || err.response?.data?.message || err.message;
    return Promise.reject({ message, status: err.response?.status });
  }
);

/* ── Auth ─────────────────────────────── */
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  profile: () => api.get('/auth/profile'),
};

/* ── Market Analysis (public) ─────────── */
export const marketAPI = {
  overview: () => api.get('/market-analysis/overview'),
  analyze: (commodityId) => api.get(`/market-analysis/${commodityId}`),
  chart: (commodityId, params) =>
    api.get(`/market-analysis/${commodityId}/chart`, { params }),
  forecast: (commodityId) => api.get(`/market-analysis/${commodityId}/forecast`),
  seasonal: (commodityId) => api.get(`/market-analysis/${commodityId}/seasonal`),
  dashboard: (params) => api.get('/market-analysis/dashboard', { params }),
};

/* ── Commodities ──────────────────────── */
export const commodityAPI = {
  list: () => api.get('/commodities'),
  get: (id) => api.get(`/commodities/${id}`),
  create: (data) => api.post('/commodities', data),
  update: (id, data) => api.put(`/commodities/${id}`, data),
  delete: (id) => api.delete(`/commodities/${id}`),
};

/* ── Market Data ──────────────────────── */
export const marketDataAPI = {
  latest: (params) => api.get('/market-data/latest', { params }),
  history: (commodityId, params) =>
    api.get(`/market-data/history/${commodityId}`, { params }),
};

/* ── Storage Units (auth required) ────── */
export const storageAPI = {
  list: () => api.get('/storage-units'),
  get: (id) => api.get(`/storage-units/${id}`),
  create: (data) => api.post('/storage-units', data),
  update: (id, data) => api.put(`/storage-units/${id}`, data),
};

/* ── Sensors (auth required) ──────────── */
export const sensorAPI = {
  readings: (unitId, params) =>
    api.get(`/sensors/${unitId}/readings`, { params }),
  latest: (unitId) => api.get(`/sensors/${unitId}/latest`),
};

/* ── Recommendations (auth required) ──── */
export const recommendationAPI = {
  forUnit: (unitId) => api.get(`/recommendations/${unitId}`),
};

/* ── Alerts (auth required) ───────────── */
export const alertAPI = {
  list: (params) => api.get('/alerts', { params }),
  markRead: (id) => api.put(`/alerts/${id}/read`),
};

export default api;
