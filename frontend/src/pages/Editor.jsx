import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EditorComp from '@monaco-editor/react';
import { useFileStore } from '../stores/fileStore';
import { useRepoStore } from '../stores/repoStore';
import { useAuthStore } from '../stores/authStore';
import { useCollaboration } from '../hooks/useCollaboration.js';
import CollaborationCursors, { injectCollaborationCSS, updateCursorColors } from '../components/CollaborationCursors.jsx';
import Loading from '../components/Loading';
import {
  ArrowLeft,
  Save,
  FileText,
  Loader2,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

// 注入协作光标 CSS
injectCollaborationCSS();

// 根据文件扩展名获取 Monaco 语言
function getLanguage(filePath) {
  if (!filePath) return 'plaintext';
  const ext = filePath.split('.').pop().toLowerCase();
  const languageMap = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', json: 'json', md: 'markdown', html: 'html', htm: 'html',
    css: 'css', scss: 'scss', less: 'less', xml: 'xml',
    yml: 'yaml', yaml: 'yaml', sh: 'shell', bash: 'shell',
    sql: 'sql', java: 'java', c: 'c', cpp: 'cpp', cs: 'csharp',
    go: 'go', rs: 'rust', rb: 'ruby', php: 'php', lua: 'lua',
    swift: 'swift', kt: 'kotlin', dart: 'dart', toml: 'ini',
    ini: 'ini', env: 'ini', dockerfile: 'dockerfile', makefile: 'makefile',
  };
  return languageMap[ext] || 'plaintext';
}

export default function EditorPage() {
  const { repoId, '*': rawFilePath } = useParams();
  const filePath = rawFilePath ? decodeURIComponent(rawFilePath) : '';
  const navigate = useNavigate();
  const { currentRepo, fetchRepo } = useRepoStore();
  const { content, loadFile, saveFile, saving } = useFileStore();
  const { token } = useAuthStore();

  // 本地状态
  const [localContent, setLocalContent] = useState('');
  const [isModified, setIsModified] = useState(false);
  const [isNewFile, setIsNewFile] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Refs
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  // 远程更新防循环标记
  const isRemoteUpdate = useRef(false);
  const hasSyncedInitial = useRef(false); // 是否已发送过初始同步

  // ====== 协作 Hook (v2 - y-monaco 绑定) ======
  const {
    onlineUsers,
    cursors,
    isConnected,
    ydoc,
    bindMonaco,
    setMonacoRef,
    sendCursorUpdate,
    sendFullSync,
  } = useCollaboration({
    repoId,
    filePath,
    token,
    onContentChange: (newContent) => {
      // 远端内容变更 → 更新本地状态（不触发 Monaco setValue）
      isRemoteUpdate.current = true;
      setLocalContent(newContent);
      setIsModified(false);
      setTimeout(() => { isRemoteUpdate.current = false; }, 100);
    },
  });

  // 光标颜色更新
  useEffect(() => { updateCursorColors(cursors); }, [cursors]);

  // 加载文件内容
  useEffect(() => {
    const load = async () => {
      setInitialLoading(true);
      try {
        if (!currentRepo) await fetchRepo(repoId);
        
        const fileContent = await loadFile(repoId, filePath);
        if (!isRemoteUpdate.current) {
          setLocalContent(fileContent || '');
          // 注意：Monaco 的 value 由 localContent 驱动
          // y-monaco 会接管后续编辑，但初始加载仍需要 value
        }
        setIsNewFile(false);
      } catch (error) {
        if (error.response?.status === 404) {
          setLocalContent('');
          setIsNewFile(true);
        } else {
          toast.error('加载文件失败');
        }
      } finally {
        setInitialLoading(false);
      }
    };
    
    if (repoId && filePath) { load(); }
  }, [repoId, filePath]);

  // ====== 编辑器事件处理 ======

  /**
   * Monaco onChange — 仅用于追踪本地修改状态
   * （CRDT 同步由 y-monaco binding 自动处理）
   */
  const handleEditorChange = useCallback(
    (value) => {
      if (!isRemoteUpdate.current) {
        setLocalContent(value || '');
        setIsModified(value !== content);
      }
    },
    [content]
  );

  /** 获取当前光标位置 */
  function getCursorPosition() {
    try {
      const ed = monacoRef.current;
      if (!ed) return null;
      const pos = ed.getPosition();
      const selection = ed.getSelection();
      const model = ed.getModel();

      return {
        offset: model.getOffsetAt(pos),
        position: { lineNumber: pos.lineNumber, column: pos.column },
        selection: selection ? {
          start: model.getOffsetAt(selection.getStartPosition()),
          end: model.getOffsetAt(selection.getEndPosition()),
        } : null,
      };
    } catch (e) {
      return null;
    }
  }

  /** 光标移动 → 发送到服务端 */
  const handleCursorPositionChanged = useCallback(
    (event) => {
      if (isConnected && !isRemoteUpdate.current) {
        const cursorData = getCursorPosition();
        if (cursorData) {
          sendCursorUpdate?.(cursorData.position, cursorData.selection);
        }
      }
    },
    [isConnected, sendCursorUpdate]
  );

  /**
   * Monaco 挂载完成 → 绑定 y-monaco + 设置 ref
   */
  const handleEditorMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = editor; // monacoRef 实际存的是 editor instance

      editor.focus();

      // 监听光标位置变化
      editor.onDidChangeCursorPosition(handleCursorPositionChanged);
      editor.onDidChangeCursorSelection(handleCursorPositionChanged);

      // 绑定 Yjs ↔ Monaco（核心！）
      bindMonaco?.(editor, monaco);
      
      // 如果是第一个用户进入房间，绑定后立即发送完整同步
      if (!hasSyncedInitial.current) {
        hasSyncedInitial.current = true;
        // 延迟一点等 y-monaco 将当前值写入 Yjs
        setTimeout(() => {
          sendFullSync?.();
        }, 500);
      }

      logger('Monaco 已挂载，y-monaco 绑定完成');
    },
    [bindMonaco, handleCursorPositionChanged, sendFullSync]
  );

  // 保存文件
  const handleSave = async () => {
    const message = window.prompt(
      '请输入提交信息：',
      isNewFile ? `创建 ${filePath}` : `更新 ${filePath}`
    );
    if (!message) return;

    try {
      // 从 Yjs 获取最新内容（比 localContent 更准确）
      let saveContent = localContent;
      try {
        if (ydoc) {
          saveContent = ydoc.getText('monaco').toString();
        }
      } catch(e) { /* fallback */ }

      await saveFile(repoId, filePath, saveContent, message);
      setIsModified(false);
      setIsNewFile(false);
      toast.success('保存成功！');
    } catch (error) {
      toast.error(error.response?.data?.error || '保存失败');
    }
  };

  // Ctrl+S 快捷键
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [localContent, content, isNewFile, filePath]);

  // Loading 状态
  if (initialLoading) {
    return <Loading fullScreen text="加载编辑器..." />;
  }

  const language = getLanguage(filePath);

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(`/repo/${repoId}`)}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="返回项目"
          >
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </button>

          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-mono text-gray-300">{currentRepo?.name || '仓库'}</span>
            <span className="text-gray-600">/</span>
            <span className="text-sm font-mono text-white">{filePath}</span>
            {isNewFile && (
              <span className="px-1.5 py-0.5 text-xs bg-green-600 text-white rounded">新建</span>
            )}
            {isModified && (
              <span className="w-2 h-2 bg-yellow-400 rounded-full" title="未保存" />
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* 在线协作者指示器 */}
          {isConnected ? (
            <div className="flex items-center space-x-1.5" title={`在线协作者: ${onlineUsers.length}`}>
              <Wifi className="w-3.5 h-3.5 text-green-400" />
              <Users className="w-3.5 h-3.5 text-green-400" />
              {onlineUsers.length > 0 && (
                <span className="text-xs text-green-400">{onlineUsers.length}</span>
              )}
            </div>
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-gray-500" title="离线模式" />
          )}

          <span className="text-xs text-gray-500 px-2 py-1 bg-gray-700 rounded">{language}</span>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              isModified || isNewFile
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-700 text-gray-400 cursor-default'
            }`}
          >
            {saving ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>保存中...</span></>
            ) : (
              <><Save className="w-3.5 h-3.5" /><span>保存</span><kbd className="text-xs opacity-60 ml-1">Ctrl+S</kbd></>
            )}
          </button>
        </div>
      </div>

      {/* 主区域：Monaco + 协作层 */}
      <div className="flex-1 relative">
        {/* Monaco 编辑器 */}
        <div className="h-full">
          <EditorComp
            height="100%"
            language={language}
            value={localContent}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Menlo, monospace",
              fontLigatures: true,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
              insertSpaces: true,
              formatOnPaste: true,
              formatOnType: true,
              automaticLayout: true,
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true, indentation: true },
              padding: { top: 16 },
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
            }}
            loading={<Loading text="初始化编辑器..." />}
          />
        </div>

        {/* 协作光标渲染（叠加层） */}
        {monacoRef.current && cursors.size > 0 && (
          <CollaborationCursors
            editor={monacoRef.current}
            cursors={cursors}
          />
        )}

        {/* 在线用户浮动列表 */}
        {onlineUsers.length > 0 && (
          <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-20">
            {onlineUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg"
                title={`${u.username || u.name || '?'} - 在线`}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white"
                  style={{ backgroundColor: u.color }}
                >
                  {(u.username || u.name || '?')[0]?.toUpperCase()}
                </div>
                <span className="text-xs text-gray-300 max-w-[80px] truncate">
                  {u.username || u.name || '?'}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function logger(msg) {
  console.log(`[Editor] ${msg}`);
}
