import { create } from 'zustand';
import { authAPI } from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,

  login: async (credentials) => {
    const { user, token } = await authAPI.login(credentials);
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
    return user;
  },

  register: async (data) => {
    const { user, token } = await authAPI.register(data);
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
    return user;
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      set({ loading: true });
      const { user } = await authAPI.getMe();
      set({ user, isAuthenticated: true, loading: false });
      return user;
    } catch (error) {
      set({ user: null, isAuthenticated: false, loading: false });
      localStorage.removeItem('token');
      throw error;
    }
  },

  updateProfile: async (data) => {
    const { user } = await authAPI.updateProfile(data);
    set({ user });
    return user;
  },
}));
