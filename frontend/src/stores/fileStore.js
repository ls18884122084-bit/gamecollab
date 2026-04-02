import { create } from 'zustand';
import { fileAPI } from '../services/api';

export const useFileStore = create((set, get) => ({
  files: [],
  currentFile: null,
  content: '',
  commits: [],
  branches: { all: [], current: '' },
  loading: false,
  saving: false,

  fetchFileTree: async (repoId, params = {}) => {
    set({ loading: true });
    try {
      const { files } = await fileAPI.getTree(repoId, params);
      set({ files, loading: false });
      return files;
    } catch (error) {
      set({ files: [], loading: false });
      throw error;
    }
  },

  loadFile: async (repoId, filePath, ref) => {
    set({ loading: true });
    try {
      const params = { filePath };
      if (ref) params.ref = ref;
      const data = await fileAPI.getContent(repoId, params);
      set({
        currentFile: filePath,
        content: data.content,
        loading: false,
      });
      return data.content;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  saveFile: async (repoId, filePath, content, message) => {
    set({ saving: true });
    try {
      const result = await fileAPI.save(repoId, { filePath, content, message });
      set({ saving: false, content });
      return result;
    } catch (error) {
      set({ saving: false });
      throw error;
    }
  },

  deleteFile: async (repoId, filePath, message) => {
    const result = await fileAPI.delete(repoId, { filePath, message });
    set((state) => ({
      files: state.files.filter((f) => f !== filePath),
      currentFile: state.currentFile === filePath ? null : state.currentFile,
    }));
    return result;
  },

  fetchCommits: async (repoId, params = {}) => {
    try {
      const { commits } = await fileAPI.getCommits(repoId, params);
      set({ commits });
      return commits;
    } catch (error) {
      set({ commits: [] });
      throw error;
    }
  },

  fetchBranches: async (repoId) => {
    try {
      const branches = await fileAPI.getBranches(repoId);
      set({ branches });
      return branches;
    } catch (error) {
      set({ branches: { all: [], current: '' } });
      throw error;
    }
  },

  checkoutBranch: async (repoId, branchName) => {
    await fileAPI.checkoutBranch(repoId, { branchName });
    set((state) => ({
      branches: { ...state.branches, current: branchName },
    }));
  },

  setContent: (content) => set({ content }),
  setCurrentFile: (file) => set({ currentFile: file }),
  clearFile: () => set({ currentFile: null, content: '' }),
}));
