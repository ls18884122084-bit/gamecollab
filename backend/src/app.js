import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import sequelize from './config/database.js';
import redisClient from './config/redis.js';
import logger from './config/logger.js';

// 导入路由
import authRoutes from './routes/auth.routes.js';
import repoRoutes from './routes/repo.routes.js';
import fileRoutes from './routes/file.routes.js';
import collabRoutes from './routes/collab.routes.js';

// 导入 WebSocket 处理
import { setupWebSocket } from './websocket/index.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  }
});

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 日志中间件
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/repos', repoRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/collab', collabRoutes);

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 错误处理
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// 设置 WebSocket
setupWebSocket(io);

// 启动服务器
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // 1. 连接数据库（必需）
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 同步数据库模型（生产环境建议用 migrate）
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      logger.info('数据库模型同步完成');
    } else {
      await sequelize.sync();
      logger.info('数据库模型同步完成（生产模式）');
    }
    
    // 2. 连接 Redis（非阻塞：失败仅警告，不阻止启动）
    try {
      await redisClient.connect();
      logger.info('Redis 连接成功');
    } catch (redisErr) {
      logger.warn(`Redis 连接失败，将以无缓存模式运行: ${redisErr.message}`);
      // 不抛出错误，继续启动
    }

    // 3. 检查 GitHub Token 配置
    if (!process.env.GITHUB_TOKEN) {
      logger.warn('GITHUB_TOKEN 未配置，Git 操作将无法使用！');
    }
    if (!process.env.GITHUB_USERNAME) {
      logger.warn('GITHUB_USERNAME 未配置，Git 操作将无法使用！');
    }
    
    // 4. 启动 HTTP 服务器
    httpServer.listen(PORT, () => {
      logger.info(`超核AI工作台 后端服务运行在端口 ${PORT}`);
      logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('启动失败:', error);
    process.exit(1);
  }
}

startServer();

export { io };
