import axios from 'axios';
import toast from 'react-hot-toast';

// 创建 Axios 实例
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器：自动附加 JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：统一错误处理
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.error || '网络请求失败';

    if (status === 401) {
      localStorage.removeItem('token');
      // 避免在登录页重复跳转
      if (window.location.pathname !== '/login') {
        toast.error('登录已过期，请重新登录');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ========== 认证 API ==========
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
};

// ========== 仓库 API ==========
export const repoAPI = {
  list: (params) => api.get('/repos', { params }),
  create: (data) => api.post('/repos', data),
  get: (id) => api.get(`/repos/${id}`),
  update: (id, data) => api.put(`/repos/${id}`, data),
  delete: (id) => api.delete(`/repos/${id}`),
};

// ========== 文件 API ==========
export const fileAPI = {
  getTree: (repoId, params) => api.get(`/files/${repoId}/tree`, { params }),
  getContent: (repoId, params) => api.get(`/files/${repoId}/content`, { params }),
  save: (repoId, data) => api.post(`/files/${repoId}/save`, data),
  delete: (repoId, data) => api.delete(`/files/${repoId}/delete`, { data }),
  getCommits: (repoId, params) => api.get(`/files/${repoId}/commits`, { params }),
  getCommitDiff: (repoId, hash) => api.get(`/files/${repoId}/commits/${hash}`),
  getBranches: (repoId) => api.get(`/files/${repoId}/branches`),
  createBranch: (repoId, data) => api.post(`/files/${repoId}/branches`, data),
  checkoutBranch: (repoId, data) => api.put(`/files/${repoId}/branches/checkout`, data),
};

export default api;
