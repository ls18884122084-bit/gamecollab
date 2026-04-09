import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Collaborator from '../models/Collaborator.js';
import Repository from '../models/Repository.js';
import logger from '../config/logger.js';

/**
 * 超核AI工作台 WebSocket 实时协作引擎
 * 
 * 架构设计：
 * - Room: 按 repoId+filePath 划分房间（如 repo_abc/src/main.js）
 * - CRDT: 使用 Yjs 的 State Vector / Update 协议做增量同步
 *   前端发送二进制 [update] 或全量同步请求
 *   服务端广播给同房间的其他用户
 * - Presence: 在线用户列表 + 光标/选区位置
 * 
 * 事件协议：
 * 
 * Client → Server:
 *   join: { token, repoId, filePath }          — 加入编辑房间
 *   leave: {}                                    — 离开房间  
 *   content-update: { update: Uint8Array }      — CRDT 增量更新 (Yjs binary)
 *   cursor-update: { position, selection }       — 光标/选区位置
 *   sync-request: {}                             — 请求完整文档状态（新加入者）
 *   sync-response: { stateVector?, update }      — 全量/增量响应
 * 
 * Server → Client:
 *   user-joined: { userId, username, color }     — 用户加入通知
 *   user-left: { userId }                        — 用户离开通知
 *   content-update: { userId, update }           — 广播内容变更（CRDT）
 *   cursor-update: { userId, position, selection } — 广播光标移动
 *   users-list: { users: [{id,username,color,cursor}] }  — 当前在线用户
 */

// 用户颜色映射（与前端一致）
const USER_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
];

function getUserColor(userId) {
  let hash = 0;
  for (let i = 0; i < (userId?.length || 0); i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

// ==================== Room 管理 ====================

/**
 * 房间结构:
 * rooms = {
 *   "repoId|filePath": {
 *     users: Map<socketId, { socket, userId, username, color, cursor, selection, joinedAt }>
 *     documentState: Buffer | null,    // 最新文档快照（用于新用户同步）
 *     lastActivity: timestamp,
 *   }
 * }
 */
const rooms = new Map();

function getRoomKey(repoId, filePath) {
  return `${repoId}|${filePath}`;
}

function getOrCreateRoom(repoId, filePath) {
  const key = getRoomKey(repoId, filePath);
  if (!rooms.has(key)) {
    rooms.set(key, {
      users: new Map(),
      documentState: null,
      lastActivity: Date.now(),
    });
  }
  return rooms.get(key);
}

function cleanupEmptyRoom(roomKey) {
  const room = rooms.get(roomKey);
  if (room && room.users.size === 0) {
    // 保留 30 分钟再清理，防止快速重连丢失状态
    if (Date.now() - room.lastActivity > 30 * 60 * 1000) {
      rooms.delete(roomKey);
      logger.debug(`清理空房间: ${roomKey}`);
    }
  }
}

// ==================== 认证中间件 ====================

async function authenticateSocket(token) {
  if (!token) throw new Error('缺少认证 Token');
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
  const user = await User.findByPk(decoded.userId);
  
  if (!user || !user.isActive) throw new Error('用户不存在或已禁用');
  
  return user;
}

async function checkCollaborationAccess(userId, repoId) {
  // 先检查是否是 owner（owner 不在 collaborator 表中）
  const repo = await Repository.findByPk(repoId);
  if (repo && repo.ownerId === userId) {
    return 'owner'; // owner 自动拥有完全权限
  }

  // 再检查是否是已接受的协作者
  const collab = await Collaborator.findOne({
    where: {
      userId,
      repositoryId: repoId,
      status: 'accepted',
    },
  });

  if (!collab) {
    throw new Error('你没有该仓库的协作权限');
  }

  return collab.role;
}

// ==================== 主入口 ====================

export function setupWebSocket(io) {

  // Socket.IO 认证中间件（JWT）
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      const user = await authenticateSocket(token);
      socket.user = user;
      next();
    } catch (error) {
      logger.warn(`WebSocket 认证失败: ${error.message}`);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    logger.info(`WebSocket 连接: ${user.username} (${socket.id})`);

    // 当前用户所在的房间信息
    let currentRoom = null;
    let currentRoomKey = null;

    // ========== 加入房间 ==========
    socket.on('join', async ({ repoId, filePath }, callback) => {
      try {
        if (!repoId || !filePath) {
          return callback?.({ success: false, error: '缺少参数' });
        }

        // 权限检查
        const role = await checkCollaborationAccess(user.id, repoId);

        // 如果已在其他房间，先离开
        if (currentRoom) {
          leaveCurrentRoom(socket, currentRoomKey, currentRoom, user.id);
        }

        // 加入新房间
        const roomKey = getRoomKey(repoId, filePath);
        const room = getOrCreateRoom(repoId, filePath);

        const color = getUserColor(user.id);
        const userData = {
          socket,
          userId: user.id,
          username: user.username,
          color,
          cursor: null,
          selection: null,
          joinedAt: Date.now(),
          role,
        };

        room.users.set(socket.id, userData);
        room.lastActivity = Date.now();
        currentRoom = room;
        currentRoomKey = roomKey;

        // 发送当前在线用户列表（不含自己）
        const onlineUsers = Array.from(room.users.entries())
          .filter(([sid]) => sid !== socket.id)
          .map(([, u]) => ({
            id: u.userId,
            username: u.username,
            color: u.color,
            cursor: u.cursor,
            selection: u.selection,
            role: u.role,
          }));

        // 通知其他人有新用户加入
        socket.to(roomKey).emit('user-joined', {
          userId: user.id,
          username: user.username,
          color,
          role,
        });

        logger.info(`${user.username} 加入房间 ${roomKey}`);

        callback?.({
          success: true,
          color,
          onlineUsers,
          hasDocumentState: !!room.documentState,
        });

        // 发送完整的在线用户列表给刚加入的人
        socket.emit('users-list', {
          users: [
            ...onlineUsers,
            { id: user.id, username: user.username, color, role },
          ],
        });

      } catch (error) {
        logger.error(`加入房间失败: ${error.message}`);
        callback?.({ success: false, error: error.message });
      }
    });

    // ========== 离开房间 ==========
    function leaveCurrentRoom(sock, rKey, rRoom, uid) {
      if (!rRoom) return;
      
      rRoom.users.delete(sock.id);

      // 通知其他人
      sock.to(rKey).emit('user-left', { userId: uid });

      logger.info(`${sock.user?.username || uid} 离开房间 ${rKey}`);

      cleanupEmptyRoom(rKey);
    }

    socket.on('leave', () => {
      leaveCurrentRoom(socket, currentRoomKey, currentRoom, user.id);
      currentRoom = null;
      currentRoomKey = null;
    });

    // ========== 内容同步（CRDT）==========
    socket.on('content-update', ({ update }) => {
      logger.info(`[WS-DEBUG] content-update received: roomKey=${currentRoomKey}, updateType=${typeof update}, isArray=${Array.isArray(update)}, isBuf=${Buffer.isBuffer(update)}`);
      if (!currentRoom) { logger.warn('[WS-DEBUG] content-update: no currentRoom!'); return; }
      if (!update) { logger.warn('[WS-DEBUG] content-update: no update data!'); return; }

      // 兼容多种二进制格式: Buffer, ArrayBuffer, Uint8Array, Array
      let updateBuffer = update;
      if (!Buffer.isBuffer(update)) {
        if (update instanceof Uint8Array || update instanceof ArrayBuffer || Array.isArray(update)) {
          updateBuffer = Buffer.from(update);
        } else {
          logger.warn(`content-update 收到非二进制数据: ${typeof update}`);
          return;
        }
      }

      // 更新文档状态快照
      currentRoom.documentState = updateBuffer;
      currentRoom.lastActivity = Date.now();

      // 广播给房间内除发送者以外的所有人
      socket.to(currentRoomKey).emit('content-update', {
        userId: user.id,
        update: updateBuffer,
      });
    });

    // 同步请求处理（Yjs protocol）
    socket.on('sync-request', ({ stateVector }) => {
      if (!currentRoom) return;

      // 如果有文档状态，返回差异更新；否则返回 null（客户端需要发完整状态）
      if (currentRoom.documentState) {
        socket.emit('sync-response', {
          type: 'update',
          update: currentRoom.documentState,
          isFullSync: true, // 标记为完整同步
        });
      } else {
        socket.emit('sync-response', {
          type: 'empty',
          update: null,
        });
      }
    });

    // 接收客户端的完整同步数据（第一个加入的用户）
    socket.on('sync-full', ({ update }) => {
      if (!currentRoom || !update) return;

      let updateBuffer = update;
      if (!Buffer.isBuffer(update)) {
        if (update instanceof Uint8Array || ArrayBuffer.isView(update)) {
          updateBuffer = Buffer.from(update);
        } else {
          return;
        }
      }

      currentRoom.documentState = updateBuffer;
      currentRoom.lastActivity = Date.now();
    });

    // ========== 光标/选区同步 ==========
    socket.on('cursor-update', ({ position, selection }) => {
      logger.info(`[WS-DEBUG] cursor-update received: roomKey=${currentRoomKey}, pos=${JSON.stringify(position)}`);
      if (!currentRoom) { logger.warn('[WS-DEBUG] cursor-update: no currentRoom!'); return; }

      // 更新本地记录
      const userData = currentRoom.users.get(socket.id);
      if (userData) {
        userData.cursor = position;
        userData.selection = selection;
        currentRoom.lastActivity = Date.now();
      }

      // 广播给其他人
      socket.to(currentRoomKey).emit('cursor-update', {
        userId: user.id,
        position,
        selection,
      });
    });

    // ========== 断开连接 ==========
    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket 断开: ${user.username} (${socket.id}) - ${reason}`);
      leaveCurrentRoom(socket, currentRoomKey, currentRoom, user.id);
      currentRoom = null;
      currentRoomKey = null;
    });

    // 错误处理
    socket.on('error', (err) => {
      logger.error(`WebSocket 错误 (${user.username}): ${err.message}`);
    });
  });

  // 定期清理空房间（每 10 分钟）
  setInterval(() => {
    for (const [key, room] of rooms.entries()) {
      if (room.users.size === 0 && Date.now() - room.lastActivity > 30 * 60 * 1000) {
        rooms.delete(key);
      }
    }
  }, 10 * 60 * 1000);

  logger.info('超核AI工作台 WebSocket 协作引擎已启动');
}
