import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
} from 'lucide-react';

// 将扁平文件列表转为树结构
function buildTree(files) {
  const root = { name: '', children: {}, type: 'dir' };

  files.forEach((filePath) => {
    const parts = filePath.split('/');
    let current = root;

    parts.forEach((part, i) => {
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          children: {},
          type: i === parts.length - 1 ? 'file' : 'dir',
        };
      }
      current = current.children[part];
    });
  });

  return root;
}

function TreeNode({ node, depth = 0, onFileClick, selectedFile }) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const isDir = node.type === 'dir';
  const children = Object.values(node.children);

  // 排序：目录在前，文件在后，各自按名称排序
  const sorted = useMemo(
    () =>
      children.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [children]
  );

  const isSelected = !isDir && node.path === selectedFile;

  const handleClick = () => {
    if (isDir) {
      setIsOpen(!isOpen);
    } else {
      onFileClick?.(node.path);
    }
  };

  // 获取文件图标颜色
  const getFileColor = (name) => {
    const ext = name.split('.').pop();
    const colors = {
      js: 'text-yellow-500',
      jsx: 'text-blue-400',
      ts: 'text-blue-600',
      tsx: 'text-blue-500',
      css: 'text-purple-500',
      html: 'text-orange-500',
      json: 'text-green-500',
      md: 'text-gray-500',
    };
    return colors[ext] || 'text-gray-400';
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={`flex items-center px-2 py-1 cursor-pointer hover:bg-gray-700 rounded text-sm transition-colors ${
          isSelected ? 'bg-blue-600/30 text-blue-300' : 'text-gray-300'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* 展开/折叠箭头 */}
        {isDir ? (
          isOpen ? (
            <ChevronDown className="w-4 h-4 mr-1 text-gray-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 mr-1 text-gray-500 flex-shrink-0" />
          )
        ) : (
          <span className="w-4 mr-1 flex-shrink-0" />
        )}

        {/* 图标 */}
        {isDir ? (
          isOpen ? (
            <FolderOpen className="w-4 h-4 mr-2 text-yellow-400 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 mr-2 text-yellow-400 flex-shrink-0" />
          )
        ) : (
          <File className={`w-4 h-4 mr-2 flex-shrink-0 ${getFileColor(node.name)}`} />
        )}

        {/* 文件名 */}
        <span className="truncate">{node.name}</span>
      </div>

      {/* 子节点 */}
      {isDir && isOpen && (
        <div>
          {sorted.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileClick={onFileClick}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ files = [], onFileClick, selectedFile }) {
  const tree = useMemo(() => buildTree(files), [files]);
  const children = Object.values(tree.children);

  if (children.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm text-center">
        仓库为空，开始添加文件吧
      </div>
    );
  }

  return (
    <div className="py-2 select-none">
      {children
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
        .map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            onFileClick={onFileClick}
            selectedFile={selectedFile}
          />
        ))}
    </div>
  );
}
