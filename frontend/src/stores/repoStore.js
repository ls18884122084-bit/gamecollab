import { create } from 'zustand';
import { repoAPI } from '../services/api';

export const useRepoStore = create((set, get) => ({
  repositories: [],
  currentRepo: null,
  pagination: null,
  loading: false,
  error: null,

  fetchRepos: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const { repositories, pagination } = await repoAPI.list(params);
      set({ repositories, pagination, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  fetchRepo: async (id) => {
    set({ loading: true, error: null });
    try {
      const { repository } = await repoAPI.get(id);
      set({ currentRepo: repository, loading: false });
      return repository;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  createRepo: async (data) => {
    const { repository } = await repoAPI.create(data);
    set((state) => ({
      repositories: [repository, ...state.repositories],
    }));
    return repository;
  },

  updateRepo: async (id, data) => {
    const { repository } = await repoAPI.update(id, data);
    set((state) => ({
      repositories: state.repositories.map((r) =>
        r.id === id ? repository : r
      ),
      currentRepo:
        state.currentRepo?.id === id ? repository : state.currentRepo,
    }));
    return repository;
  },

  deleteRepo: async (id) => {
    await repoAPI.delete(id);
    set((state) => ({
      repositories: state.repositories.filter((r) => r.id !== id),
      currentRepo: state.currentRepo?.id === id ? null : state.currentRepo,
    }));
  },

  setCurrentRepo: (repo) => set({ currentRepo: repo }),
}));
