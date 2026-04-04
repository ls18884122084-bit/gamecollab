import { create } from 'zustand';
import { collabAPI } from '../services/api';

export const useCollabStore = create((set, get) => ({
  // 当前仓库的协作者列表
  collaborators: [],
  pendingApplications: [],  // 待审批的申请（owner/admin 视角）
  
  // 我的待处理邀请（当前用户收到的）
  myPendingInvitations: [],
  
  loading: false,
  
  // 搜索结果
  searchResults: [],
  searching: false,
  
  // 获取协作者列表
  fetchCollaborators: async (repoId) => {
    set({ loading: true });
    try {
      const { collaborators } = await collabAPI.getCollaborators(repoId);
      set({ collaborators, loading: false });
      return collaborators;
    } catch (error) {
      set({ collaborators: [], loading: false });
      throw error;
    }
  },
  
  // 获取待审批申请
  fetchPendingApplications: async (repoId) => {
    try {
      const { applications } = await collabAPI.getPendingApplications(repoId);
      set({ pendingApplications: applications });
      return applications;
    } catch (error) {
      set({ pendingApplications: [] });
      throw error;
    }
  },
  
  // 获取我的待处理邀请/申请
  fetchMyInvitations: async () => {
    try {
      const { invitations } = await collabAPI.getPendingInvitations();
      set({ myPendingInvitations: invitations });
      return invitations;
    } catch (error) {
      set({ myPendingInvitations: [] });
      throw error;
    }
  },
  
  // 搜索用户
  searchUsers: async (q) => {
    if (!q || q.length < 2) {
      set({ searchResults: [] });
      return [];
    }
    set({ searching: true });
    try {
      const { users } = await collabAPI.searchUsers(q);
      set({ searchResults: users, searching: false });
      return users;
    } catch (error) {
      set({ searchResults: [], searching: false });
      throw error;
    }
  },
  
  // 邀请用户
  inviteUser: async (repoId, userId, role = 'read') => {
    const result = await collabAPI.invite(repoId, { userId, role });
    // 刷新列表
    get().fetchCollaborators(repoId);
    return result;
  },
  
  // 申请加入
  applyToJoin: async (repoId) => {
    const result = await collabAPI.apply(repoId);
    return result;
  },
  
  // 接受邀请/申请
  acceptInvitation: async (id, repoId) => {
    const result = await collabAPI.accept(id);
    if (repoId) {
      get().fetchCollaborators(repoId);
      get().fetchPendingApplications(repoId);
    }
    get().fetchMyInvitations();
    return result;
  },
  
  // 拒绝邀请/申请
  rejectInvitation: async (id, repoId) => {
    const result = await collabAPI.reject(id);
    if (repoId) {
      get().fetchPendingApplications(repoId);
    }
    get().fetchMyInvitations();
    return result;
  },
  
  // 移除协作者
  removeCollaborator: async (id, repoId) => {
    const result = await collabAPI.remove(id);
    if (repoId) {
      get().fetchCollaborators(repoId);
    }
    return result;
  },
  
  // 更新角色
  updateRole: async (id, role, repoId) => {
    const result = await collabAPI.updateRole(id, role);
    if (repoId) {
      get().fetchCollaborators(repoId);
    }
    return result;
  },
  
  // 离开仓库
  leaveRepository: async (repoId) => {
    const result = await collabAPI.leave(repoId);
    return result;
  },
  
  clearSearch: () => set({ searchResults: [] }),
}));
