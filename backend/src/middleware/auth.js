import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    // 从 header 获取 token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供认证凭证' });
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀

    // 验证 token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your_jwt_secret'
    );

    // 检查用户是否存在
    const user = await User.findByPk(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: '认证失败' });
    }

    // 将用户 ID 添加到 request 对象
    req.userId = user.id;
    req.user = user;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token 无效' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token 已过期' });
    }
    return res.status(500).json({ error: '认证失败' });
  }
};

// 可选的认证中间件（不存在 token 也可以继续）
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your_jwt_secret'
      );

      const user = await User.findByPk(decoded.userId);
      if (user && user.isActive) {
        req.userId = user.id;
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // 忽略错误，继续执行
    next();
  }
};
