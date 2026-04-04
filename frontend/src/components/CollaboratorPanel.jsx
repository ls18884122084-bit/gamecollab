import React, { useEffect, useState, useCallback } from 'react';
import { useCollabStore } from '../stores/collabStore';
import { useAuthStore } from '../stores/authStore';
import { useRepoStore } from '../stores/repoStore';
import Modal from './Modal';
import Loading from './Loading';
import toast from 'react-hot-toast';
import {
  Users,
  Search,
  UserPlus,
  UserMinus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Edit3,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Crown,
  LogOut,
  Loader2,
} from 'lucide-react';

// 角色配置
const ROLE_CONFIG = {
  owner: { label: '所有者', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: Crown },
  admin: { label: '管理员', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: ShieldAlert },
  write: { label: '可编辑', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: Edit3 },
  read: { label: '只读', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', icon: Eye },
};

// 状态配置
const STATUS_CONFIG = {
  pending: { label: '待处理', color: 'text-orange-600', bg: 'bg-orange-50', icon: Clock },
  accepted: { label: '已接受', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
  rejected: { label: '已拒绝', color: 'text-gray-400', bg: 'bg-gray-50', icon: XCircle },
};

// 协作者颜色列表（用于光标/头像）
const USER_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
];

function getUserColor(userId, index = 0) {
  // 根据 ID 哈希确定颜色
  let hash = 0;
  for (let i = 0; i < (userId?.length || 0); i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

export default function CollaboratorPanel({ repoId, isOpen, onClose }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const currentRepo = useRepoStore((s) => s.currentRepo);
  
  const {
    collaborators,
    pendingApplications,
    searchResults,
    loading,
    searching,
    fetchCollaborators,
    fetchPendingApplications,
    searchUsers,
    inviteUser,
    acceptInvitation,
    rejectInvitation,
    removeCollaborator,
    updateRole,
    leaveRepository,
    clearSearch,
  } = useCollabStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('read');
  const [showInviteSection, setShowInviteSection] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // { type: 'accept'|'reject'|'remove'|'role', id: string }

  // 是否是 owner 或 admin
  const isOwner = currentRepo?.ownerId === currentUserId;
  const myCollab = collaborators.find(c => c.user?.id === currentUserId);
  const isAdmin = myCollab?.role === 'admin' || myCollab?.role === 'owner';
  const canManage = isOwner || isAdmin;

  // 加载数据
  useEffect(() => {
    if (isOpen && repoId) {
      fetchCollaborators(repoId);
      if (canManage) {
        fetchPendingApplications(repoId);
      }
    }
  }, [isOpen, repoId]);

  // 搜索用户（防抖）
  useEffect(() => {
    if (!showInviteSection || !searchQuery || searchQuery.length < 2) {
      clearSearch();
      return;
    }
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showInviteSection]);

  // 邀请用户
  const handleInvite = async (userId) => {
    setActionLoading(`invite-${userId}`);
    try {
      await inviteUser(repoId, userId, selectedRole);
      toast.success('邀请已发送');
      setSearchQuery('');
      setShowInviteSection(false);
      clearSearch();
    } catch (error) {
      toast.error(error.response?.data?.error || '邀请失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 接受申请
  const handleAccept = async (id) => {
    setActionLoading(`accept-${id}`);
    try {
      await acceptInvitation(id, repoId);
      toast.success('已接受');
    } catch (error) {
      toast.error(error.response?.data?.error || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 拒绝申请
  const handleReject = async (id) => {
    setActionLoading(`reject-${id}`);
    try {
      await rejectInvitation(id, repoId);
      toast.success('已拒绝');
    } catch (error) {
      toast.error(error.response?.data?.error || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 移除协作者
  const handleRemove = async (id, username) => {
    if (!window.confirm(`确定要移除「${username}」吗？`)) return;
    setActionLoading(`remove-${id}`);
    try {
      await removeCollaborator(id, repoId);
      toast.success('已移除');
    } catch (error) {
      toast.error(error.response?.data?.error || '移除失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 修改角色
  const handleRoleChange = async (id, newRole) => {
    setActionLoading(`role-${id}`);
    try {
      await updateRole(id, newRole, repoId);
      toast.success('角色已更新');
    } catch (error) {
      toast.error(error.response?.data?.error || '修改失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 离开仓库
  const handleLeave = async () => {
    if (!window.confirm('确定要离开这个仓库吗？')) return;
    try {
      await leaveRepository(repoId);
      toast.success('已离开仓库');
      onClose();
      window.location.href = '/dashboard';
    } catch (error) {
      toast.error(error.response?.data?.error || '离开失败');
    }
  };

  const isActionLoading = (type, id) => actionLoading === `${type}-${id}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="协作管理" size="lg">
      {loading ? (
        <Loading text="加载协作者..." />
      ) : (
        <div className="space-y-6">
          {/* ====== 已接受的协作者 ====== */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <Users className="w-4 h-4 mr-1.5" />
              协作者 ({collaborators.filter(c => c.status === 'accepted').length})
            </h3>
            
            {collaborators.filter(c => c.status === 'accepted').length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">暂无协作者</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {collaborators.filter(c => c.status === 'accepted').map((collab, idx) => {
                  const roleConfig = ROLE_CONFIG[collab.role] || ROLE_CONFIG.read;
                  const statusConfig = STATUS_CONFIG[collab.status];
                  const RoleIcon = roleConfig.icon;
                  const isMe = collab.user?.id === currentUserId;

                  return (
                    <div
                      key={collab.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${roleConfig.border} ${roleConfig.bg} transition-colors`}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {/* 头像 */}
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
                          style={{ backgroundColor: getUserColor(collab.user?.id, idx) }}
                        >
                          {collab.user?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        
                        {/* 用户信息 */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${isMe ? 'text-blue-600' : 'text-gray-900'}`}>
                              {collab.user?.username || '未知用户'}
                              {isMe && <span className="text-xs text-gray-400">(我)</span>}
                            </span>
                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleConfig.color} ${roleConfig.bg}`}>
                              <RoleIcon className="w-3 h-3" />
                              <span>{roleConfig.label}</span>
                            </span>
                          </div>
                          {collab.user?.email && (
                            <p className="text-xs text-gray-400 truncate">{collab.user.email}</p>
                          )}
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center space-x-1 ml-3">
                        {!isMe && canManage && (
                          <>
                            {/* 角色切换 */}
                            {isOwner && collab.role !== 'owner' && (
              <select
                value={collab.role}
                onChange={(e) => handleRoleChange(collab.id, e.target.value)}
                disabled={isActionLoading('role', collab.id)}
                className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value="admin">管理员</option>
                <option value="write">可编辑</option>
                <option value="read">只读</option>
              </select>
            )}

            {/* 移除按钮 */}
            <button
              onClick={() => handleRemove(collab.id, collab.user?.username)}
              disabled={isActionLoading('remove', collab.id)}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
              title="移除"
            >
              {isActionLoading('remove', collab.id) ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserMinus className="w-3.5 h-3.5" />
              )}
            </button>
          </>
        )}

        {/* 自己：显示离开按钮 */}
        {isMe && !isOwner && (
          <button
            onClick={handleLeave}
            className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 rounded transition-colors"
            title="离开仓库"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ====== 待审批申请（仅 owner/admin 可见）===== */}
          {canManage && pendingApplications.length > 0 && (
            <section className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Clock className="w-4 h-4 mr-1.5 text-orange-500" />
                待审批 ({pendingApplications.length})
              </h3>
              <div className="space-y-2">
                {pendingApplications.map((app) => {
                  const isApplication = app.type === 'application'; // 申请 vs 邀请
                  return (
                    <div key={app.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-100 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: getUserColor(app.user?.id) }}
                        >
                          {app.user?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900">{app.user?.username}</span>
                          <span className="ml-2 text-xs text-orange-600">
                            {isApplication ? '申请加入' : '待接受邀请'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleAccept(app.id)}
                          disabled={isActionLoading('accept', app.id)}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors disabled:opacity-50"
                          title="接受"
                        >
                          {isActionLoading('accept', app.id) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleReject(app.id)}
                          disabled={isActionLoading('reject', app.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="拒绝"
                        >
                          {isActionLoading('reject', app.id) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ====== 邀请区域（仅 owner/admin）===== */
          (canManage || !myCollab) && (
            <section className="border-t pt-4">
              {!showInviteSection ? (
                <button
                  onClick={() => setShowInviteSection(true)}
                  className="flex items-center space-x-2 px-4 py-2.5 w-full bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-green-700 text-sm font-medium transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{canManage ? '邀请协作者' : '申请加入此仓库'}</span>
                </button>
              ) : canManage ? (
                /* 邀请模式（owner/admin） */
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜索用户名或邮箱..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      autoFocus
                      autoComplete="off"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                    )}
                  </div>

                  {/* 角色选择 */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">权限:</span>
                    {['read', 'write', 'admin'].map((role) => (
                      <button
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                          selectedRole === role
                            ? ROLE_CONFIG[role].color + ' ' + ROLE_CONFIG[role].bg + ' ' + ROLE_CONFIG[role].border + ' font-medium'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {ROLE_CONFIG[role].label}
                      </button>
                    ))}
                  </div>

                  {/* 搜索结果 */}
                  {searchResults.length > 0 && (
                    <div className="border border-gray-200 rounded-lg max-h-[180px] overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 border-gray-100"
                        >
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium"
                              style={{ backgroundColor: getUserColor(user.id) }}
                            >
                              {user.username[0].toUpperCase()}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-800">{user.username}</span>
                              <span className="ml-2 text-xs text-gray-400">{user.email}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleInvite(user.id)}
                            disabled={isActionLoading('invite', user.id)}
                            className="px-2.5 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors disabled:opacity-50"
                          >
                            {isActionLoading('invite', user.id) ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              '邀请'
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">未找到匹配的用户</p>
                  )}

                  <button
                    onClick={() => { setShowInviteSection(false); setSearchQuery(''); clearSearch(); }}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    取消
                  </button>
                </div>
              ) : (
                /* 申请加入模式（非协作者） */
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    你还不是这个仓库的协作者。发送申请后，等待所有者审批。
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        await applyToJoin(repoId);
                        toast.success('申请已提交，等待审批');
                        setShowInviteSection(false);
                      } catch (error) {
                        toast.error(error.response?.data?.error || '申请失败');
                      }
                    }}
                    className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    发送申请
                  </button>
                  <button
                    onClick={() => setShowInviteSection(false)}
                    className="block text-xs text-gray-400 hover:text-gray-600"
                  >
                    取消
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
