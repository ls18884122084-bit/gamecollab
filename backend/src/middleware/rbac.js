import Collaborator from '../models/Collaborator.js';
import Repository from '../models/Repository.js';
import logger from '../config/logger.js';

/**
 * RBAC 权限中间件
 * 
 * 角色层级: owner > admin > write > read
 * 
 * 使用方式:
 *   requireRole('write')  // 允许 owner, admin, write
 *   requireRole('admin')  // 允许 owner, admin
 *   requireRole('owner')  // 只允许 owner
 */

const ROLE_HIERARCHY = {
  owner: 4,
  admin: 3,
  write: 2,
  read: 1
};

/**
 * 检查用户在仓库中的角色是否满足最低要求
 * @param {string} minRole - 最低要求的角色
 * @returns {Function} Express 中间件
 */
export const requireRole = (minRole) => {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      const repoId = req.params.repoId || req.body.repositoryId || req.query.repoId;

      if (!repoId) {
        return res.status(400).json({ error: '缺少仓库 ID' });
      }

      // 查找用户在该仓库的协作者记录
      const collaborator = await Collaborator.findOne({
        where: {
          userId,
          repositoryId: repoId,
          status: 'accepted'
        },
        include: [
          {
            model: Repository,
            as: 'repository',
            attributes: ['id', 'ownerId', 'isPrivate']
          }
        ]
      });

      if (!collaborator) {
        return res.status(403).json({ error: '你没有该仓库的访问权限' });
      }

      const userLevel = ROLE_HIERARCHY[collaborator.role];
      const requiredLevel = ROLE_HIERARCHY[minRole];

      if (!userLevel || !requiredLevel || userLevel < requiredLevel) {
        return res.status(403).json({ 
          error: `权限不足，需要 ${minRole} 及以上角色`,
          currentRole: collaborator.role,
          requiredRole: minRole
        });
      }

      // 将协作信息附加到请求对象
      req.collaborator = collaborator;

      next();
    } catch (error) {
      logger.error('RBAC 权限检查失败:', error);
      res.status(500).json({ error: '权限验证失败' });
    }
  };
};

/**
 * 检查用户是否是仓库的 owner 或有足够角色的协作者
 * 这是一个综合中间件，同时支持 owner 和协作者
 * 用于替代原来只判断 ownerId 的逻辑
 */
export const requireRepoAccess = (minRole = 'read') => {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      const repoId = req.params.repoId || req.params.id || req.body.repositoryId || req.query.repoId;

      if (!repoId) {
        return res.status(400).json({ error: '缺少仓库 ID' });
      }

      // 查找仓库（不限制 ownerId）
      const repo = await Repository.findByPk(repoId);

      if (!repo) {
        return res.status(404).json({ error: '仓库不存在' });
      }

      // Owner 自动拥有最高权限
      if (repo.ownerId === userId) {
        req.isOwner = true;
        req.repository = repo;
        return next();
      }

      // 私有仓库：非 owner 必须是已接受的协作者
      if (repo.isPrivate) {
        const collaborator = await Collaborator.findOne({
          where: {
            userId,
            repositoryId: repoId,
            status: 'accepted'
          }
        });

        if (!collaborator) {
          return res.status(403).json({ error: '你没有该仓库的访问权限' });
        }

        const userLevel = ROLE_HIERARCHY[collaborator.role];
        const requiredLevel = ROLE_HIERARCHY[minRole];

        if (userLevel < requiredLevel) {
          return res.status(403).json({ 
            error: `权限不足，需要 ${minRole} 及以上角色`
          });
        }

        req.isOwner = false;
        req.collaborator = collaborator;
        req.repository = repo;
        return next();
      }

      // 公开仓库：任何登录用户都有 read 权限
      const requiredLevel = ROLE_HIERARCHY[minRole];
      if (requiredLevel <= ROLE_HIERARCHY['read']) {
        req.isOwner = false;
        req.repository = repo;
        return next();
      }

      // 公开仓库但需要 write 以上权限，检查协作者身份
      const collaborator = await Collaborator.findOne({
        where: {
          userId,
          repositoryId: repoId,
          status: 'accepted'
        }
      });

      if (!collaborator) {
        return res.status(403).json({ error: '你需要成为协作者才能执行此操作' });
      }

      const userLevel = ROLE_HIERARCHY[collaborator.role];
      if (userLevel < requiredLevel) {
        return res.status(403).json({ 
          error: `权限不足，需要 ${minRole} 及以上角色`
        });
      }

      req.isOwner = false;
      req.collaborator = collaborator;
      req.repository = repo;
      next();
    } catch (error) {
      logger.error('仓库访问权限检查失败:', error);
      res.status(500).json({ error: '权限验证失败' });
    }
  };
};

export default { requireRole, requireRepoAccess };
