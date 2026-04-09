/**
 * 超核AI工作台 实时协作 Hook (v2 - 重构版)
 * 
 * 核心架构：
 * - Yjs Doc ↔ Monaco Editor: 通过 y-monaco 双向绑定（CRDT-aware）
 * - Yjs Doc ↔ Socket.IO: 通过 Y.encodeStateAsUpdate / Y.applyUpdate 增量同步
 * 
 * 数据流：
 *   用户输入 → Monaco → y-monaco 自动更新 YjsDoc → observe 变更 → emit content-update
 *   收到 update → Y.applyUpdate → y-monaco 自动更新 Monaco（无需手动 set value）
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import * as monaco from 'monaco-editor';

export function useCollaboration({ repoId, filePath, token, onContentChange }) {
  const socketRef = useRef(null);
  const ydocRef = useRef(null);
  const bindingRef = useRef(null);       // y-monaco binding 实例
  const monacoRef = useRef(null);         // Monaco editor instance (从外部传入)
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [cursors, setCursors] = useState(new Map());
  const [isConnected, setIsConnected] = useState(false);
  
  // 防止循环标记
  const isApplyingRemote = useRef(false);
  const isInitialized = useRef(false);

  // ==================== WebSocket URL 推断 ====================
  function getWebSocketURL() {
    if (import.meta.env.VITE_API_BASE_URL) {
      const apiBase = import.meta.env.VITE_API_BASE_URL;
      const url = new URL(apiBase);
      return `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`;
    }
    if (typeof window !== 'undefined' && window.API_BASE_URL) {
      const apiBase = window.API_BASE_URL;
      const url = new URL(apiBase);
      return `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`;
    }
    return window.location.origin;
  }

  // ==================== 绑定/解绑 Monaco 编辑器 ====================
  
  /**
   * 当 Monaco editor mount 后调用此方法绑定 Yjs
   * @param {monaco.editor.IStandaloneCodeEditor} editor - Monaco 实例
   * @param {*} monacoInstance - Monaco 模块对象
   */
  const bindMonaco = useCallback((editor, monacoInstance) => {
    if (!editor || !ydocRef.current || bindingRef.current) return;

    try {
      const ytext = ydocRef.current.getText('monaco');
      const model = editor.getModel();
      
      if (!model) {
        console.warn('[Collab] Monaco model not ready');
        return;
      }

      // 创建 y-monaco 双向绑定
      const binding = new MonacoBinding(
        ytext,
        model,
        new Set([editor]),
        monacoInstance
      );

      bindingRef.current = binding;
      
      // 绑定后，如果已有初始内容，写入 Yjs（仅一次）
      if (!isInitialized.current) {
        isInitialized.current = true;
        const currentContent = model.getValue();
        if (currentContent) {
          // 将编辑器当前内容同步到 Yjs（本地文件加载后的内容）
          ydocRef.current.transact(() => {
            ytext.delete(0, ytext.length);
            ytext.insert(0, currentContent);
          });
        }
      }

      logger('Monaco ↔ Yjs 绑定成功');

      // 监听 Yjs 变更 → 发送到服务端（增量）
      ytext.observe((event, transaction) => {
        if (transaction.local && !isApplyingRemote.current) {
          // 本地变更（用户输入通过 y-monaco 自动进入 Yjs）
          // 发送 CRDT 增量到服务端
          const update = Y.encodeStateAsUpdate(ydocRef.current);
          if (socketRef.current?.connected) {
            socketRef.current.emit('content-update', { update: Buffer.from(update).buffer });
          }
          
          // 回调外部通知内容变更（用于保存状态等）
          const content = ytext.toString();
          onContentChange?.(content);
        }
      });

    } catch (error) {
      console.error('[Collab] Monaco 绑定失败:', error);
    }
  }, [onContentChange]);

  /**
   * 解绑 Monaco（组件卸载时调用）
   */
  const unbindMonaco = useCallback(() => {
    if (bindingRef.current) {
      try {
        bindingRef.current.destroy();
      } catch (e) { /* ignore */ }
      bindingRef.current = null;
    }
  }, []);

  // 设置 Monaco 引用（Editor.jsx 调用）
  const setMonacoRef = useCallback((editor) => {
    monacoRef.current = editor;
    // 如果 Yjs 已经准备好且 editor 已挂载，立即绑定
    if (editor && ydocRef.current && !bindingRef.current) {
      bindMonaco(editor, monaco);
    }
  }, [bindMonaco]);

  // ==================== Socket.IO 连接与事件 ====================

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

    // ======== Socket 事件监听 ========
    
    socket.on('connect', () => {
      setIsConnected(true);
      logger('已连接到协作服务器');

      socket.emit('join', { repoId, filePath }, (response) => {
        if (response.success) {
          logger(`已加入房间 ${repoId}/${filePath}`);
          setOnlineUsers(response.onlineUsers || []);

          if (response.hasDocumentState) {
            // 房间已有文档 → 请求完整同步
            socket.emit('sync-request', {});
          }
          // else: 第一个用户，等 bindMonaco 后自动将编辑器内容同步到 Yjs
        } else {
          logger.warn(`加入房间失败: ${response.error}`);
        }
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      logger('与协作服务器断开连接');
    });

    socket.on('user-joined', ({ userId, username, color }) => {
      logger(`${username} 加入了协作`);
      setOnlineUsers(prev => [...prev.filter(u => u.id !== userId), { id: userId, username, color }]);
    });

    socket.on('user-left', ({ userId }) => {
      setOnlineUsers(prev => prev.filter(u => u.id !== userId));
      setCursors(prev => { const next = new Map(prev); next.delete(userId); return next; });
    });

    socket.on('users-list', ({ users }) => {
      setOnlineUsers(users || []);
    });

    // 远程 CRDT 更新 → 应用到 Yjs → 通过 y-monaco 自动更新 Monaco
    socket.on('content-update', ({ userId, update }) => {
      if (!update || !ydocRef.current) return;
      try {
        isApplyingRemote.current = true;
        Y.applyUpdate(ydocRef.current, new Uint8Array(update));
        
        // 回调外部（用于显示远程修改提示等）
        const content = ydocRef.current.getText('monaco').toString();
        onContentChange?.(content);
        
        setTimeout(() => { isApplyingRemote.current = false; }, 50);
      } catch (error) {
        console.error('[Collab] 应用远程 CRDT 更新失败:', error);
        isApplyingRemote.current = false;
      }
    });

    // 同步响应（新加入者获取完整文档）
    socket.on('sync-response', ({ type, update }) => {
      if (type === 'update' && update && ydocRef.current) {
        try {
          isApplyingRemote.current = true;
          Y.applyUpdate(ydocRef.current, new Uint8Array(update));
          
          const content = ydocRef.current.getText('monaco').toString();
          onContentChange?.(content);
          
          setTimeout(() => { isApplyingRemote.current = false; }, 50);
        } catch (error) {
          console.error('[Collab] 同步文档失败:', error);
          isApplyingRemote.current = false;
        }
      }
    });

    // 光标/选区更新
    socket.on('cursor-update', ({ userId, position, selection }) => {
      // 使用最新的 onlineUsers 快照
      setCursors(prev => {
        // 找到用户名和颜色
        let username = '?', color = '#888';
        for (const u of prev.values()) {
          if (u.id === userId) { username = u.username || u.name || '?'; color = u.color || '#888'; break; }
        }
        // 也从 onlineUsers state 中找（可能更准确）
        const next = new Map(prev);
        next.set(userId, { position, selection, username, color, id: userId });
        return next;
      });
    });

    // ======== 清理 ========
    return () => {
      socket.emit('leave');
      unbindMonaco();
      ydoc.destroy();
      socket.disconnect();
      socketRef.current = null;
      ydocRef.current = null;
      bindingRef.current = null;
      setOnlineUsers([]);
      setCursors(new Map());
      setIsConnected(false);
      isInitialized.current = false;
    };
  }, [repoId, filePath, token, unbindMonaco, onContentChange]);

  // ==================== 发送函数 ====================

  const sendCursorUpdate = useCallback((position, selection) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('cursor-update', { position, selection });
    }
  }, []);

  /**
   * 手动触发初始全量同步（第一个进入房间的用户，Monaco 绑定后调用）
   */
  const sendFullSync = useCallback(() => {
    if (socketRef.current?.connected && ydocRef.current) {
      try {
        const update = Y.encodeStateAsUpdate(ydocRef.current);
        socketRef.current.emit('sync-full', { update: Buffer.from(update).buffer });
        logger('已发送完整文档同步');
      } catch(e) {
        console.warn('[Collab] sendFullSync error:', e);
      }
    }
  }, []);

  return {
    socket: socketRef.current,
    ydoc: ydocRef.current,
    onlineUsers,
    cursors,
    isConnected,
    bindMonaco,
    unbindMonaco,
    setMonacoRef,
    sendCursorUpdate,
    sendFullSync,
  };
}

function logger(msg) {
  console.log(`[Collab] ${msg}`);
}

export default useCollaboration;
