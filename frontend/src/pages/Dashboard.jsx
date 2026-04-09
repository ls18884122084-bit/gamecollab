import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepoStore } from '../stores/repoStore';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import {
  Plus,
  Search,
  Lock,
  Globe,
  Clock,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    repositories,
    pagination,
    loading,
    fetchRepos,
    createRepo,
    deleteRepo,
  } = useRepoStore();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 创建项目表单
  const [newRepo, setNewRepo] = useState({
    name: '',
    description: '',
    isPrivate: true,
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchRepos({ page, search: search || undefined });
  }, [page]);

  // 搜索（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchRepos({ page: 1, search: search || undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreateRepo = async (e) => {
    e.preventDefault();
    if (!newRepo.name.trim()) {
      toast.error('请输入项目名称');
      return;
    }
    setCreating(true);
    try {
      const repo = await createRepo(newRepo);
      toast.success('项目创建成功！');
      setShowCreateModal(false);
      setNewRepo({ name: '', description: '', isPrivate: true });
      navigate(`/repo/${repo.id}`);
    } catch (error) {
      toast.error(error.response?.data?.error || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRepo = async (id, name) => {
    if (!window.confirm(`确定要删除项目「${name}」吗？此操作不可恢复。`)) return;
    try {
      await deleteRepo(id);
      toast.success('项目已删除');
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 格式化时间
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 30) return `${days} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 顶部区域 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">我的项目</h1>
            <p className="text-sm text-gray-500 mt-1">
              管理知识库、训练配置和 AI 管家项目
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>新建项目</span>
          </button>
        </div>

        {/* 快捷入口卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div
            onClick={() => { setSearch('知识库'); }}
            className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-blue-900">知识库</h3>
            </div>
            <p className="text-xs text-blue-600">管理训练语料、FAQ、业务问答对</p>
          </div>
          <div
            onClick={() => { setSearch('训练'); }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-purple-900">训练工坊</h3>
            </div>
            <p className="text-xs text-purple-600">Prompt 模板、LoRA 配置、训练记录</p>
          </div>
          <div
            onClick={() => { setSearch('Agent'); }}
            className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-green-900">Agent 管理</h3>
            </div>
            <p className="text-xs text-green-600">管家实例、对话测试、发布管理</p>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索项目..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
          />
        </div>

        {/* 项目列表 */}
        {loading ? (
          <Loading />
        ) : repositories.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={search ? '没有找到匹配的项目' : '还没有项目'}
            description={
              search
                ? '试试其他关键词'
                : '创建你的第一个项目，开始 AI 管家训练之旅'
            }
            action={
              !search && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>新建项目</span>
                </button>
              )
            }
          />
        ) : (
          <div className="grid gap-4">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                onClick={() => navigate(`/repo/${repo.id}`)}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-green-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <h3 className="text-lg font-semibold text-blue-600 group-hover:text-blue-700 truncate">
                        {repo.name}
                      </h3>
                      {repo.isPrivate ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                          <Lock className="w-3 h-3" />
                          <span>私有</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded-full">
                          <Globe className="w-3 h-3" />
                          <span>公开</span>
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 text-xs text-gray-400">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>更新于 {formatTime(repo.updatedAt)}</span>
                      </span>
                      {repo.owner && (
                        <span>by {repo.owner.username}</span>
                      )}
                    </div>
                  </div>

                  {/* 删除按钮（悬停时显示） */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRepo(repo.id, repo.name);
                    }}
                    className="opacity-0 group-hover:opacity-100 px-3 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-all"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 分页 */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-center space-x-4 mt-8">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>上一页</span>
            </button>
            <span className="text-sm text-gray-500">
              {page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPage(Math.min(pagination.pages, page + 1))}
              disabled={page >= pagination.pages}
              className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <span>下一页</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 创建项目模态框 */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新建项目"
      >
        <form onSubmit={handleCreateRepo}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              项目名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newRepo.name}
              onChange={(e) =>
                setNewRepo({ ...newRepo, name: e.target.value })
              }
              placeholder="例如: 超核会员FAQ知识库"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              描述（可选）
            </label>
            <textarea
              value={newRepo.description}
              onChange={(e) =>
                setNewRepo({ ...newRepo, description: e.target.value })
              }
              placeholder="简单描述一下这个项目的用途..."
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="mb-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={newRepo.isPrivate}
                onChange={(e) =>
                  setNewRepo({ ...newRepo, isPrivate: e.target.checked })
                }
                className="w-4 h-4 text-green-500 rounded focus:ring-green-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>私有项目</span>
                </span>
                <p className="text-xs text-gray-400">
                  仅你和团队成员可以访问
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {creating ? '创建中...' : '创建项目'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
