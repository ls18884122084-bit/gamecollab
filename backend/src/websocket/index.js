import logger from '../config/logger.js';

export function setupWebSocket(io) {
  io.on('connection', (socket) => {
    logger.info(`WebSocket 连接: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`WebSocket 断开: ${socket.id}`);
    });

    // 实时协作功能待实现
  });
}
