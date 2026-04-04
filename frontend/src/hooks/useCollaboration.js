import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import * as Y from 'yjs';

/**
 * 实时协作 Hook
 * 
 * 使用 Yjs CRDT + Socket.IO 实现多人实时编辑
 * 
 * @param {Object} options
 * @param {string} options.repoId - 仓库 ID
 * @param {string} options.filePath - 文件路径
 * @param {string} options.token - JWT Token
 * @param {Function} options.onContentChange - 外部内容变更回调 (newContent: string) => void
 * 
 * @returns {Object}
 *   socket: Socket.IO 实例（用于手动发送消息）
 *   onlineUsers: 在线用户列表
 *   cursors: 协作者光标位置 Map<userId, {position, selection, username, color}>
 *   isConnected: 连接状态
 */
export function useCollaboration({ repoId, filePath, token, onContentChange }) {
  const socketRef = useRef(null);
  const ydocRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [cursors, setCursors] = useState(new Map());
  const [isConnected, setIsConnected] = useState(false);

  // 获取 WebSocket URL
  function getWebSocketURL() {
    // 从 API baseURL 推断 WebSocket 地址
    if (import.meta.env.VITE_API_BASE_URL) {
      const apiBase = import.meta.env.VITE_API_BASE_URL;
      // https://xxx/api → wss://xxx
      // http://xxx/api → ws://xxx
      const url = new URL(apiBase);
      return `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`;
    }
    if (typeof window !== 'undefined' && window.API_BASE_URL) {
      const apiBase = window.API_BASE_URL;
      const url = new URL(apiBase);
      return `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`;
    }
    // 开发环境默认
    return window.location.origin;
  }

  // 初始化连接
  useEffect(() => {
    if (!repoId || !filePath || !token) return;

    const wsUrl = getWebSocketURL();

    const socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    // 创建 Yjs 文档
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const ytext = ydoc.getText('monaco');

    // 监听 Yjs 文档变更 → 回调给外部
    let isRemoteUpdate = false; // 标记是否为远端更新，避免循环
    ytext.observe((event, transaction) => {
      if (!transaction.local) {
        // 远端更新：通知外部组件更新编辑器
        isRemoteUpdate = true;
        const content = ytext.toString();
        onContentChange?.(content);
        setTimeout(() => { isRemoteUpdate = false; }, 50);
      }
    });

    // ======== Socket.IO 事件监听 =======

    socket.on('connect', () => {
      setIsConnected(true);
      logger('已连接到协作服务器');
      
      // 加入房间
      socket.emit('join', { repoId, filePath }, (response) => {
        if (response.success) {
          logger(`已加入房间 ${repoId}/${filePath}`);
          setOnlineUsers(response.onlineUsers || []);
          
          // 如果房间已有文档状态，请求同步
          if (response.hasDocumentState) {
            socket.emit('sync-request', {});
          }
        } else {
          logger.warn(`加入房间失败: ${response.error}`);
        }
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      logger('与协作服务器断开连接');
    });

    // 用户加入
    socket.on('user-joined', ({ userId, username, color }) => {
      logger(`${username} 加入了协作`);
      setOnlineUsers(prev => [...prev.filter(u => u.id !== userId), { id: userId, username, color }]);
    });

    // 用户离开
    socket.on('user-left', ({ userId }) => {
      setOnlineUsers(prev => prev.filter(u => u.id !== userId));
      setCursors(prev => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    });

    // 用户列表更新
    socket.on('users-list', ({ users }) => {
      setOnlineUsers(users || []);
    });

    // 内容更新（CRDT 增量）
    socket.on('content-update', async ({ userId, update }) => {
      if (!update || !ydocRef.current) return;

      try {
        // 应用 Yjs Update
        Y.applyUpdate(ydocRef.current, new Uint8Array(update));
      } catch (error) {
        console.error('应用远程 CRDT 更新失败:', error);
      }
    });

    // 同步响应（完整文档）
    socket.on('sync-response', async ({ type, update }) => {
      if (type === 'update' && update) {
        try {
          Y.applyUpdate(ydocRef.current, new Uint8Array(update));
        } catch (error) {
          console.error('同步文档失败:', error);
        }
      }
    });

    // 光标/选区更新
    socket.on('cursor-update', ({ userId, position, selection }) => {
      const user = onlineUsers.find(u => u.id === userId);
      if (!user) return;
      
      setCursors(prev => {
        const next = new Map(prev);
        next.set(userId, {
          position,
          selection,
          username: user.username,
          color: user.color,
        });
        return next;
      });
    });

    // 清理
    return () => {
      socket.emit('leave');
      ydoc.destroy();
      socket.disconnect();
      socketRef.current = null;
      ydocRef.current = null;
      setOnlineUsers([]);
      setCursors(new Map());
      setIsConnected(false);
    };
  }, [repoId, filePath, token]);

  // 发送本地内容变更（从编辑器到服务端）
  const sendLocalUpdate = useCallback((updateBuffer) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('content-update', {
        update: Buffer.from(updateBuffer),
      });
    }
  }, []);

  // 发送本地光标位置
  const sendCursorUpdate = useCallback((position, selection) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('cursor-update', { position, selection });
    }
  }, []);

  // 发送完整同步（第一个进入房间的用户）
  const sendFullSync = useCallback((updateBuffer) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('sync-full', {
        update: Buffer.from(updateBuffer),
      });
    }
  }, []);

  return {
    socket: socketRef.current,
    onlineUsers,
    cursors,
    isConnected,
    sendLocalUpdate,
    sendCursorUpdate,
    sendFullSync,
  };
}

// 简单的日志函数
function logger(msg) {
  console.log(`[Collab] ${msg}`);
}

export default useCollaboration;
