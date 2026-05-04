import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🚀 API Request:', config.method?.toUpperCase(), config.url);
    console.log('📤 Request data:', config.data);
    console.log('🔑 Token exists:', !!token);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('🚨 API Error:', error.response?.status, error.config?.url);
    if (error.response?.status === 401) {
      console.log('🚨 401 Unauthorized - logging out...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    if (error.response?.status === 429) {
      // Handle rate limiting with a more specific error
      error.message = error.response.data?.message || 'Too many requests. Please wait a moment and try again.';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  getGoogleAuthUrl: () => api.get('/auth/google'),
  connectGmail: (code) => api.post('/auth/gmail/connect', { code }),
  disconnectGmail: () => api.post('/auth/gmail/disconnect'),
  changeGmail: () => api.post('/auth/gmail/change'),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  googleLogin: (data) => api.post('/auth/google-login', data),
};

// Transaction API
export const transactionAPI = {
  getAll: (params) => api.get('/transactions', { params }),
  getStats: (params) => api.get('/transactions/stats', { params }),
  getAccounts: () => api.get('/transactions/accounts'),
  getById: (id) => api.get(`/transactions/${id}`),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  sync: () => api.post('/transactions/sync'),
  createManual: (data) => api.post('/transactions/manual', data),
  getSuggestions: (merchant) => api.get(`/transactions/suggestions/${encodeURIComponent(merchant)}`),
  acceptSuggestion: (id) => api.put(`/transactions/${id}/accept-suggestion`),
};

// Category API
export const categoryAPI = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
  initDefaults: () => api.post('/categories/init-defaults'),
};

// Budget API
export const budgetAPI = {
  getAll: () => api.get('/budget'),
  getBudget: () => api.get('/budget'),
  getSummary: (params) => api.get('/budget/summary', { params }),
  create: (data) => api.post('/budget', data),
  createBudget: (data) => api.post('/budget', data),
  update: (id, data) => api.put(`/budget/${id}`, data),
  delete: (id) => api.delete(`/budget/${id}`),
};

// Transaction Insights API
export const insightsAPI = {
  getDeleted: () => api.get('/insights/deleted'),
  getAutoCategorized: () => api.get('/insights/auto-categorized'),
  getWithSuggestions: () => api.get('/insights/with-suggestions'),
  getSummary: () => api.get('/insights/summary'),
};

// Onboarding API
export const onboardingAPI = {
  getStatus: () => api.get('/onboarding/status'),
  complete: (data) => api.post('/onboarding/complete', data),
  update: (data) => api.put('/onboarding/update', data),
};

// Merchant API
export const merchantAPI = {
  applyRules: (merchantName) => api.post(`/merchants/${encodeURIComponent(merchantName)}/apply-rules`),
  getAnalysis: (merchantName) => api.get(`/merchants/${encodeURIComponent(merchantName)}/analysis`),
  getMerchantCounts: () => api.get('/merchants/counts'),
};

// Budget Suggestions API
export const budgetSuggestionsAPI = {
  generate: () => api.post('/budget-suggestions/generate'),
  getProfile: () => api.get('/budget-suggestions/profile'),
  validate: (customBudgets, totalBudget) => api.post('/budget-suggestions/validate', { customBudgets, totalBudget }),
};


export default api;
