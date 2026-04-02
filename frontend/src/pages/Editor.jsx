import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useFileStore } from '../stores/fileStore';
import { useRepoStore } from '../stores/repoStore';
import Loading from '../components/Loading';
import {
  ArrowLeft,
  Save,
  FileText,
  Loader2,
  Check,
  Undo2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// 根据文件扩展名获取 Monaco 语言
function getLanguage(filePath) {
  if (!filePath) return 'plaintext';
  const ext = filePath.split('.').pop().toLowerCase();
  const languageMap = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    json: 'json',
    md: 'markdown',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    xml: 'xml',
    yml: 'yaml',
    yaml: 'yaml',
    sh: 'shell',
    bash: 'shell',
    sql: 'sql',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    php: 'php',
    lua: 'lua',
    swift: 'swift',
    kt: 'kotlin',
    dart: 'dart',
    toml: 'ini',
    ini: 'ini',
    env: 'ini',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
  };
  return languageMap[ext] || 'plaintext';
}

export default function EditorPage() {
  const { repoId, '*': rawFilePath } = useParams();
  const filePath = rawFilePath ? decodeURIComponent(rawFilePath) : '';
  const navigate = useNavigate();
  const { currentRepo, fetchRepo } = useRepoStore();
  const { content, loadFile, saveFile, saving } = useFileStore();

  const [localContent, setLocalContent] = useState('');
  const [isModified, setIsModified] = useState(false);
  const [isNewFile, setIsNewFile] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const editorRef = useRef(null);

  // 加载文件内容
  useEffect(() => {
    const load = async () => {
      setInitialLoading(true);
      try {
        if (!currentRepo) {
          await fetchRepo(repoId);
        }
        const fileContent = await loadFile(repoId, filePath);
        setLocalContent(fileContent || '');
        setIsNewFile(false);
      } catch (error) {
        // 文件不存在 = 新建文件
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
    if (repoId && filePath) {
      load();
    }
  }, [repoId, filePath]);

  // 编辑器内容变化
  const handleEditorChange = useCallback(
    (value) => {
      setLocalContent(value || '');
      setIsModified(value !== content);
    },
    [content]
  );

  // 保存文件
  const handleSave = async () => {
    const message = window.prompt(
      '请输入提交信息：',
      isNewFile ? `创建 ${filePath}` : `更新 ${filePath}`
    );
    if (!message) return;

    try {
      await saveFile(repoId, filePath, localContent, message);
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

  // 编辑器加载完成
  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
  };

  if (initialLoading) {
    return <Loading fullScreen text="加载编辑器..." />;
  }

  const language = getLanguage(filePath);

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          {/* 返回按钮 */}
          <button
            onClick={() => navigate(`/repo/${repoId}`)}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="返回仓库"
          >
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </button>

          {/* 文件信息 */}
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-mono text-gray-300">
              {currentRepo?.name || '仓库'}
            </span>
            <span className="text-gray-600">/</span>
            <span className="text-sm font-mono text-white">{filePath}</span>
            {isNewFile && (
              <span className="px-1.5 py-0.5 text-xs bg-green-600 text-white rounded">
                新建
              </span>
            )}
            {isModified && (
              <span className="w-2 h-2 bg-yellow-400 rounded-full" title="未保存" />
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* 语言标识 */}
          <span className="text-xs text-gray-500 px-2 py-1 bg-gray-700 rounded">
            {language}
          </span>

          {/* 保存按钮 */}
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
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>保存中...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>保存</span>
                <kbd className="text-xs opacity-60 ml-1">Ctrl+S</kbd>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Monaco 编辑器 */}
      <div className="flex-1">
        <Editor
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
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            padding: { top: 16 },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
          }}
          loading={<Loading text="初始化编辑器..." />}
        />
      </div>
    </div>
  );
}
