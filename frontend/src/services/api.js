import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('drivealert_token') || localStorage.getItem('focusflow_token');
  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      ['drivealert_token', 'drivealert_user', 'focusflow_token', 'focusflow_user'].forEach((key) =>
        localStorage.removeItem(key)
      );
      if (!['/login', '/register'].includes(window.location.pathname)) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (credentials) => (await api.post('/auth/login', credentials)).data,
  register: async (userData) => (await api.post('/auth/register', userData)).data,
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {}
    ['drivealert_token', 'drivealert_user', 'focusflow_token', 'focusflow_user'].forEach((key) =>
      localStorage.removeItem(key)
    );
  },
  getMe: async () => (await api.get('/auth/me')).data,
};

export const userService = {
  getMe: async () => (await api.get('/users/me')).data,
  getStats: async () => (await api.get('/users/stats')).data,
  updateProfile: async (data) => (await api.put('/users/profile', data)).data,
};

export const contentService = {
  getAll: async (category = '') => {
    const url = category && category !== 'הכל'
      ? '/content?category=' + encodeURIComponent(category)
      : '/content';
    return (await api.get(url)).data;
  },
  create: async (content) => (await api.post('/content', content)).data,
  getById: async (id) => (await api.get('/content/' + id)).data,
  deleteById: async (id) => {
    await api.delete('/content/' + id);
  },
};

export const routeService = contentService;

export const sessionService = {
  startSession: async (data) => (await api.post('/sessions', data)).data,
  sendReadings: async (sessionId, readings) =>
    (await api.post('/sessions/' + sessionId + '/readings', readings)).data,
  updateSession: async (id, data) =>
    (await api.put('/sessions/' + id, data)).data,
  getAllSessions: async () => (await api.get('/sessions')).data,
  getSessionDetail: async (id) => (await api.get('/sessions/' + id)).data,
};

export default api;
