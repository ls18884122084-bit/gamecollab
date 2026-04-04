import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRepoStore } from '../stores/repoStore';
import { useFileStore } from '../stores/fileStore';
import Navbar from '../components/Navbar';
import FileTree from '../components/FileTree';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import {
  ArrowLeft,
  GitBranch,
  Clock,
  FileText,
  History,
  Plus,
  ChevronDown,
  File as FileIcon,
  FolderPlus,
  Users,
} from 'lucide-react';
import CollaboratorPanel from '../components/CollaboratorPanel';
import toast from 'react-hot-toast';

export default function Repository() {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const { currentRepo, fetchRepo, loading: repoLoading } = useRepoStore();
  const {
    files,
    commits,
    branches,
    fetchFileTree,
    fetchCommits,
    fetchBranches,
    checkoutBranch,
    loading: fileLoading,
  } = useFileStore();

  const [activeTab, setActiveTab] = useState('files'); // files | commits
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [showCollabPanel, setShowCollabPanel] = useState(false);

  // 初始化加载
  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([
          fetchRepo(repoId),
          fetchFileTree(repoId),
          fetchCommits(repoId, { limit: 20 }),
          fetchBranches(repoId),
        ]);
      } catch (error) {
        toast.error('加载仓库信息失败');
      }
    };
    load();
  }, [repoId]);

  // 点击文件
  const handleFileClick = async (filePath) => {
    setSelectedFile(filePath);
    try {
      const { fileAPI } = await import('../services/api');
      const data = await fileAPI.getContent(repoId, { filePath });
      setFileContent(data.content);
    } catch (error) {
      toast.error('加载文件失败');
    }
  };

  // 编辑文件
  const handleEditFile = (filePath) => {
    navigate(`/repo/${repoId}/edit/${encodeURIComponent(filePath)}`);
  };

  // 切换分支
  const handleBranchSwitch = async (branchName) => {
    try {
      await checkoutBranch(repoId, branchName);
      await fetchFileTree(repoId);
      await fetchCommits(repoId, { limit: 20 });
      setShowBranchMenu(false);
      setSelectedFile(null);
      setFileContent(null);
      toast.success(`已切换到 ${branchName} 分支`);
    } catch (error) {
      toast.error('切换分支失败');
    }
  };

  // 创建新文件
  const handleCreateFile = () => {
    if (!newFilePath.trim()) {
      toast.error('请输入文件路径');
      return;
    }
    setShowNewFileModal(false);
    navigate(`/repo/${repoId}/edit/${encodeURIComponent(newFilePath.trim())}`);
    setNewFilePath('');
  };

  // 格式化提交时间
  const formatCommitDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取文件语言
  const getLanguage = (filePath) => {
    if (!filePath) return 'plaintext';
    const ext = filePath.split('.').pop();
    const map = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      json: 'json',
      md: 'markdown',
      html: 'html',
      css: 'css',
      yml: 'yaml',
      yaml: 'yaml',
    };
    return map[ext] || 'plaintext';
  };

  if (repoLoading) {
    return <Loading fullScreen text="加载仓库..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* 仓库头部 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3 mb-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {currentRepo?.name || '仓库'}
              </h1>
              {currentRepo?.description && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {currentRepo.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* 分支选择器 */}
            <div className="relative">
              <button
                onClick={() => setShowBranchMenu(!showBranchMenu)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
              >
                <GitBranch className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{branches.current || 'main'}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {showBranchMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px]">
                  <div className="p-2">
                    <p className="text-xs text-gray-400 px-2 py-1 font-medium">
                      切换分支
                    </p>
                    {branches.all.map((branch) => (
                      <button
                        key={branch}
                        onClick={() => handleBranchSwitch(branch)}
                        className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 transition-colors ${
                          branch === branches.current
                            ? 'text-green-600 font-medium'
                            : 'text-gray-700'
                        }`}
                      >
                        {branch}
                        {branch === branches.current && ' ✓'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tab 切换 */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab('files')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  activeTab === 'files'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>文件</span>
              </button>
              <button
                onClick={() => setActiveTab('commits')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  activeTab === 'commits'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>提交记录</span>
                {commits.length > 0 && (
                  <span className="text-xs bg-gray-200 text-gray-600 px-1.5 rounded-full">
                    {commits.length}
                  </span>
                )}
              </button>
            </div>

            {/* 新建文件 */}
            <button
              onClick={() => setShowNewFileModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建文件</span>
            </button>

            {/* 协作管理 */}
            <button
              onClick={() => setShowCollabPanel(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>协作者</span>
            </button>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        {activeTab === 'files' ? (
          <div className="flex gap-6 h-[calc(100vh-240px)]">
            {/* 左侧：文件树 */}
            <div className="w-72 flex-shrink-0 bg-gray-900 rounded-xl overflow-y-auto">
              <div className="px-4 py-3 border-b border-gray-700">
                <h3 className="text-sm font-medium text-gray-300">文件浏览</h3>
              </div>
              {fileLoading ? (
                <div className="p-4">
                  <Loading text="加载文件树..." />
                </div>
              ) : (
                <FileTree
                  files={files}
                  onFileClick={handleFileClick}
                  selectedFile={selectedFile}
                />
              )}
            </div>

            {/* 右侧：文件内容 */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
              {selectedFile ? (
                <>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center space-x-2 text-sm">
                      <FileIcon className="w-4 h-4 text-gray-400" />
                      <span className="font-mono text-gray-700">
                        {selectedFile}
                      </span>
                    </div>
                    <button
                      onClick={() => handleEditFile(selectedFile)}
                      className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                    >
                      编辑
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <pre className="p-4 text-sm font-mono text-gray-800 whitespace-pre-wrap">
                      {fileContent ?? '加载中...'}
                    </pre>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="选择一个文件查看"
                  description="从左侧文件树中选择一个文件来预览其内容"
                />
              )}
            </div>
          </div>
        ) : (
          /* 提交记录 */
          <div className="bg-white rounded-xl border border-gray-200">
            {commits.length === 0 ? (
              <EmptyState
                icon={History}
                title="暂无提交记录"
                description="创建并保存文件后将出现提交记录"
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {commits.map((commit, i) => (
                  <div
                    key={commit.hash || i}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {commit.message}
                        </p>
                        <div className="flex items-center space-x-3 mt-1 text-xs text-gray-400">
                          <span>{commit.author_name}</span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatCommitDate(commit.date)}</span>
                          </span>
                        </div>
                      </div>
                      <code className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded flex-shrink-0 ml-4">
                        {commit.hash?.substring(0, 7)}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 新建文件模态框 */}
      <Modal
        isOpen={showNewFileModal}
        onClose={() => setShowNewFileModal(false)}
        title="新建文件"
        size="sm"
      >
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            文件路径
          </label>
          <input
            type="text"
            value={newFilePath}
            onChange={(e) => setNewFilePath(e.target.value)}
            placeholder="例如: src/main.js"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
            autoFocus
          />
          <p className="mt-1 text-xs text-gray-400">
            支持路径中包含目录，如 src/utils/helper.js
          </p>
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setShowNewFileModal(false)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            取消
          </button>
          <button
            onClick={handleCreateFile}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            创建并编辑
          </button>
        </div>
      </Modal>

      {/* 协作者管理面板 */}
      <CollaboratorPanel
        repoId={repoId}
        isOpen={showCollabPanel}
        onClose={() => setShowCollabPanel(false)}
      />
    </div>
  );
}
