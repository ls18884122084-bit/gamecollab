import { createClient } from 'redis';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

redisClient.on('error', (err) => {
  logger.warn(`Redis 连接错误（非致命）: ${err.message}`);
});

redisClient.on('connect', () => {
  logger.info('Redis 连接成功');
});

export default redisClient;
