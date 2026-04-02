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
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  }
});

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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
    // 连接数据库
    await sequelize.authenticate();
    logger.info('数据库连接成功');
    
    // 同步数据库模型
    await sequelize.sync({ alter: true });
    logger.info('数据库模型同步完成');
    
    // 连接 Redis
    await redisClient.connect();
    logger.info('Redis 连接成功');
    
    // 启动 HTTP 服务器
    httpServer.listen(PORT, () => {
      logger.info(`服务器运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('启动失败:', error);
    process.exit(1);
  }
}

startServer();

export { io };
